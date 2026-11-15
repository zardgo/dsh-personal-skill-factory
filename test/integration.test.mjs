import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createEngine } from '../src/engine.mjs';
import { apply, createHandler, API_PREFIX } from '../src/index.js';
import { VERSION } from '../src/version.mjs';

const source='Review scoped target and measure results. '.repeat(6);
const unrelated='Separate source material, never include this evidence. '.repeat(5);
const draft={
  title:'Review OKRs',description:'审核 OKR',trigger:'用户要求审核年度或季度 OKR 时',
  inputs:'目标与关键结果',outputs:'审核意见',steps:'识别目标\n核对关键结果',
  rules:'缺失数据必须注明',limits:'人工确认后执行',
  testPlan:Array.from({length:6},(_,i)=>'业务用例 '+i+' || 口径,待补').join('\n'),
};
const versionHeaders={'x-skill-factory-client':VERSION};
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');

function transport(handler){
  return async (endpoint,body,version=VERSION,method=body?'POST':'GET')=>{
    const resp=await handler(endpoint.split('?')[0],new Request('http://fixture'+API_PREFIX+endpoint,{
      method,headers:{...versionHeaders,'x-skill-factory-client':version,'content-type':'application/json'},
      body:body?JSON.stringify(body):undefined,
    }));
    assert.match(resp.headers.get('content-type'),/json/);
    return {...await resp.json(),status:resp.status};
  };
}
async function fixture(t, runner){
  const dir=await mkdtemp(path.join(os.tmpdir(),'factory-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const root=path.join(dir,'data'),publishRoot=path.join(dir,'skills');
  const options={root,publishRoot,modelRunner:runner};
  const slug='okrs-original',documentId='doc-one',docDir=path.join(root,'documents',slug);
  await mkdir(docDir,{recursive:true});
  const docs=[{id:documentId, name:'source.txt', sha256:hash(source),textPath:path.join(docDir,documentId+'.txt')},
    {id:'doc-two',name:'other.txt',sha256:hash(unrelated),textPath:path.join(docDir,'doc-two.txt')}];
  await writeFile(docs[0].textPath,source);
  await writeFile(docs[1].textPath,unrelated);
  const analysis=[
    {id:'m1',documentId,chunkIndex:1,start:0,end:source.length,verified:true,name:'Scoped review',rules:['measure'],evidence:[{quote:'measure results'}]},
    {id:'m2',documentId:'doc-two',chunkIndex:1,start:0,end:unrelated.length,verified:true,name:'Separate',rules:[],evidence:[{quote:'never include this evidence'}]},
  ];
  const parent={slug,title:'Original',sourceType:'book',revision:2,documents:docs,analysis,
    analysisProgress:{documentId,nextChunk:25,totalChunks:25},
    synthesisByDocument:{[documentId]:{nextMethod:1,totalMethods:1,signature:hash('m1'),finalGroups:[{id:'g1',methodIds:['m1'],name:'Review',reason:'Measure results'}],finalizedAt:'fixture'}}};
  await writeFile(path.join(root,'state.json'),JSON.stringify({schemaVersion:1,projects:[parent],runs:[],publications:[]}));
  return {root,options,parent,engine:createEngine(options),args:{slug,documentId,revision:2,groupId:'g1',allowModelSend:true,provider:'fixture',model:'fixture'}};
}
async function finished(call,id){
  for(let i=0;i<150;i++){
    const job=await call('/job-status?id='+id);
    if(['completed','failed'].includes(job.data?.status))return job.data;
    await new Promise(r=>setTimeout(r,5));
  }
  assert.fail('background task did not finish');
}
test('Cordis registration uses all handler methods, including GET job-status',()=>{
  const routes=[];
  apply({effect(fn){fn();},connection:{fetch:{register(route){routes.push(route);return ()=>{};}}}});
  const expected=createHandler().routeMethods;
  assert.deepEqual(Object.fromEntries(routes.map(r=>[r.path.slice(API_PREFIX.length),r.methods[0]])),expected);
  assert.equal(expected['/job-status'],'GET');
});
test('HTTP contract statuses, request IDs and client-version mismatch',async t=>{
  const f=await fixture(t);
  const call=transport(createHandler(f.engine));
  assert.equal((await call('/info',null,'old')).data.version,VERSION);
  assert.equal((await call('/state',null,'old')).status,428);
  assert.equal((await call('/unknown')).status,404);
  assert.equal((await call('/job-status',{id:'unknown'})).status,405);
  assert.equal((await call('/job-status?id=unknown')).status,404);
  assert.equal((await call('/save',{slug:f.parent.slug})).status,428);
  assert.equal((await call('/save',{slug:f.parent.slug,revision:1})).status,409);
  const bad=transport(createHandler({state:()=>{throw new Error('fixture failure')}}));
  const error=await bad('/state');
  assert.equal(error.status,500);
  assert.ok(error.requestId);
});
test('proposal survives job restart; manual completion is idempotent and preserves source project',async t=>{
  let calls=0;
  let release;
  const barrier=new Promise(r=>{release=r;});
  const f=await fixture(t,async()=>{
    ++calls;
    await barrier;
    const {trigger,...partial}=draft;
    return {text:JSON.stringify(partial)};
  });
  const call=transport(createHandler(f.engine));
  assert.equal((await call('/propose',f.args)).status,409);
  assert.equal((await call('/fork',{...f.args,approved:true})).status,409);
  // Legacy project data and engine logic remain readable for audit and rollback;
  // the public API must not offer a bypass around approved architecture.
  const started=f.engine.propose(f.args);
  release();
  const job=await started;
  assert.equal(job.status,'needs-review');
  assert.equal(calls,3);
  const resumed=transport(createHandler(createEngine(f.options)));
  assert.equal((await resumed('/job-status?id=legacy-session-that-was-never-registered')).status,404);
  const proposed=(await resumed('/proposals?slug='+f.args.slug+'&documentId='+f.args.documentId)).data[0];
  const fork={...f.args,proposalId:proposed.id,sourceMethodIds:proposed.sourceMethodIds,draft,approved:true};
  assert.equal((await resumed('/fork',fork)).status,409);
  await assert.rejects(()=>f.engine.fork({...fork,approved:false}),/人工审核/);
  await assert.rejects(()=>f.engine.fork({...fork,sourceMethodIds:['m2']}),/来源方法/);
  const published=await f.engine.fork(fork);
  assert.equal((await f.engine.fork(fork)).slug,published.slug);
  assert.deepEqual((await f.engine.state()).projects.find(p=>p.slug===f.args.slug),f.parent);
  const result=(await resumed('/build',{slug:published.slug})).data;
  assert.match(result.preview,/用户要求审核年度或季度 OKR 时/);
  const ref=await readFile(path.join(result.path,'references/source-register.md'),'utf8');
  assert.match(ref,/measure results/);
  assert.doesNotMatch(ref,/never include this evidence/);
});
test('a parent revision changed during generation blocks derivation and preserves diagnostics',async t=>{
  let release;
  const barrier=new Promise(r=>{release=r;});
  const f=await fixture(t,async()=>{await barrier;return {text:JSON.stringify(draft)};});
  const call=transport(createHandler(f.engine));
  assert.equal((await call('/propose',f.args)).status,409);
  const pending=f.engine.propose(f.args);
  await call('/save',{slug:f.args.slug,revision:2,title:'Changed title'});
  release();
  await assert.rejects(pending,/候选已保留/);
  assert.deepEqual(await f.engine.proposalRecords(f.args.slug,f.args.documentId),[]);
  assert.equal((await f.engine.state()).projects.length,1);
});
test('publishing requires the current passing evaluation and rejects an unknown existing Skill',async t=>{
  const f=await fixture(t,async()=>({text:'指出口径和待补数据'}));
  const e=f.engine;
  const p=await e.create({slug:'okr-audit-test',title:'Review',sourceType:'problem'});
  const saved=await e.save({...draft,slug:p.slug,revision:p.revision});
  const publish={slug:p.slug,revision:saved.revision,confirmSlug:p.slug,approved:true,acceptNoModelEvals:true};
  const evalArgs={slug:p.slug,allowModelSend:true,model:'fixture',provider:'fixture'};
  await e.build(p.slug);
  await assert.rejects(e.publish(publish),/六个真实/);
  await e.evaluate({...evalArgs,maxCases:4});
  await assert.rejects(e.publish(publish),/六个真实/);
  await e.evaluate({...evalArgs,maxCases:4});
  const target=path.join(f.options.publishRoot,p.slug);
  await mkdir(target,{recursive:true});
  await writeFile(path.join(target,'SKILL.md'),'unknown provenance');
  await assert.rejects(e.publish({...publish,replace:true}),/禁止覆盖/);
  assert.equal(await readFile(path.join(target,'SKILL.md'),'utf8'),'unknown provenance');
  await rm(target,{recursive:true});
  await assert.rejects(e.publish({...publish,approved:false}),/人工批准/);
  assert.equal((await e.publish(publish)).active,true);
  const revised=await e.save({slug:p.slug,revision:saved.revision,trigger:'新的触发场景'});
  await e.build(p.slug);
  await assert.rejects(e.publish({...publish,revision:revised.revision,replace:true}),/六个真实/);
});
