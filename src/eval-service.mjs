import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { architecture,error,hash,timestamp } from './architecture-store.mjs';
import { evaluateCase,protocol,validateCase,businessPrompt } from './evals.mjs';
import { stageTriggerWorkspace,readTriggerSession,assessTrigger } from './eval-trigger.mjs';
import { qualityGate } from './eval-quality.mjs';

const book=db=>db.evalV2??={suites:{},runs:[],workspaces:{}};
const slugPattern=/^[a-z][a-z0-9-]{2,55}$/;
export function attachedSuite(db,project){return book(db).suites[project.evalSuiteV2Id];}

export function gateFor(db,project,provider,model) {
  const versionId=project.build?.skillVersionId,suite=attachedSuite(db,project);
  if(!suite||!versionId)return {eligible:false,reasons:['缺少经审批的版本化评测套件或 Skill 构建']};
  const relevant=book(db).runs.filter(r=>r.slug===project.slug&&r.provider===provider&&r.model===model);
  return qualityGate({suite,version:{id:versionId},executions:relevant.filter(r=>r.mode==='execution'),triggers:relevant.filter(r=>r.mode==='trigger')});
}

export function createEvalService(engine,run,{sessionsRoot=path.join(os.homedir(),'.dsh','sessions')}={}) {
  async function context(input,{approval=true,build=true}={}) {
    const db=await engine.state();
    const p=db.projects.find(p=>p.slug===input.slug&&p.blueprintId);
    if(!p||!slugPattern.test(p.slug))throw error('未找到蓝图 Skill',404);
    const a=architecture(db),blueprint=a.blueprints[p.blueprintId];
    if(blueprint?.status!=='approved')throw error('蓝图未批准',409);
    const suite=attachedSuite(db,p);
    if(approval&&!suite?.approvedAt)throw error('需要审批后的评测套件版本',409);
    const version=a.skillVersions[p.build?.skillVersionId];
    if(build&&(!version||p.build?.revision!==p.revision))throw error('请先构建待测版本',409);
    return {db,p,blueprint,suite,version};
  }
  async function propose(input){
    const {p,db,blueprint,suite}=await context(input,{approval:false,build:false});
    if(p.revision!==input.revision)throw error('项目已更新，请重新加载',409);
    const parent=suite||architecture(db).evalSuites[blueprint.evalSuiteId];
    if(!Array.isArray(input.cases)||input.cases.length!==parent.cases.length||input.cases.length>16||
      typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>3000)throw error('新版本须覆盖原套件全部案例并注明理由');
    const cases=parent.cases.map(original=>{
      const replacements=input.cases.filter(c=>c.id===original.id);
      if(replacements.length!==1)throw error('原案例标识须恰好出现一次');
      const revised=replacements[0];
      const copy={...revised,id:original.id,kind:original.kind};
      if(validateCase(copy).status!=='VALID')throw error('用例结构或材料依赖无效：'+copy.id);
      if(copy.triggerExpected!==(original.kind!=='non-trigger'))throw error('禁止改变原触发方向：'+copy.id);
      if(copy.expectations.length!==original.expectations.length||copy.expectations.some((a,i)=>a.rule!==(original.expectations[i].rule??original.expectations[i])||
        (original.expectations[i].critical&&!a.critical)))throw error('不得改变冻结断言或降低关键断言级别：'+copy.id);
      return copy;
    });
    const id='eval-suite-'+hash([p.slug,parent.id,input.reason,cases]).slice(0,32);
    return engine.transact(state=>{
      const latest=state.projects.find(x=>x.slug===p.slug);
      if(latest?.revision!==p.revision||latest.evalSuiteV2Id!==p.evalSuiteV2Id)throw error('项目已变化',409);
      return book(state).suites[id]??={id,slug:p.slug,blueprintId:p.blueprintId,parentId:parent.id,reason:input.reason,cases,createdAt:timestamp(),approvedAt:null};
    });
  }
  async function approve(input){
    if(input.approved!==true)throw error('需要明确人工批准新评测集',403);
    return engine.transact(db=>{
      const p=db.projects.find(x=>x.slug===input.slug),suite=book(db).suites[input.suiteId];
      if(!p||!suite||suite.slug!==p.slug||suite.blueprintId!==p.blueprintId||p.revision!==input.revision)
        throw error('评测集或项目版本不匹配',409);
      const parentId=p.evalSuiteV2Id||architecture(db).blueprints[p.blueprintId]?.evalSuiteId;
      if(suite.parentId!==parentId)throw error('套件基线已变更',409);
      suite.approvedAt??=timestamp();
      p.evalSuiteV2Id=suite.id;
      return suite;
    });
  }
  async function readBody(p,version){
    const verified=await engine.verifiedBuild(p.slug);
    if(verified.build.skillVersionId!==version.id)throw error('构建已变化',409);
    return verified.body;
  }
  async function suiteExecution(input){
    const {suite,version,db}=await context(input);
    const attempts=new Map(book(db).runs.filter(r=>r.suiteId===suite.id&&r.versionId===version.id&&r.mode==='execution'&&r.provider===input.provider&&r.model===input.model).map(r=>[r.caseId,r]));
    const rows=[];
    for(const test of suite.cases){
      const current=await context(input);
      if(current.suite.id!==suite.id||current.version.id!==version.id)throw error('套件已变化，批次停止',409);
      const prior=attempts.get(test.id);
      rows.push(prior&&prior.status!=='NEEDS_REVIEW'?prior:await execution({...input,caseId:test.id}));
    }
    return rows.map(({caseId,status,id})=>({caseId,status,id}));
  }
  async function execution(input){
    if(!run||input.allowModelSend!==true)throw error('需要 DSH 模型与发送确认',403);
    const {p,blueprint,suite,version}=await context(input);
    const test=suite.cases.find(c=>c.id===input.caseId);
    if(!test)throw error('找不到用例',404);
    const skillBody=await readBody(p,version);
    const config={provider:input.provider,model:input.model,maxTokens:3000};
    const row=await evaluateCase(run,{test,blueprint,config,version,baselineBody:blueprint.baseline?.body,skillBody});
    return persist(p,suite,version,config,row);
  }
  async function persist(p,suite,version,config,row){
    return engine.transact(db=>{
      const latest=db.projects.find(x=>x.slug===p.slug);
      if(latest?.build?.skillVersionId!==version.id||latest.evalSuiteV2Id!==suite.id)throw error('评测期间 Skill 版本或套件已变化',409);
      const result={...row,id:randomUUID(),versionId:version.id,suiteId:suite.id,slug:p.slug,protocol,...config,createdAt:timestamp()};
      book(db).runs.push(result);
      return result;
    });
  }
  async function stage(input){
    const {p,suite,version,blueprint}=await context(input);
    const body=(await readBody(p,version)).trimEnd();
    const workspace=await stageTriggerWorkspace(path.join(engine.root,'eval-workspaces'),p.slug,{...version,bodyHash:hash(body)},body);
    await engine.transact(db=>{book(db).workspaces[workspace.id]={...workspace,suiteId:suite.id,blueprintId:blueprint.id};});
    return {...workspace,prompts:suite.cases.map(test=>({id:test.id,prompt:businessPrompt(test)}))};
  }
  async function trigger(input){
    const {p,suite,version,db}=await context(input);
    const test=suite.cases.find(c=>c.id===input.caseId);
    const workspace=book(db).workspaces[input.workspaceId];
    if(!test||!workspace||workspace.versionId!==version.id||workspace.suiteId!==suite.id)throw error('隔离工作区、用例或技能版本不匹配',409);
    const skillFile=path.join(workspace.cwd,'.dsh','skills',p.slug,'SKILL.md');
    if(await fs.realpath(skillFile)!==skillFile||hash(await fs.readFile(skillFile,'utf8'))!==workspace.bodyHash)throw error('隔离工作区中的技能已变化',409);
    const session=await readTriggerSession(sessionsRoot,input.sessionId);
    const config={model:input.model,provider:input.provider};
    const row=assessTrigger({test,workspace,session,config});
    return persist(p,suite,version,config,row);
  }
  async function status(input){
    const {db,p,blueprint,suite}=await context(input,{approval:false,build:false});
    const original=architecture(db).evalSuites[blueprint.evalSuiteId];
    const history=book(db).runs.filter(r=>r.slug===p.slug);
    return {original,suite,pending:Object.values(book(db).suites).filter(s=>s.slug===p.slug&&!s.approvedAt),
      runs:history,gate:gateFor(db,p,input.provider,input.model)};
  }
  return {propose,approve,execution,suiteExecution,stage,trigger,status};
}
