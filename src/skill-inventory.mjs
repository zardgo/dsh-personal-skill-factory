import path from 'node:path';
import { promises as fs } from 'node:fs';
import { error, hash } from './architecture-store.mjs';

const skillName=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export function tokenize(text) {
  const value=String(text||'').normalize('NFKC').toLowerCase();
  const words=value.match(/[a-z0-9]+/g)||[];
  for(const run of value.match(/\p{Script=Han}+/gu)||[]){
    for(let i=0;i<run.length-1;i++)words.push(run.slice(i,i+2));
  }
  return new Set(words);
}
export function overlap(left,right) {
  const a=tokenize(left),b=tokenize(right);
  const count=[...a].filter(w=>b.has(w)).length;
  return count/Math.max(1,Math.min(a.size,b.size));
}

export async function skillInventory(db, catalog, cwd) {
  if(typeof catalog!=='function')throw error('DSH Skill 目录未注入，暂不能完成重复检查',503);
  const snapshot=await catalog(cwd);
  if(!Array.isArray(snapshot?.skills)||snapshot.complete!==true)throw error('DSH Skill 目录读取不完整，请重试',503);
  const managed=new Map(db.publications.filter(p=>p.active).map(p=>[p.slug,p]));
  const assets=snapshot.skills.filter(s=>skillName.test(s.name||'')&&s.invocation?.modelInvocable!==false)
    .map(s=>{
      const original=managed.get(s.name);
      const base=s.resourceBase?.kind==='directory'?s.resourceBase.path:null;
      return {id:s.name,description:String(s.description||'').slice(0,1500),provider:String(s.provider||''),managed:Boolean(original&&base&&path.resolve(base)===path.resolve(original.target)),base};
    });
  // The host registry can omit filesystem providers mounted only in agents.
  // Reconcile factory-owned releases from the authenticated local ledger.
  const visibleNames=new Set(snapshot.skills.map(skill=>skill.name));
  for(const release of managed.values()){
    if(!skillName.test(release.slug)||visibleNames.has(release.slug))continue;
    const candidate={id:release.slug,managed:true,base:release.target,provider:'factory-release'};
    try{
      const baseline=await managedBaseline(candidate,db);
      const header=baseline.body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const fields=header?.[1];
      if(!fields||fields.match(/^name: (.+)$/m)?.[1].trim()!==release.slug)continue;
      const description=JSON.parse(fields.match(/^description: (.+)$/m)?.[1]||'null');
      if(typeof description==='string')assets.push({...candidate,description:description.slice(0,1500)});
    }catch(error){
      if(!['ENOENT','ENOTDIR'].includes(error.code)&&error.status!==409)throw error;
    }
  }
  return assets.sort((a,b)=>a.id.localeCompare(b.id));
}

export async function managedBaseline(asset, db) {
  const release=db.publications.find(x=>x.active&&x.slug===asset.id&&x.target===asset.base);
  if(!asset.managed||!release)throw error('增强目标不属于本插件的已发布资产',409);
  const file=path.join(release.target,'SKILL.md');
  const [dir,stat]=await Promise.all([fs.lstat(release.target),fs.lstat(file)]);
  if(!dir.isDirectory()||dir.isSymbolicLink()||!stat.isFile()||stat.isSymbolicLink()||stat.size>60000)throw error('增强基线文件无效',409);
  const body=await fs.readFile(file,'utf8');
  if(hash(body)!==release.hash)throw error('增强基线已被外部修改',409);
  return {releaseId:release.id,hash:release.hash,body,slug:release.slug};
}
