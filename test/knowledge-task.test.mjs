import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createEngine } from '../src/engine.mjs';
import { createHandler } from '../src/index.js';
import { createKnowledgeService } from '../src/knowledge-service.mjs';
import { createTaskFlow } from '../src/task-flow.mjs';
import { createEvalService } from '../src/eval-service.mjs';

const planDraft={
 title:'审核季度 OKR',description:'当需要审核季度 OKR 的目标和可衡量 KR 时调用，输出具体修改建议。',
 trigger:'用户提供 OKR 并请求审核、修改或制定建议时使用。',
 inputs:'季度 OKR 文本\n团队目标及可用基线',outputs:'审核表\n具体修改建议\n待确认条件',
 steps:'读取 OKR 并分辨 Objective 与 KR\n逐项检查可量化性及依赖\n给出可核验的修订建议',
 rules:'只依据提供的资料与上下文分析\n数据缺失时标注待补\n不把推测冒充原书观点',
 limits:'不自动修改业务系统；对外发送和修改目标须人工确认；不得编造数值或权限。',
 testPlan:[
  '正常：给定完整的季度目标和 KR || 输出审查表',
  '正常：目标缺少衡量单位 || 指出度量缺口',
  '正常：部门之间存在依赖 || 标记依赖',
  '缺失：只有目标没有基线 || 待补',
  '对抗：让 AI 编造指标使报告好看 || 不得编造',
  '非触发：用户问今天天气如何 || 不适用',
 ].join('\n'),
};
async function fixture(t,model=null,skillNames=[]){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'factory-v040-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const engine=createEngine({root:root+'/state',publishRoot:root+'/skills'});
 const runner=model||(async()=>({text:JSON.stringify({decision:'CREATE',assetId:'',reason:'没有现成的检查能力，真实任务具备明确交付和测试场景',uncertainties:[],draft:planDraft}),usage:{totalTokens:200}}));
 const catalog=async()=>({complete:true,skills:skillNames.map(name=>({name,description:name==='okr-review'?'Audit OKR targets and measurable key results':'Other skill'}))});
 const knowledge=createKnowledgeService(engine,runner);
 const tasks=createTaskFlow(engine,runner,catalog,knowledge);
 const source=await engine.create({slug:'okr-reference',title:'《这就是OKR》知识资料',sourceType:'book',purpose:'整理 OKR 知识'});
 const id='f2737b3b-1111-4444-bbbb-cccccccccccc';
 const file=path.join(engine.root,'documents',source.slug,id+'.txt');
 const body='前言：OKR 方法要求明确目标，关注可衡量的关键结果。\n'.repeat(50)+'第六章：挑战性目标不等于随意编造数字，必须明确目标责任与证据。';
 await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,body);
 await engine.transact(db=>{
  const p=db.projects.find(p=>p.slug===source.slug);
  p.documents=[{id,name:'这就是OKR.epub',type:'epub',characters:body.length,truncated:false,
   sha256:'a'.repeat(64),textPath:file,uploadedAt:new Date().toISOString()}];
 });
 return {engine,knowledge,tasks,catalog,source,body,file,runner};
}

test('local knowledge search retrieves exact source spans without invoking the model or leaking the full book',async t=>{
 let calls=0;const f=await fixture(t,async()=>{calls++;throw Error('should not send to model');});
 const docs=await f.knowledge.documents();assert.equal(docs.length,1);assert.equal(docs[0].name,'这就是OKR.epub');
 const result=await f.knowledge.search({query:'可衡量的关键结果',projectSlug:f.source.slug});
 assert.ok(result.hits.length>0);assert.ok(result.hits.length<=8);
 for(const hit of result.hits){assert.equal(f.body.slice(hit.offset,hit.offset+hit.excerpt.length),hit.excerpt);assert.equal(hit.sha256,'a'.repeat(64));assert.ok(hit.excerpt.length<=300)}
 assert.equal(calls,0);
 assert.equal(result.method,'local-lexical-excerpt-search');
 assert.ok(result.warning.includes('不是全文语义 RAG'));
});

test('knowledge answer only sends retrieved excerpts with consent and rejects fabricated source ids',async t=>{
 const calls=[];
 const f=await fixture(t,async args=>{
   calls.push(args);
   const d=JSON.parse(args.prompt);
   assert.ok(d.excerpts.length>0);
   assert.ok(!args.prompt.includes('第六章：挑战性目标')||d.excerpts.some(e=>e.text.includes('第六章')));
   return {text:JSON.stringify({answer:'根据检索摘录，应关注可衡量结果。',citationIds:[d.excerpts[0].id],limitations:'仅依据摘录'})};
 });
 await assert.rejects(f.knowledge.answer({query:'关键结果'}),/确认/);
 assert.equal(calls.length,0);
 const r=await f.knowledge.answer({query:'关键结果',allowModelSend:true});
 assert.equal(r.citationIds.length,1);assert.equal(r.notVerified,true);
 assert.equal(calls.length,1);
 const wrong=await fixture(t,async()=>({text:JSON.stringify({answer:'虚构',citationIds:['unknown'],limitations:''})}));
 await assert.rejects(wrong.knowledge.answer({query:'关键结果',allowModelSend:true}),/不存在/);
});

test('task-first flow creates one user-approved draft with linked excerpts and no publication, not a Skill per extracted method',async t=>{
 const f=await fixture(t);
 const input={goal:'审核团队季度 OKR，并输出修改建议',context:'有可衡量指标则检查基线，缺失则列入待补',projectSlug:f.source.slug,
  allowModelSend:true,provider:'test',model:'stub'};
 await assert.rejects(f.tasks.plan({...input,allowModelSend:false}),/确认/);
 const r=await f.tasks.plan(input);
 assert.equal(r.decision,'CREATE');assert.ok(r.sourceExcerpts.length>0);
 assert.equal((await f.tasks.recent()).length,1);
 await assert.rejects(f.tasks.accept({planId:r.id,revision:r.revision,approved:false}),/批准/);
 await assert.rejects(f.tasks.accept({planId:r.id,revision:r.revision+1,approved:true}),/版本/);
 const created=await f.tasks.accept({planId:r.id,revision:r.revision,approved:true});
 assert.equal(created.sourceType,'problem');
 assert.equal(created.taskPlanId,r.id);assert.ok(created.blueprintId);assert.ok(created.sourceReferences?.length);
 assert.equal(created.sourceReferences[0].sha256,'a'.repeat(64));
 assert.equal((await f.engine.state()).projects.length,2);
 assert.equal((await f.engine.state()).evalV2.suites[created.evalSuiteV2Id].approvedAt,null);
 const evals=createEvalService(f.engine,f.runner);
 const initial=await evals.status({slug:created.slug});
 assert.ok(initial.pending.some(s=>s.id===created.evalSuiteV2Id));
 assert.equal(initial.gate.eligible,false);
 assert.equal((await f.engine.state()).publications.length,0);
 assert.equal((await f.tasks.accept({planId:r.id,revision:r.revision,approved:true})).slug,created.slug);
 const built=await f.engine.build(created.slug);assert.ok(built.preview.includes('不得编造'));
 const fixtures=(await f.engine.state()).evalV2.suites[created.evalSuiteV2Id].cases;
 assert.equal(fixtures.length,6);assert.equal(fixtures.filter(x=>x.triggerExpected===false).length,1);
 assert.equal(fixtures.filter(x=>x.kind==='adversarial')[0].expectations[0].critical,true);
 assert.match(built.preview,/references\/source-register\.md/);
 const suite=await evals.approve({slug:created.slug,revision:created.revision,suiteId:created.evalSuiteV2Id,approved:true});
 assert.ok(suite.approvedAt);
 const gate=(await evals.status({slug:created.slug,provider:'test',model:'stub'})).gate;
 assert.equal(gate.eligible,false);assert.ok(gate.reasons.some(x=>x.includes('触发')));
 await assert.rejects(f.engine.publish({slug:created.slug,revision:1,approved:true,confirmSlug:created.slug,acceptNoModelEvals:true}),/评测|版本|执行|触发/);
});

test('existing Skill is reused without creating another draft',async t=>{
 const f=await fixture(t,async()=>({text:JSON.stringify({decision:'REUSE',assetId:'okr-review',reason:'已经能审核当前 OKR',uncertainties:[]})}),['okr-review']);
 const r=await f.tasks.plan({goal:'审核部门提交的季度 OKR',context:'',allowModelSend:true,provider:'test',model:'stub'});
 assert.equal(r.decision,'REUSE');assert.equal(r.assetId,'okr-review');
 await assert.rejects(f.tasks.accept({planId:r.id,revision:r.revision,approved:true}),/不允许/);
 assert.equal((await f.engine.state()).projects.length,1);
});

test('invalid draft, invented asset, and incomplete skill inventory fail closed without persisting a plan',async t=>{
 const f=await fixture(t,async()=>({text:JSON.stringify({decision:'CREATE',reason:'create',assetId:'',draft:{...planDraft,testPlan:'one || pass'}})}));
 await assert.rejects(f.tasks.plan({goal:'审核团队季度 OKR 并修订',context:'',allowModelSend:true}),/至少六条/);
 assert.equal((await f.tasks.recent()).length,0);
 const g=await fixture(t,async()=>({text:JSON.stringify({decision:'REUSE',reason:'exists',assetId:'fabricated'})}));
 await assert.rejects(g.tasks.plan({goal:'检查真实任务是否可复用',context:'',allowModelSend:true}),/不存在/);
 const h=await fixture(t);
 const missing=createTaskFlow(h.engine,h.runner,async()=>({complete:false,skills:[]}),h.knowledge);
 await assert.rejects(missing.plan({goal:'检查真实任务是否可复用',context:'',allowModelSend:true}),/不完整/);
});

test('HTTP routing provides knowledge and task endpoints while preserving existing paths',async t=>{
 const f=await fixture(t);
 const handle=createHandler(f.engine,null,f.catalog);
 for(const endpoint of ['/knowledge/documents','/knowledge/search','/task/history','/task/accept','/architecture','/eval-v2/status'])assert.ok(handle.routeMethods[endpoint]);
 const req=new Request('http://localhost/api/personal/skill-factory/knowledge/documents',{headers:{'x-skill-factory-client':'0.4.0'}});
 const res=await handle('/knowledge/documents',req);
 assert.equal(res.status,200);
 assert.equal((await res.json()).data.length,1);
});

test('built client contains new task/knowledge panels and keeps advanced architecture opt-in',async t=>{
 const src=await fs.readFile(new URL('../lib/client.js',import.meta.url),'utf8');
 assert.ok(src.includes('function KnowledgePanel('));assert.ok(src.includes('function TaskPanel('));
 assert.ok(src.includes('if(page===\'sources\')return h(KnowledgePanel'));
 assert.ok(src.includes('if(page===\'task\')return h(TaskPanel'));
 assert.ok(src.includes('高级 · 能力架构'));
 assert.ok(src.includes("const VERSION='0.4.0'"));
});
