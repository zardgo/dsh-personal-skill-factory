import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createEngine } from '../src/engine.mjs';
import { createOptimizer } from '../src/optimizer.mjs';
import { createHandler, API_PREFIX } from '../src/index.js';
import { protocol } from '../src/evals.mjs';
import { RISK_TYPES } from '../src/risk-audit.mjs';
import { VERSION } from '../src/version.mjs';

const fields={title:'样本任务审核',description:'核查文本',trigger:'收到明确审核需求时调用',inputs:'待审文本',outputs:'审核报告',steps:'检查输入\n核对规则\n输出',rules:'缺失材料明确标注',limits:'结果待人工确认，不得编造',testPlan:'正例一\n正例二\n负例'};
const slug='example-audit';
const cases=[1,2].map(i=>({id:'case-'+i,kind:'normal',input:'请审核样本 '+i,materials:[],triggerExpected:true,expectations:[{id:'assertion-1',rule:'输出问题',critical:true,requiredMaterialIds:[]}]}));
cases.push({id:'non-trigger',kind:'non-trigger',input:'只问定义',materials:[],triggerExpected:false,expectations:[{id:'assertion-1',rule:'不要启动审核',critical:false,requiredMaterialIds:[]}]});
const model=(text)=>({text,provider:'fixture',model:'fixture',usage:{totalTokens:10},finish:'stop'});
const newDraft={...fields,rules:'缺失材料要标注来源，不得编造，区分用户声明与核验事实'};
function fakeRunner({system,prompt}){
 if(system.includes('Skill 工程改进器'))return Promise.resolve(model(JSON.stringify(newDraft)));
 if(system.includes('评测用例审查员'))return Promise.resolve(model(JSON.stringify({status:'VALID',reasons:[]})));
 if(system.includes('独立评审两个输出')){
  const task=JSON.parse(prompt),reversed=!task.A.includes('原始版');
  const old={verdict:'FAIL',reason:'缺少修改建议',evidence:[],provenance:['missing'],causes:['INCOMPLETE_OUTPUT']};
  const fresh={verdict:'PASS',reason:'符合',evidence:['有效回答'],provenance:['user-declared'],causes:[]};
  return Promise.resolve(model(JSON.stringify({criteria:[{id:'assertion-1',A:reversed?fresh:old,B:reversed?old:fresh}],
   risk:RISK_TYPES.map(id=>({id,A:{verdict:'PASS',reason:'未识别风险',evidence:[]},B:{verdict:'PASS',reason:'未识别风险',evidence:[]}}))})));
 }
 return Promise.resolve(model(system.includes('缺失材料要标注来源')?'有效回答':'原始版回答'));
}
async function fixture(t,run=fakeRunner){
 const root=await mkdtemp(path.join(os.tmpdir(),'skill-factory-optimizer-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const engine=createEngine({root,publishRoot:path.join(root,'published')});
 const blueprint={id:'blueprint-a',title:fields.title,status:'approved',evalSuiteId:'original-suite',
  trigger:fields.trigger,boundaries:'不自动审批',deliverable:'报告',exclusions:'非审查问题'};
 const project={slug,sourceType:'problem',revision:1,status:'draft',blueprintId:blueprint.id,
  ...fields};
 await engine.transact(db=>{db.projects.push(project);db.architecture={schemaVersion:1,
  ...Object.fromEntries(['sources','evidence','methods','tasks','capabilities','blueprints','skillVersions','evalSuites','evalRuns','releases','plans'].map(k=>[k,{}]))};
  db.architecture.blueprints[blueprint.id]=blueprint;
  db.architecture.evalSuites['original-suite']={plan:fields.testPlan};});
 await engine.build(slug);
 let p=(await engine.state()).projects[0];
 await engine.transact(db=>{
  db.projects[0].evalSuiteV2Id='suite-approved';
  db.evalV2={suites:{'suite-approved':{id:'suite-approved',approvedAt:'2026-11-01',cases}},runs:[
   {slug,caseId:'case-1',mode:'execution',status:'FAIL',suiteId:'suite-approved',versionId:p.build.skillVersionId,provider:'fixture',model:'fixture',protocol}
  ],workspaces:{}};
 });
 return {engine,optimizer:createOptimizer(engine,run),versionId:p.build.skillVersionId};
}
test('optimizations create immutable review proposals; trial uses old Skill as baseline; accepting invalidates build and never publishes',async t=>{
 const f=await fixture(t);let p=(await f.engine.state()).projects[0];
 const opts={slug,revision:p.revision,provider:'fixture',model:'fixture',allowModelSend:true};
 const candidate=await f.optimizer.propose({...opts,intent:'quality'});
 assert.equal(candidate.status,'ready');
 assert.equal((await f.engine.state()).projects[0].rules,fields.rules);
 const run=await f.optimizer.trial({...opts,proposalId:candidate.id,caseIds:['case-1','case-2']});
 assert.equal(run.status,'PASS');
 assert.equal(run.results.length,2);
 assert.equal(run.improvement,2);
 assert.equal(run.results[0].experiment.baseline.request.system.includes('原始版'),false);
 assert.match(run.results[0].experiment.baseline.request.system,/缺失材料明确标注/);
 assert.match(run.results[0].experiment.skill.request.system,/区分用户声明/);
 assert.equal((await f.optimizer.trial({...opts,proposalId:candidate.id,caseIds:['case-1','case-2']})).reused,true);
 await assert.rejects(()=>f.optimizer.apply({...opts,proposalId:candidate.id,approved:false,confirmSlug:slug}),/人工审核/);
 const applied=await f.optimizer.apply({...opts,proposalId:candidate.id,approved:true,confirmSlug:slug});
 assert.equal(applied.revision,2);
 assert.equal(applied.requiresFullEvals,true);
 assert.equal(applied.autoPublished,false);
 p=(await f.engine.state()).projects[0];
 assert.equal(p.build,null);
 assert.match(p.rules,/区分用户声明/);
 assert.equal((await f.engine.state()).publications.length,0);
 await assert.rejects(()=>f.optimizer.apply({...opts,proposalId:candidate.id,approved:true,confirmSlug:slug}),/revision/);
});
test('frozen testPlan and title cannot be altered by optimizer; needs-review candidate cannot run',async t=>{
 const f=await fixture(t,request=>{
  if(request.system.includes('Skill 工程改进器'))return model(JSON.stringify({...newDraft,testPlan:'更宽松的测试'}));
  return fakeRunner(request);
 });
 const opts={slug,revision:1,provider:'fixture',model:'fixture',allowModelSend:true};
 const result=await f.optimizer.propose({...opts,intent:'quality'});
 assert.equal(result.status,'needs-review');
 assert.match(result.issues.join(' '),/testPlan/);
 await assert.rejects(()=>f.optimizer.trial({...opts,proposalId:result.id,caseIds:['case-1']}),/不可试跑/);
 assert.equal((await f.engine.state()).projects[0].revision,1);
});
test('optimizer refuses missing approved real eval, changed revision, unapproved apply, and invalid cases',async t=>{
 const f=await fixture(t);const opts={slug,revision:1,provider:'fixture',model:'fixture',allowModelSend:true};
 await assert.rejects(()=>f.optimizer.propose({...opts,revision:0,intent:'quality'}),/revision/);
 await assert.rejects(()=>f.optimizer.propose({...opts,allowModelSend:false,intent:'quality'}),/确认/);
 const p=await f.optimizer.propose({...opts,intent:'quality'});
 await assert.rejects(()=>f.optimizer.trial({...opts,proposalId:p.id,caseIds:['non-trigger']}),/有效正例/);
 await assert.rejects(()=>f.optimizer.trial({...opts,proposalId:p.id,caseIds:['case-1','case-1']}),/不重复/);
 await assert.rejects(()=>f.optimizer.apply({...opts,proposalId:p.id,approved:true,confirmSlug:slug}),/真实模型试跑/);
});
test('Host HTTP routes are correct and optimizer background task starts without documentId',async t=>{
 const f=await fixture(t);
 const handler=createHandler(f.engine,{get(){},llm:null});
 assert.equal(handler.routeMethods['/optimizer/status'],'GET');
 assert.equal(handler.routeMethods['/optimizer/apply'],'POST');
 const headers={'x-skill-factory-client':VERSION,'content-type':'application/json'};
 const req=new Request('http://local'+API_PREFIX+'/job-start',{method:'POST',headers,
  body:JSON.stringify({operation:'optimizer-propose',slug,revision:1,provider:'fixture',model:'fixture',intent:'quality',allowModelSend:true})});
 const res=await handler('/job-start',req);
 assert.equal(res.status,200);
 assert.ok((await res.json()).data.id);
});
test('trigger workspace can be recovered from durable status after page recreation',async t=>{
 const {createEvalService}=await import('../src/eval-service.mjs');
 const f=await fixture(t);
 const opts={slug,revision:1,provider:'fixture',model:'fixture'};
 const first=createEvalService(f.engine,fakeRunner);
 const workspace=await first.stage(opts);
 assert.ok(workspace.cwd.includes('eval-workspaces'));
 const reloaded=createEvalService(f.engine,fakeRunner);
 const status=await reloaded.status(opts);
 assert.equal(status.workspaces.length,1);
 assert.equal(status.workspaces[0].id,workspace.id);
 assert.equal(status.workspaces[0].prompts.length,3);
});
test('optimizer requires a current valid execution record and protects stored schema',async t=>{
 const f=await fixture(t);
 const opts={slug,revision:1,provider:'fixture',model:'fixture',intent:'quality',allowModelSend:true};
 await f.engine.transact(db=>{db.evalV2.runs=[];});
 await assert.rejects(()=>f.optimizer.propose(opts),/真实 Execution Evals/);
 await f.engine.transact(db=>{db.optimizer={schemaVersion:99,proposals:{},trials:[]};});
 await assert.rejects(()=>f.optimizer.status(slug),/优化记录结构无效/);
});
test('interrupted pilot trial resumes from persisted case checkpoint without repeating finished case',async t=>{
 const {hash}=await import('../src/architecture-store.mjs');
 let callCount=0;
 const f=await fixture(t,async request=>{callCount++;return fakeRunner(request)});
 const opts={slug,revision:1,provider:'fixture',model:'fixture',allowModelSend:true};
 const proposal=await f.optimizer.propose({...opts,intent:'quality'});
 const tests=['case-1','case-2'],key=hash([proposal.id,tests,'fixture','fixture']);
 await f.engine.transact(db=>{
  db.optimizer.trials.push({id:'incomplete-trial',key,proposalId:proposal.id,slug,revision:1,suiteId:'suite-approved',
   baseVersionId:proposal.versionId,provider:'fixture',model:'fixture',caseIds:tests,status:'RUNNING',improvement:null,
   results:[{caseId:'case-1',status:'PASS',judge:{criteria:[{baseline:{verdict:'FAIL'},skill:{verdict:'PASS'}}],
    risks:RISK_TYPES.map(id=>({id,skill:{verdict:'PASS'}}))}}],createdAt:'2026-11-15T00:00:00Z'});
 });
 callCount=0;
 const result=await f.optimizer.trial({...opts,proposalId:proposal.id,caseIds:tests});
 assert.equal(callCount,4);
 assert.equal(result.id,'incomplete-trial');
 assert.equal(result.results.length,2);
 assert.equal(result.status,'PASS');
});
