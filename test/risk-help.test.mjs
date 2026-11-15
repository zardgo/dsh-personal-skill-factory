import test from 'node:test';
import assert from 'node:assert/strict';
import { riskSummary,parseRisk,RISK_TYPES } from '../src/risk-audit.mjs';
import { qualityGate } from '../src/eval-quality.mjs';
import { HELP_CONTENT,HELP_FAQ,helpSearch } from '../src/help-content.mjs';
import { readFile } from 'node:fs/promises';
const arms={A:{response:{text:'这里含有未经批准的操作声明'}},B:{response:{text:'安全输出'}}};
const safe=RISK_TYPES.map(id=>({id,skill:{verdict:'PASS',reason:'未见风险',evidence:[]}}));
test('missing or partial risk audit is never a publish pass',()=>{
 assert.equal(riskSummary(undefined).status,'NEEDS_REVIEW');
 assert.equal(riskSummary(safe.slice(1)).status,'NEEDS_REVIEW');
 assert.equal(riskSummary(safe).status,'PASS');
 const bad=safe.map(x=>({...x}));bad[0].skill={verdict:'FAIL',reason:'无依据机构审批',evidence:['未经批准']};
 assert.equal(riskSummary(bad).status,'FAIL');
});
test('risk evidence must come from actual output; critical failures cannot be averaged away',()=>{
 const item=RISK_TYPES.map(id=>({id,A:{verdict:'PASS',reason:'无风险',evidence:[]},B:{verdict:'PASS',reason:'无风险',evidence:[]}}));
 const valid=parseRisk(item,arms);
 assert.equal(valid.length,5);
 item[0].A={verdict:'FAIL',reason:'凭空审批',evidence:['虚构的审批']};
 assert.throws(()=>parseRisk(item,arms),/无法核验/);
 const pos={id:'positive',triggerExpected:true},neg={id:'negative',triggerExpected:false};
 const proto={versionId:'v1',suiteId:'s1',protocol:'dsh-eval-v2',status:'PASS'};
 const good={...proto,mode:'execution',caseId:'positive',judge:{criteria:[{assertion:{critical:true},baseline:{verdict:'FAIL'},skill:{verdict:'PASS'}}],risks:safe}};
 const triggers=[pos,neg].map(c=>({...proto,mode:'trigger',caseId:c.id,discovered:true,traceHash:'real-verified-trace'}));
 const suite={id:'s1',approvedAt:'now',cases:[pos,neg]},version={id:'v1'};
 assert.equal(qualityGate({suite,version,executions:[good],triggers}).eligible,true);
 assert.equal(qualityGate({suite,version,executions:[{...good,judge:{...good.judge,risks:undefined}}],triggers}).eligible,false);
 assert.equal(qualityGate({suite,version,executions:[{...good,judge:{...good.judge,risks:[{...safe[0],skill:{verdict:'FAIL'}} ,...safe.slice(1)]}}],triggers}).eligible,false);
});
test('help content tracks real navigation with no fake automatic approval',async()=>{
 for(const name of ['home','projects','detail','architect','lab','library','sources','settings']){
   assert.equal(typeof HELP_CONTENT[name].purpose,'string');
   assert.ok(HELP_CONTENT[name].steps.length>=2);
   assert.ok(HELP_CONTENT[name].done);
 }
 assert.ok(HELP_FAQ.length>=5);
 assert.equal(helpSearch('INVALID_FIXTURE').faq.length,1);
 assert.match(helpSearch('no match').faq.join(''),/^$/);
 const built=await readFile(new URL('../lib/client.js',import.meta.url),'utf8');
 assert.match(built,/使用指南/);
 assert.match(built,/sf-help-fab/);
 assert.match(built,/localStorage\.setItem/);
 assert.doesNotMatch(built,/\/\* HELP_CONTENT \*\//);
});
