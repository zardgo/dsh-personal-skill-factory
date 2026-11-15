import { createEvalService } from './eval-service.mjs';
import { createArchitect } from './architect.mjs';
import { createBlueprintGenerator } from './blueprint-generator.mjs';
import { createEngine } from './engine.mjs';
import { oneShot, availableModels } from './model.mjs';
import { VERSION } from './version.mjs';
import crypto from 'node:crypto';

export const name = 'skill-factory';
// Only connection is mandatory so a missing model provider doesn't prevent loading the UI.
export const inject = ['connection'];
export const API_PREFIX = '/api/personal/skill-factory';
const HEADER = 'x-skill-factory-client';
const LIMIT = 18*1024*1024;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function json(status,body){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function denyCrossOrigin(req){const origin=req.headers.get('origin');if(!origin)return null;try{const u=new URL(origin),host=req.headers.get('host')||new URL(req.url).host;if(u.host!==host)return '跨站请求被拒绝'}catch{return 'Origin 无效'}return null}
async function input(req){const origin=denyCrossOrigin(req);if(origin)throw fail(origin,403);if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))throw fail('请求类型必须为 JSON',415);const length=Number(req.headers.get('content-length')||0);if(length>LIMIT)throw fail('请求体超过大小限制',413);const body=await req.text();if(Buffer.byteLength(body)>LIMIT)throw fail('提交内容过大',413);let data;try{data=JSON.parse(body)}catch{throw fail('JSON 无效')};if(!data||Array.isArray(data)||typeof data!=='object')throw fail('请求结构无效');return data}
export function createHandler(engine=createEngine(),modelContext=null,skillCatalog=null){
 // Slow LLM operations must not keep an HTTP request open until a proxy times out.
 // Job results remain in the existing durable engine state; this Map only holds
 // active operation handles and transient diagnostics until the next host restart.
 const jobs=new Map();
 const byKey=new Map();
 const jobTTL=2*60*60*1000;
 function pruneJobs(){
  const cutoff=Date.now()-jobTTL;
  for(const [id,job] of jobs){
   if(job.finishedMs&&job.finishedMs<cutoff){jobs.delete(id);if(byKey.get(job.key)===id)byKey.delete(job.key)}
  }
 }
 const runner=modelContext?x=>oneShot(modelContext,x):null;
 const catalog=async cwd=>skillCatalog?.(cwd)??{complete:false,skills:[]};
 const architect=createArchitect(engine,runner,catalog);
 const generate=createBlueprintGenerator(engine,runner);
 const evals=createEvalService(engine,runner);
 const operations={
  'eval-v2-execution':x=>evals.execution(x),
  'eval-v2-suite':x=>evals.suiteExecution(x),
  'architect-plan':x=>architect.plan(x),
  'architect-prepare':x=>architect.prepare(x),
  'architect-generate':x=>generate(x),
  analyze:x=>engine.analyze(x),
  synthesize:x=>engine.synthesize(x),
  'synthesis-finalize':x=>engine.finalizeSynthesis(x),
  propose:x=>engine.propose(x),
  'model-eval':x=>engine.evaluate(x),
 };
 function startJob(input){
  pruneJobs();
  const {operation,slug,documentId,requestId}=input;
  if(!Object.hasOwn(operations,operation))throw fail('不支持的后台任务',422);
  if(input.allowModelSend!==true)throw fail('开始模型任务之前必须确认发送所选内容',403);
  if(typeof slug!=='string'||!slug)throw fail('缺少项目标识',422);
  if(operation!=='model-eval'&&!operation.startsWith('architect-')&&!operation.startsWith('eval-v2-')&&(typeof documentId!=='string'||!documentId))throw fail('缺少文档标识',422);
  const key=JSON.stringify([operation,slug,documentId||null]);
  const signature=JSON.stringify([input.provider,input.model,input.revision,input.startChunk,input.startCase,input.groupId,input.chunkIndex,input.methodName,input.regenerate,input.planId,input.blueprintId,input.sourceIds,input.edits,input.cwd,input.caseId]);
  const existing=jobs.get(byKey.get(key));
  if(existing){
   if(existing.signature!==signature)throw fail('同项目有另一项同类任务在运行，请等待其保存结果',409);
   return {id:existing.id,status:existing.status,reused:true};
  }
  const job={id:crypto.randomUUID(),requestId,key,signature,operation,status:'queued',startedAt:new Date().toISOString(),finishedMs:null,error:null};
  jobs.set(job.id,job);byKey.set(key,job.id);
  Promise.resolve().then(async()=>{
   job.status='running';
   try{
    const result=await operations[operation](input);
    if(operation==='propose'||operation.startsWith('architect-')||operation.startsWith('eval-v2-'))job.result=result;
    job.status='completed';
   }catch(err){
    job.status='failed';
    job.error=String(err?.message||err).slice(0,1000);
    job.errorCode=err?.code||'JOB_ERROR';
   }finally{
    job.finishedMs=Date.now();
    if(byKey.get(key)===job.id)byKey.delete(key);
   }
  });
  return {id:job.id,status:job.status,reused:false};
 }
 function jobStatus(input){
  pruneJobs();
  const job=jobs.get(input.id);
  if(!job)throw fail('任务句柄未找到；若 DSH 已重启，请刷新以读取已保存的进度或候选草稿',404);
  const {key,signature,finishedMs,...result}=job;
  return result;
 }
 const routes={
  '/eval-v2/status':['POST',x=>evals.status(x)],
  '/eval-v2/propose':['POST',x=>evals.propose(x)],
  '/eval-v2/approve':['POST',x=>evals.approve(x)],
  '/eval-v2/stage':['POST',x=>evals.stage(x)],
  '/eval-v2/trigger':['POST',x=>evals.trigger(x)],
  '/architecture':['GET',()=>architect.snapshot()],
  '/architecture/migrate':['POST',()=>architect.migrate()],
  '/architecture/ingest':['POST',x=>architect.ingest(x)],
  '/architecture/inventory':['POST',x=>architect.inventory(x.cwd)],
  '/architecture/approve':['POST',x=>architect.approve(x)],
  '/state':['GET',()=>engine.state()],'/create':['POST',x=>engine.create(x)],'/save':['POST',x=>engine.save(x)],'/lint':['POST',x=>engine.lint(x.slug)],'/build':['POST',x=>engine.build(x.slug)],'/publish':['POST',x=>engine.publish(x)],'/rollback':['POST',x=>engine.rollback(x)],
  '/upload':['POST',x=>engine.upload(x)],'/analysis-reset':['POST',x=>engine.resetAnalysis(x)],'/analyze':['POST',x=>engine.analyze(x)],'/synthesize':['POST',x=>engine.synthesize(x)],'/synthesis-finalize':['POST',x=>engine.finalizeSynthesis(x)],'/propose':['POST',x=>startJob({...x,operation:'propose'})],'/model-eval':['POST',x=>engine.evaluate(x)],'/repair-proposal':['POST',x=>engine.repair(x)],
  '/job-start':['POST',startJob],'/job-status':['GET',jobStatus],'/eval-progress':['GET',x=>engine.evaluationProgress(x)],'/fork':['POST',x=>engine.fork(x)],
  '/proposals':['GET',x=>engine.proposalRecords(x.slug,x.documentId)],
  '/models':['GET',()=>availableModels(modelContext)],
  '/info':['GET',()=>({storageRoot:engine.root,publishRoot:engine.publishRoot,version:VERSION,capabilities:{backgroundSynthesis:true,backgroundEvals:true,jobPolling:true,derivedSkills:true,revisionGuard:true},modelEvaluation:'dsh-native-when-configured',uploads:['pdf','epub','docx','txt','md'],environment:'DSH Host'})],
 };
 const handle=async function(path,req){
  const requestId=crypto.randomUUID();const route=routes[path];
  if(!route)return json(404,{ok:false,error:'路由不存在',requestId});
  if(route[0]!==req.method)return json(405,{ok:false,error:'不允许的请求方法',requestId});
  try{
    if(path!=='/info' && req.headers.get(HEADER)!==VERSION)throw fail('客户端与 Host 版本不一致。Host '+VERSION+'，请完全退出 DSH 后重开',428);
    const q=new URL(req.url).searchParams;
    const args=req.method==='POST'?await input(req):path==='/job-status'?{id:q.get('id')}:path==='/eval-progress'?{slug:q.get('slug'),provider:q.get('provider'),model:q.get('model')}:path==='/proposals'?{slug:q.get('slug'),documentId:q.get('documentId')}:{};
    if(['/save','/fork','/publish','/rollback'].includes(path)&&!Number.isInteger(args.revision))throw fail('缺少项目 revision：为防止旧页面覆盖数据，请刷新后再保存',428);
    const data=await route[1]({...args,requestId});
    return json(200,{ok:true,data,requestId});
  }catch(e){const status=Number.isInteger(e?.status)?e.status:500;
    return json(status,{ok:false,error:e?.message||'服务器内部错误',requestId,issues:e?.details?.issues,errorCode:e?.code||(status===409?'CONFLICT':status===428?'PRECONDITION_REQUIRED':status>=500?'SERVER_ERROR':'REQUEST_ERROR')});
  }
 };
 // One authoritative route table: the HTTP handler and Cordis registration must never drift.
 handle.routeMethods=Object.freeze(Object.fromEntries(Object.entries(routes).map(([path,definition])=>[path,definition[0]])));
 return handle;
}
export function apply(ctx){
 const runner=opts=>oneShot(ctx,opts);
 const engine=createEngine({modelRunner:runner});
 let registry;
 ctx.inject?.(['skills'],skillContext=>{
   const current=skillContext.skills;
   registry=current;
   return ()=>{if(registry===current)registry=null;};
 });
 const handle=createHandler(engine,ctx,cwd=>{
   if(typeof registry?.snapshot!=='function')return {complete:false,skills:[]};
   return registry.snapshot({cwd,signal:AbortSignal.timeout(15000)});
 });
 ctx.effect(()=>{if(!ctx.connection?.fetch?.register){ctx.logger?.warn?.('[skill-factory] DSH connection.fetch.register 不可用');return()=>{}}
  const off=Object.entries(handle.routeMethods).map(([p,method])=>ctx.connection.fetch.register({path:API_PREFIX+p,methods:[method],requestBody:'buffered',fetch:req=>handle(p,req)}));return()=>off.forEach(f=>{try{f?.()}catch{}})
 },'skill-factory: personal API');
}
