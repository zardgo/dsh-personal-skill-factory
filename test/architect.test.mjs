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
