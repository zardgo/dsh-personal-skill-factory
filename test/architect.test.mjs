import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createEngine } from '../src/engine.mjs';
import { createArchitect } from '../src/architect.mjs';
import { createBlueprintGenerator } from '../src/blueprint-generator.mjs';
import { architecture, hash } from '../src/architecture-store.mjs';

const spec={title:'Review operations',trigger:'Review a submitted exception record',exclusions:'Unrelated requests',
  deliverable:'An exception findings table',boundaries:'需人工审批；缺失数据标注',
  cases:['normal','normal','normal','missing','adversarial','non-trigger'].map((kind,i)=>({kind,input:'Fixture event '+i,expectations:['Specific observable outcome '+i]}))};
const generated={title:'Review operations',description:'Review a submitted exception record',trigger:'Review',inputs:'A case',outputs:'A table',
  steps:'Extract record\nClassify exception',rules:'缺失数据须标明',limits:'人工确认',testPlan:'Generated plan ignored'};
function extract(prompt){return JSON.parse(prompt.split('<untrusted-input>\n')[1].split('\n</untrusted-input>')[0]);}
function task(name,evidenceIds,recurring=true,methodIds=[]){
  return {name,trigger:'A submitted request',actor:'Operator',inputs:'Request',output:'Auditable report',recurring,uncertainties:[],evidenceIds,methodIds};
}
async function make(t) {
  const directory=await mkdtemp(path.join(tmpdir(),'dsh-architecture-'));
  t.after(()=>rm(directory,{force:true,recursive:true}));
  const root=path.join(directory,'factory'),publishRoot=path.join(directory,'published');
  const body='Published inspection checklist';
  const target=path.join(publishRoot,'inspect-lot');
  await mkdir(target,{recursive:true});await writeFile(path.join(target,'SKILL.md'),body);
  const queue=[];
  const runner=async x=>{
    const next=queue.shift();
    assert.ok(next,'unexpected model request');
    return {text:typeof next==='function'?JSON.stringify(next(x)):next,provider:'test',model:'test'};
  };
  const engine=createEngine({root,publishRoot,modelRunner:runner});
  const catalog=async()=>({complete:true,skills:[
    {name:'inspect-lot',description:'Inspect a batch',resourceBase:{kind:'directory',path:target}},
    {name:'lookup-carrier',description:'Find carrier tracking status'}]});
  const architect=createArchitect(engine,runner,catalog);
  const original={slug:'legacy-book',title:'Legacy',documents:[],analysis:[{name:'Existing method'}]};
  await engine.transact(db=>{db.projects.push(original);db.publications.push({id:'prior-inspect',slug:'inspect-lot',target,hash:hash(body),active:true});});
  return {engine,architect,runner,queue,original,publishRoot,body};
}
const consent={allowModelSend:true,provider:'test',model:'test'};

test('three sources produce seven auditable decisions, multi-source reuse, split and an approval gate',async t=>{
 const f=await make(t);
 const sources=await Promise.all([
  f.architect.ingest({kind:'knowledge',title:'Catalog terms',text:'A seal identifies a lot. Introductory theory alone has no workflow.'}),
  f.architect.ingest({kind:'sop',title:'Warehouse',text:'Inspect seal, classify damage, send incident report after confirmation.'}),
  f.architect.ingest({kind:'business-task',title:'Claims',text:'Audit a submitted claim and compare it with intake records.'}),
 ]);
 f.queue.push(x=>{
   const e=extract(x.prompt).evidence;
   const evidence=sources.map(s=>e.find(x=>x.sourceId===s.id).id);
   return {tasks:[
     task('Claim review',[evidence[2]]),task('Shipment carrier lookup',[evidence[1]]),
     task('Inspection evidence upgrade',[evidence[1]]),task('Cross-check seal',[evidence[0],evidence[1]]),
     task('Cross-check incident',[evidence[1]]),task('Prepare vendor notice',[evidence[1]]),
     task('Authorize inventory adjustment',[evidence[1]]),task('Terminology',[evidence[0]],false),task('Unknown certification',[])]};
 }, x=>{
   const ts=extract(x.prompt).tasks;
   const group=(decision,indexes,assetIds=[])=>({name:decision,decision,taskIds:indexes.map(i=>ts[i].id),
     reason:'Portfolio review',alternatives:[{decision:'REFERENCE',reason:'Keep as a reference if unused'}],assumptions:['Frequency needs verification'],assetIds,
     partitions:decision==='SPLIT'?indexes.map(i=>({name:ts[i].name,taskIds:[ts[i].id]})):[]});
   return {capabilities:[
     group('CREATE',[0]),group('REUSE',[1],['lookup-carrier']),group('ENHANCE',[2],['inspect-lot']),
     group('MERGE',[3,4]),group('SPLIT',[5,6]),group('REFERENCE',[7]),group('CREATE',[8]),
   ]};
 });
 const p=await f.architect.plan({...consent,sourceIds:sources.map(s=>s.id)});
 assert.deepEqual(p.capabilityIds.map(id=>id.split('-')[0]),Array(7).fill('capability'));
 let a=await f.architect.snapshot();
 assert.deepEqual(p.capabilityIds.map(id=>a.capabilities[id].decision),['CREATE','REUSE','ENHANCE','MERGE','SPLIT','REFERENCE','REJECT']);
 assert.match(a.capabilities[p.capabilityIds[6]].reason,/证据/);
 f.queue.push(...Array.from({length:5},()=>JSON.stringify(spec)));
 const pending=await f.architect.prepare({...consent,planId:p.id,revision:1});
 assert.equal(pending.blueprintIds.length,5);
 a=await f.architect.snapshot();
 assert.equal(a.blueprints[pending.blueprintIds[2]].sourceIds.length,2);
 assert.equal(a.blueprints[pending.blueprintIds[1]].baseline.hash,hash(f.body));
 const generate=createBlueprintGenerator(f.engine,f.runner);
 const bp=pending.blueprintIds[0];
 await assert.rejects(generate({...consent,blueprintId:bp}),/人工批准/);
 await assert.rejects(f.architect.approve({planId:p.id,revision:2,approved:false}),/人工批准/);
 await f.architect.approve({planId:p.id,revision:2,approved:true});
 f.queue.push(JSON.stringify(generated));
 const project=await generate({...consent,blueprintId:bp});
 assert.equal((await generate({...consent,blueprintId:bp})).slug,project.slug);
 await assert.rejects(f.engine.save({slug:project.slug,revision:1,testPlan:'changed'}),/锁定/);
 await f.engine.build(project.slug);
 assert.equal(Object.values((await f.architect.snapshot()).skillVersions).filter(v=>v.blueprintId===bp).length,1);
 const outputs=['Baseline','Skill',JSON.stringify({criteria:[{index:0,baseline:false,skill:true,reason:'Fixture semantic check'}]})];
 f.queue.push(...Array.from({length:6},()=>outputs).flat());
 await f.engine.evaluate({...consent,slug:project.slug,maxCases:4});
 await f.engine.evaluate({...consent,slug:project.slug,maxCases:4});
 await assert.rejects(f.engine.publish({slug:project.slug,revision:1,confirmSlug:project.slug,approved:true,acceptNoModelEvals:true}),/版本化评测/);
 a=await f.architect.snapshot();
 assert.equal(Object.keys(a.evalRuns).length,2);
 assert.equal(Object.keys(a.releases).length,0);
 assert.deepEqual((await f.engine.state()).projects.find(p=>p.slug===f.original.slug),f.original);
 assert.equal(await readFile(path.join(f.publishRoot,'inspect-lot','SKILL.md'),'utf8'),f.body);
});

test('migration preserves legacy state and hard-fails unknown schema without writing',async t=>{
 const f=await make(t);
 const before=await f.engine.state();
 await f.architect.migrate();
 const after=await f.engine.state();
 const {architecture:a,...legacy}=after;
 assert.deepEqual(legacy,before);
 assert.equal(a.schemaVersion,1);
 await f.architect.migrate();
 assert.deepEqual(await f.engine.state(),after);
 await f.engine.transact(db=>{db.architecture.schemaVersion=42;});
 await assert.rejects(f.architect.migrate(),/版本/);
 assert.equal((await f.engine.state()).architecture.schemaVersion,42);
});

test('human edits can exclude tasks and stale approval is blocked',async t=>{
 const f=await make(t);
 const s=await f.architect.ingest({kind:'knowledge',title:'Theory',text:'A definition without an action.'});
 await f.engine.transact(db=>{
   const a=architecture(db);
   a.tasks.task={id:'task',recurring:false,methodIds:[],evidenceIds:[]};
   a.capabilities.cap={id:'cap',taskIds:['task'],decision:'REFERENCE',reason:'Only theory',evidenceIds:[],assumptions:[]};
   a.plans.plan={id:'plan',status:'proposed',revision:1,sourceIds:[s.id],taskIds:['task'],capabilityIds:['cap'],inventory:[]};
 });
 const result=await f.architect.prepare({...consent,planId:'plan',revision:1,edits:[{capabilityIds:['cap'],taskIds:['task'],name:'Exclude',reason:'No use',decision:'REJECT'}]});
 assert.deepEqual(result.blueprintIds,[]);
 await assert.rejects(f.architect.approve({planId:'plan',revision:1,approved:true}),/版本/);
 assert.equal((await f.architect.approve({planId:'plan',revision:2,approved:true})).status,'approved');
});

test('host-only catalog reconciles a verified factory release without reading external bodies',async t=>{
 const f=await make(t);
 const p=path.join(f.publishRoot,'inspect-lot','SKILL.md');
 const body='---\nname: inspect-lot\ndescription: "Inspect a shipment lot"\n---\n\nInstructions';
 await writeFile(p,body);
 await f.engine.transact(db=>{db.publications[0].hash=hash(body);});
 const architect=createArchitect(f.engine,f.runner,async()=>({complete:true,skills:[{name:'external',description:'Read-only metadata'}]}));
 const inventory=await architect.inventory();
 assert.deepEqual(inventory.map(a=>[a.id,a.managed]),[['external',false],['inspect-lot',true]]);
 await writeFile(p,'externally changed');
 assert.deepEqual((await architect.inventory()).map(a=>a.id),['external']);
});


test('manual architecture edits cannot duplicate tasks or promote unverified reference into a Skill',async t=>{
 const f=await make(t);
 const s=await f.architect.ingest({kind:'knowledge',title:'Definitions',text:'A glossary of abbreviations.'});
 await f.engine.transact(db=>{
  const a=architecture(db);
  a.tasks.t1={id:'t1',name:'Glossary',recurring:false,methodIds:[],evidenceIds:[]};
  a.tasks.t2={id:'t2',name:'Notes',recurring:false,methodIds:[],evidenceIds:[]};
  a.capabilities.c1={id:'c1',taskIds:['t1','t2'],decision:'REFERENCE',evidenceIds:[],reason:'Pure knowledge'};
  a.plans.p1={id:'p1',status:'proposed',revision:1,sourceIds:[s.id],taskIds:['t1','t2'],capabilityIds:['c1'],inventory:[]};
 });
 const common={...consent,planId:'p1',revision:1};
 await assert.rejects(f.architect.prepare({...common,edits:[
  {capabilityIds:['c1'],taskIds:['t1'],name:'A',decision:'REFERENCE',reason:'Reference'},
  {capabilityIds:['c1'],taskIds:['t1','t2'],name:'B',decision:'REJECT',reason:'Excluded'}
 ]}),/恰好归属/);
 await assert.rejects(f.architect.prepare({...common,edits:[
  {capabilityIds:['c1'],taskIds:['t1','t2'],name:'Force new Skill',decision:'CREATE',reason:'Unverified request'}
 ]}),/重复执行|证据/);
 assert.equal(Object.keys((await f.architect.snapshot()).blueprints).length,0);
});

test('eight extracted methods from one legacy document can produce one Skill blueprint',async t=>{
 const f=await make(t);
 const body='Method 1 Method 2 Method 3 Method 4 Method 5 Method 6 Method 7 Method 8';
 const directory=path.join(f.engine.root,'documents','legacy-book');
 await mkdir(directory,{recursive:true});
 const textPath=path.join(directory,'doc-eight.txt');
 await writeFile(textPath,body);
 await f.engine.transact(db=>{
  const p=db.projects.find(p=>p.slug==='legacy-book');
  p.sourceType='book';p.revision=1;
  p.documents=[{id:'doc-eight',name:'methods.txt',sha256:hash(body),textPath}];
  p.analysisProgressByDocument={'doc-eight':{nextChunk:1,totalChunks:1}};
  p.analysis=Array.from({length:8},(_,i)=>({documentId:'doc-eight',name:'Method '+(i+1),problem:'Review goals',
   rules:['Check measurability'],start:0,end:body.length,chunkIndex:1,verified:true,
   evidence:[{quote:'Method '+(i+1)}]}));
 });
 const source=await f.architect.ingest({kind:'legacy',slug:'legacy-book',documentId:'doc-eight'});
 let snap=await f.architect.snapshot();
 assert.equal(Object.values(snap.methods).filter(m=>m.sourceId===source.id).length,8);
 f.queue.push(x=>{
   const data=extract(x.prompt);
   return {tasks:[task('Review goals',data.evidence.map(e=>e.id),true,data.methods.map(m=>m.id))]};
 },x=>({capabilities:[{name:'Goal review',taskIds:extract(x.prompt).tasks.map(t=>t.id),decision:'CREATE',
     reason:'One user task shares all eight methods',assetIds:[],alternatives:[{decision:'REFERENCE',reason:'Keep as knowledge only'}],
     assumptions:[],partitions:[]}]}),JSON.stringify(spec));
 const plan=await f.architect.plan({...consent,sourceIds:[source.id]});
 assert.equal(plan.capabilityIds.length,1);
 const pending=await f.architect.prepare({...consent,planId:plan.id,revision:1});
 assert.equal(pending.blueprintIds.length,1);
 snap=await f.architect.snapshot();
 assert.equal(snap.blueprints[pending.blueprintIds[0]].methodIds.length,8);
});

test('large book evidence is fully streamed in bounded batches and deduplicated before Skill planning',async t=>{
 const f=await make(t);
 const s=await f.architect.ingest({kind:'knowledge',title:'Large book',text:'reference '.repeat(2200)});
 const longEvidence=new Map();
 await f.engine.transact(db=>{
   const a=architecture(db);
   for(let i=0;i<28;i++){
     const quote='evidence '+i+':'+String.fromCharCode(65+i%25).repeat(4450)+(i%2?'尾段':'末尾');
     const id='extra-evidence-'+i;
     a.evidence[id]={id,sourceId:s.id,quote,location:'chapter '+i,verified:true};
     longEvidence.set(id,quote);
     const mid='extra-method-'+i;
     a.methods[mid]={id:mid,sourceId:s.id,name:'Step '+i,problem:'Audit recurring goals',rules:['Apply chapter '+i],evidenceIds:[id]};
   }
 });
 const calls=[],allParts=new Map(),allMethods=new Set();
 let batchNumber=0;
 const model=async ({prompt})=>{
   assert.ok(prompt.length<=67000,'never exceed the configured request ceiling');
   calls.push(prompt);
   if(prompt.includes('实现已批准蓝图')){
     assert.ok(prompt.length<=34000,'skill generation must fit budget');
     assert.match(prompt,/"evidenceCoverage"/);
     assert.match(prompt,/"originalPreserved":true/);
     return {text:JSON.stringify(generated)};
   }
   const data=extract(prompt);
   if(prompt.includes('连续分批')){
     batchNumber++;
     for(const e of data.evidence){
       if(!allParts.has(e.id))allParts.set(e.id,[]);
       allParts.get(e.id).push(e);
     }
     for(const m of data.methods)allMethods.add(m.id);
     const eids=[...new Set(data.evidence.map(e=>e.id))];
     const mids=data.methods.map(m=>m.id);
     const row=task('Audit goals',eids,true,mids);
     return {text:JSON.stringify({tasks:[row]})};
   }
   if(prompt.includes('合并不同批次')){
     return {text:JSON.stringify({groups:[{taskIds:data.tasks.map(t=>t.id)}]})};
   }
   if(prompt.includes('设计 Skill 蓝图')){
     assert.ok(data.evidenceCoverage?.originalPreserved!==true,'architect blueprint uses its own manifest schema');
     assert.equal(data.evidenceCoverage?.total,29);
     assert.equal(data.selectedEvidence.length,29);
     assert.ok(data.selectedEvidence.every(e=>e.excerptOnly && e.sha256));
     return {text:JSON.stringify(spec)};
   }
   if(prompt.includes('将任务聚类')){
     assert.equal(data.tasks.length,1,'the review should see ONE merged task');
     return {text:JSON.stringify({capabilities:[{name:'Goal audit',taskIds:[data.tasks[0].id],decision:'CREATE',assetIds:[],reason:'One concrete repeatable task',alternatives:[{decision:'REFERENCE',reason:'Keep as knowledge only'}],assumptions:[],partitions:[]}]})};
   }
   throw Error('unexpected model stage');
 };
 const newArchitect=createArchitect(f.engine,model,async()=>({complete:true,skills:[]}));
 const p=await newArchitect.plan({...consent,sourceIds:[s.id]});
 assert.ok(batchNumber>=3);
 assert.equal(p.planning.batchCount,batchNumber);
 assert.equal(p.planning.mode,'batched');
 assert.equal(p.planning.complete,true);
 assert.equal(p.taskIds.length,1);
 assert.equal(p.capabilityIds.length,1);
 assert.equal(allMethods.size,28);
 for(const [id,original] of longEvidence){
   const fragments=allParts.get(id)||[];
   assert.ok(fragments.length>=2,'long evidence must be split');
   assert.equal(fragments.sort((a,b)=>a.part-b.part).map(x=>x.quote).join(''),original);
 }
 const snap=await newArchitect.snapshot();
 const merged=snap.tasks[p.taskIds[0]];
 assert.equal(merged.methodIds.length,28);
 assert.ok(merged.evidenceIds.length>=28);
 assert.equal(snap.capabilities[p.capabilityIds[0]].decision,'CREATE');
 const pending=await newArchitect.prepare({...consent,planId:p.id,revision:1});
 assert.equal(pending.blueprintIds.length,1);
 const bp=(await newArchitect.snapshot()).blueprints[pending.blueprintIds[0]];
 assert.equal(bp.evidenceContextMode,'manifest');
 assert.ok(bp.evidenceIds.length>=28);
 await newArchitect.approve({planId:p.id,revision:2,approved:true});
 const realGenerator=createBlueprintGenerator(f.engine,model);
 const output=await realGenerator({...consent,blueprintId:bp.id});
 assert.ok(output.slug,'large evidence must not block generation');

});

test('incomplete reconciliation is rejected without saving a misleading architecture',async t=>{
 const f=await make(t);
 const s=await f.architect.ingest({kind:'knowledge',title:'Big evidence',text:'reference '.repeat(2200)});
 await f.engine.transact(db=>{
   const a=architecture(db);
   for(let i=0;i<20;i++)a.evidence['large-'+i]={id:'large-'+i,sourceId:s.id,quote:('data'+i).repeat(1100),location:'chapter '+i,verified:true};
 });
 const model=async ({prompt})=>{
   const data=extract(prompt);
   if(prompt.includes('连续分批'))return {text:JSON.stringify({tasks:[task('Task '+data.evidence[0]?.id,[data.evidence[0]?.id].filter(Boolean))]})};
   if(prompt.includes('合并不同批次'))return {text:JSON.stringify({groups:[{taskIds:[data.tasks[0].id]}]})};
   throw Error('unexpected stage');
 };
 await assert.rejects(createArchitect(f.engine,model,async()=>({complete:true,skills:[]})).plan({...consent,sourceIds:[s.id]}),/遗漏|覆盖/);
 assert.equal(Object.keys((await f.architect.snapshot()).plans).length,0);
});

test('planning resumes completed batches after a real model interruption, without faking complete coverage',async t=>{
 const f=await make(t);
 const s=await f.architect.ingest({kind:'knowledge',title:'Resumable book',text:'reference '.repeat(2200)});
 await f.engine.transact(db=>{
   const a=architecture(db);
   a.sources[s.id].truncated=true;
   for(let i=0;i<16;i++)a.evidence['resume-'+i]={id:'resume-'+i,sourceId:s.id,quote:('record '+i).repeat(1250),location:'page '+i,verified:true};
 });
 const seen=[],model=async ({prompt})=>{
   const data=extract(prompt);
   if(prompt.includes('连续分批')){
     const batch=Number(prompt.match(/第 (\d+)\//)[1]);
     seen.push(batch);
     if(batch===2&&seen.filter(x=>x===2).length===1)throw Error('simulated one-shot provider failure');
     return {text:JSON.stringify({tasks:[task('Review records',data.evidence.length?[data.evidence[0].id]:[],true)]})};
   }
   if(prompt.includes('合并不同批次'))return {text:JSON.stringify({groups:[{taskIds:data.tasks.map(t=>t.id)}]})};
   if(prompt.includes('将任务聚类'))return {text:JSON.stringify({capabilities:[{name:'Record review',taskIds:data.tasks.map(x=>x.id),decision:'CREATE',assetIds:[],reason:'Same output',alternatives:[{decision:'REFERENCE',reason:'Optional knowledge'}],assumptions:[],partitions:[]}]})};
   throw Error('unexpected stage');
 };
 const architect=createArchitect(f.engine,model,async()=>({complete:true,skills:[]}));
 const args={...consent,sourceIds:[s.id]};
 await assert.rejects(architect.plan(args),/provider failure/);
 assert.equal(seen.filter(x=>x===1).length,1);
 assert.ok(Object.keys((await f.engine.state()).architecture.planningCheckpoints||{}).length);
 const progress=[];
 const plan=await architect.plan({...args,onProgress:p=>progress.push(p)});
 assert.equal(seen.filter(x=>x===1).length,1,'first completed batch should be reused, not paid twice');
 assert.ok(seen.filter(x=>x===2).length===2);
 assert.ok(progress.some(p=>p.stage==='reconcile'));
 assert.equal(plan.planning.complete,false,'truncated imported source must not claim complete source coverage');
 assert.deepEqual(plan.planning.truncatedSourceIds,[s.id]);
 assert.equal(Object.keys((await f.engine.state()).architecture.planningCheckpoints||{}).length,0);
});

test('planner retries an actual timeout once, reports retry and uses stage-specific token/deadline limits',async t=>{
 const f=await make(t);
 const s=await f.architect.ingest({kind:'knowledge',title:'Slow planner',text:'Audit recurring operational goals.'});
 let discoveryCalls=0;
 const progress=[];
 const runner=async opts=>{
   assert.equal(opts.timeoutMs,240000);
   assert.ok(opts.maxTokens<12000);
   const data=extract(opts.prompt);
   if(opts.prompt.startsWith('发现可重复执行')){
     discoveryCalls++;
     if(discoveryCalls===1)throw Object.assign(Error('slow provider'),{code:'MODEL_TIMEOUT'});
     return {text:JSON.stringify({tasks:[task('Review goals',data.evidence.map(x=>x.id))]})};
   }
   if(opts.prompt.startsWith('将任务聚类'))return {text:JSON.stringify({capabilities:[{name:'Goal review',taskIds:data.tasks.map(x=>x.id),decision:'CREATE',assetIds:[],reason:'Shared trigger and output',alternatives:[{decision:'REFERENCE',reason:'Background reference'}],assumptions:[],partitions:[]}]})};
   throw Error('unexpected stage');
 };
 const a=createArchitect(f.engine,runner,async()=>({complete:true,skills:[]}));
 const p=await a.plan({...consent,sourceIds:[s.id],onProgress:x=>progress.push(x)});
 assert.equal(discoveryCalls,2);
 assert.equal(p.capabilityIds.length,1);
 assert.ok(progress.some(x=>x.stage==='retry'&&x.phase==='discovery'&&x.code==='MODEL_TIMEOUT'));
 assert.equal(Object.keys((await f.engine.state()).architecture.planningCheckpoints||{}).length,0);
});

test('single-stage discovery survives a portfolio timeout across host recreation without another discovery call',async t=>{
 const f=await make(t);
 const s=await f.architect.ingest({kind:'knowledge',title:'Retryable plan',text:'Auditing recurring service goals with evidence.'});
 let discovery=0,portfolio=0;
 const runner=async opts=>{
   const data=extract(opts.prompt);
   if(opts.prompt.startsWith('发现可重复执行')){
     discovery++;
     return {text:JSON.stringify({tasks:[task('Review service goals',data.evidence.map(x=>x.id))]})};
   }
   if(opts.prompt.startsWith('将任务聚类')){
     portfolio++;
     if(portfolio<=2)throw Object.assign(Error('timeout'),{code:'MODEL_TIMEOUT'});
     return {text:JSON.stringify({capabilities:[{name:'Service goal review',taskIds:data.tasks.map(x=>x.id),decision:'CREATE',assetIds:[],reason:'One output',alternatives:[{decision:'REFERENCE',reason:'Knowledge only'}],assumptions:[],partitions:[]}]})};
   }
   throw Error('unexpected stage');
 };
 const first=createArchitect(f.engine,runner,async()=>({complete:true,skills:[]}));
 await assert.rejects(first.plan({...consent,sourceIds:[s.id]}),e=>e.code==='MODEL_TIMEOUT');
 const state=await f.engine.state();
 const checkpoint=Object.values(state.architecture.planningCheckpoints||{});
 assert.equal(checkpoint.length,1);
 assert.ok(checkpoint[0].discovery?.payload?.length);
 const resumed=createArchitect(createEngine({root:f.engine.root,publishRoot:f.publishRoot}),runner,async()=>({complete:true,skills:[]}));
 const p=await resumed.plan({...consent,sourceIds:[s.id]});
 assert.equal(p.taskIds.length,1);
 assert.equal(discovery,1,'cached discovery should be reused after Host process recreation');
 assert.equal(portfolio,3);
 assert.equal(Object.keys((await f.engine.state()).architecture.planningCheckpoints||{}).length,0);
});
