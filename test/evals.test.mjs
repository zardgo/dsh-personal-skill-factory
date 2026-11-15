import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCase,evaluateCase,runExecution,protocol,analyzeFailure,businessPrompt } from '../src/evals.mjs';
import { assessTrigger } from '../src/eval-trigger.mjs';
import { qualityGate } from '../src/eval-quality.mjs';
import { hash } from '../src/architecture-store.mjs';
import { RISK_TYPES, riskSummary } from '../src/risk-audit.mjs';

const domains=JSON.parse(await readFile(new URL('../fixtures/cross-domain.json',import.meta.url)));
const config={provider:'test-provider',model:'test-model',maxTokens:3000};
const version={id:'version-a'};
const blueprint={id:'approved',boundaries:'Requires approval'};
const pass={verdict:'PASS',reason:'met',evidence:['answer'],provenance:['material-verified'],causes:[]};
const fail={verdict:'FAIL',reason:'missing context and premise',evidence:[],provenance:['missing'],causes:['MISSING_CONTEXT','PREMISE_LOSS']};
const modelResponse=text=>({text,provider:config.provider,model:config.model,usage:{totalTokens:12}});

test('structural invalidity and semantic fixture review never execute A/B',async()=>{
  const item=domains[0].test;
  assert.equal(validateCase({...item,materials:[]}).status,'INVALID_FIXTURE');
  assert.equal(validateCase({...item,materials:undefined}).status,'INVALID_FIXTURE');
  assert.equal(validateCase({...item,expectations:['ambiguous']}).status,'NEEDS_REVIEW');
  let count=0;
  const row=await evaluateCase(async()=>{count++;return modelResponse(JSON.stringify({status:'INVALID_FIXTURE',reasons:['contradiction']}));},{test:item,blueprint,config,version});
  assert.equal(count,1);
  assert.equal(row.status,'INVALID_FIXTURE');
  assert.equal(row.failures[0].code,'INVALID_FIXTURE');
});

for(const {domain,test:item} of domains)test(domain+' uses symmetric facts and separate judge rubric',async()=>{
  const calls=[];
  const row=await evaluateCase(async request=>{
    calls.push(request);
    if(calls.length===1)return modelResponse('{"status":"VALID","reasons":[]}');
    if(calls.length<4)return modelResponse('answer');
    const reverse=Boolean(parseInt(hash(item.id).at(-1),16)%2);
    return modelResponse(JSON.stringify({criteria:[{id:item.expectations[0].id,A:reverse?pass:fail,B:reverse?fail:pass}],
      risk:RISK_TYPES.map(id=>({id,A:{verdict:'PASS',reason:'无风险',evidence:[]},B:{verdict:'PASS',reason:'无风险',evidence:[]}}))}));
  },{test:item,blueprint,config,version,skillBody:'Skill policy'});
  assert.equal(row.status,'PASS');
  assert.equal(calls[1].prompt,calls[2].prompt);
  assert.deepEqual(row.experiment.referencesLoaded,[]);
  assert.equal(JSON.parse(calls[3].prompt).blueprint.boundaries,blueprint.boundaries);
  assert.equal(JSON.parse(calls[3].prompt).assertions[0].rule,item.expectations[0].rule);
  assert.deepEqual(analyzeFailure({...row,judge:{criteria:[{skill:fail}]}}).map(f=>f.code),['MISSING_CONTEXT','PREMISE_LOSS']);
});

test('an invalid model identity or missing response stays unscored',async()=>{
  const experiment=await runExecution(async()=>({text:'x',provider:'different',model:config.model}),{test:domains[0].test,config,version,skillBody:'x'});
  assert.match(experiment.baseline.failure.message,/身份/);
});

test('trigger checks real log shape, exact prompt, completion and pinned body',()=>{
  const item=domains[0].test,slug='test-skill',body='pinned',cwd='/test';
  const workspace={slug,cwd,versionId:version.id,bodyHash:hash(body),createdAt:1};
  const session={events:[
    {type:'session',id:'session-test',cwd,createdAt:2,isSeeded:false},
    {type:'agent/inbox/spliced',data:{inserted:[{role:'user',content:[{type:'text',text:businessPrompt(item)}]}]}},
    {type:'turn/start',time:'2026-01-01T00:00:00Z'},
    {type:'user/message',data:{text:'- `'+slug+'`: fixture'}},
    {type:'request/header',data:{header:{config}}},
    {type:'tool/call',data:{name:'skill',callId:'abc',arguments:JSON.stringify({name:slug})}},
    {type:'tool/result',data:{message:{toolCallId:'abc',content:[{text:'<skill_content name="test-skill">\n<skill_instructions>\npinned\n</skill_instructions>'}]}}},
    {type:'turn/end',time:'2026-01-01T00:00:01Z',data:{reason:{kind:'completed'}}},
  ]};
  assert.equal(assessTrigger({test:item,workspace,session,config}).status,'PASS');
  assert.equal(assessTrigger({test:item,workspace:{...workspace,bodyHash:hash('changed')},session,config}).status,'FAIL');
  assert.equal(assessTrigger({test:{...item,triggerExpected:false},workspace,session,config}).status,'FAIL');
  assert.throws(()=>assessTrigger({test:{...item,input:'changed'},workspace,session,config}),/完全一致/);
});

test('gate requires immutable matching evidence, safety, trigger coverage and net gain',()=>{
 const p=domains[0].test,n={...p,id:'other',triggerExpected:false},suite={id:'approved',approvedAt:1,cases:[p,n]};
 const common={protocol,versionId:version.id,suiteId:suite.id,status:'PASS'};
 const execution={...common,caseId:p.id,judge:{criteria:[{assertion:p.expectations[0],skill:pass,baseline:fail}],
    risks:RISK_TYPES.map(id=>({id,skill:{verdict:'PASS',reason:'未检出',evidence:[]},baseline:{verdict:'PASS',reason:'未检出',evidence:[]}}))}};
 const triggers=[p,n].map(x=>({...common,caseId:x.id,discovered:true,traceHash:'event-digest'}));
 assert.equal(qualityGate({suite,version,executions:[execution],triggers}).eligible,true);
 assert.equal(qualityGate({suite,version:{id:'new'},executions:[execution],triggers}).eligible,false);
 assert.equal(qualityGate({suite,version,executions:[execution],triggers:[]}).eligible,false);
});
test('independent risk failure blocks a case even when normal assertions all pass',async()=>{
 const item=domains[0].test;
 const reversed=Boolean(parseInt(hash(item.id).at(-1),16)%2);
 const ok={verdict:'PASS',reason:'完成',evidence:['answer'],provenance:['material-verified'],causes:[]};
 let calls=0;
 const run=async request=>{
  calls++;
  if(calls===1)return modelResponse('{"status":"VALID","reasons":[]}');
  if(calls<=3)return modelResponse('answer 却声称机构已经批准');
  const risk=RISK_TYPES.map(id=>({id,A:{verdict:'PASS',reason:'无风险',evidence:[]},B:{verdict:'PASS',reason:'无风险',evidence:[]}}));
  const harmful=reversed?'A':'B';
  risk[1][harmful]={verdict:'FAIL',reason:'未经来源支持宣称有正式审批',evidence:['机构已经批准']};
  return modelResponse(JSON.stringify({criteria:[{id:item.expectations[0].id,A:ok,B:ok}],risk}));
 };
 const result=await evaluateCase(run,{test:item,blueprint,config,version,skillBody:'fixed'});
 assert.equal(result.status,'FAIL');
 assert.ok(result.failures.some(x=>x.code==='CRITICAL_RISK'));
 assert.equal(result.judge.criteria[0].skill.verdict,'PASS');
});
