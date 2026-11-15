import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { error,hash } from './architecture-store.mjs';
import { analyzeFailure,businessPrompt,validateCase } from './evals.mjs';

const exec=promisify(execFile);
const validSlug=/^[a-z][a-z0-9-]{2,55}$/;
export const loadedBody = body => body.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, '').trim();

export async function stageTriggerWorkspace(root, slug, version, skillBody) {
  if(!validSlug.test(slug)||hash(skillBody)!==version.bodyHash)throw error('待测 Skill 与固定版本不一致');
  await fs.mkdir(root,{recursive:true,mode:0o700});
  const cwd=await fs.mkdtemp(path.join(await fs.realpath(root),'trigger-'));
  const dir=path.join(cwd,'.dsh','skills',slug);
  await fs.mkdir(dir,{recursive:true,mode:0o700});
  await fs.writeFile(path.join(dir,'SKILL.md'),skillBody,{flag:'wx',mode:0o600});
  return {id:randomUUID(),cwd,slug,versionId:version.id,bodyHash:version.bodyHash,loadedHash:hash(loadedBody(skillBody)),createdAt:Date.now()};
}

export async function readTriggerSession(sessionsRoot, sessionId) {
  if(!/^session-[a-f0-9-]{36}$/.test(sessionId||''))throw error('无效的 DSH 会话 ID');
  for(const group of await fs.readdir(sessionsRoot,{withFileTypes:true})){
    if(!group.isDirectory())continue;
    const dir=path.join(sessionsRoot,group.name,sessionId);
    if(!(await fs.lstat(dir).catch(()=>null))?.isDirectory())continue;
    const file=path.join(dir,'session.v4.jsonl.zstd');
    const st=await fs.lstat(file);
    if(!st.isFile()||st.size>10_000_000)throw error('会话文件格式或大小无效');
    const {stdout}=await exec('zstd',['-dc',file],{timeout:10000,maxBuffer:25_000_000});
    return {file,events:stdout.trim().split('\n').map(line=>JSON.parse(line))};
  }
  throw error('找不到实际 DSH 会话',404);
}

export function assessTrigger({test,workspace,session,config}) {
  const validation=validateCase(test);
  if(validation.status!=='VALID')return {mode:'trigger',caseId:test.id,...validation};
  const rows=session.events;
  const header=rows[0];
  const turns=rows.filter(x=>x.type==='turn/start');
  const ends=rows.filter(x=>x.type==='turn/end');
  const user=rows.filter(x=>x.type==='agent/inbox/spliced').flatMap(x=>x.data?.inserted||[]).filter(x=>x.role==='user');
  const actual=user.length===1&&user[0].content?.every(c=>c.type==='text')?user[0].content.map(c=>c.text).join(''):null;
  if(header?.type!=='session'||header.cwd!==workspace.cwd||header.isSeeded!==false||header.createdAt<workspace.createdAt||
    turns.length!==1||ends.length!==1||actual!==businessPrompt(test)){
    throw error('需要隔离工作区中的全新单轮会话，且请求与冻结测试完全一致',409);
  }
  const requests=rows.filter(x=>x.type==='request/header').map(x=>x.data.header);
  if(!requests.length||requests.some(r=>r.config?.model!==config.model||r.config?.provider!==config.provider))throw error('会话模型与验收配置不一致',409);
  const traces=rows.filter(x=>x.type==='tool/call'&&x.data?.name==='skill');
  const target=traces.filter(x=>{try{return JSON.parse(x.data.arguments).name===workspace.slug}catch{return false}});
  const results=rows.filter(x=>x.type==='tool/result'&&target.some(t=>t.data.callId===x.data?.message?.toolCallId));
  const loaded=results.some(x=>x.data.message.content.some(c=>{
    const body=c.text?.match(/<skill_instructions>\n([\s\S]*?)\n<\/skill_instructions>/)?.[1];
    return c.text?.includes('<skill_content name="'+workspace.slug+'">')&&body&&hash(body.trim())===(workspace.loadedHash||workspace.bodyHash);
  }));
  const catalogEntry='- `'+workspace.slug+'`:';
  const discovered=rows.some(x=>x.type==='user/message'&&JSON.stringify(x.data).includes(catalogEntry));
  const modelFailure=ends[0].data?.reason?.kind!=='completed';
  const correctlyHandled=test.triggerExpected?loaded:target.length===0;
  const status=modelFailure||!discovered?'NEEDS_REVIEW':correctlyHandled?'PASS':'FAIL';
  const output=rows.filter(x=>x.type==='assistant/message').map(x=>x.data);
  const timeValue=value=>typeof value==='number'?value:Date.parse(value);
  const durationMs=timeValue(ends[0].time)-timeValue(turns[0].time);
  const usage=output.map(x=>x.usage).filter(Boolean);
  const row={mode:'trigger',caseId:test.id,versionId:workspace.versionId,status,expected:test.triggerExpected,discovered,loaded,modelFailure,
    sessionId:header.id,logfile:session.file,traceHash:hash(rows),task:actual,requests,toolCalls:traces,toolResults:results,output,durationMs,usage};
  return {...row,failures:analyzeFailure(row)};
}
