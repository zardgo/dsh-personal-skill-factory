import { createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const key = (type, ...parts) => type + '-' + hash(parts).slice(0, 32);
export const error = (message, status = 422) => Object.assign(new Error(message), {status});
export const timestamp = () => new Date().toISOString();
export const tables = ['sources','evidence','methods','tasks','capabilities','blueprints','skillVersions','evalSuites','evalRuns','releases','plans'];
export const decisions = ['CREATE','REUSE','ENHANCE','MERGE','SPLIT','REFERENCE','REJECT'];

export function architecture(db) {
  if (!db.architecture) db.architecture = {schemaVersion:1,...Object.fromEntries(tables.map(name=>[name,{}]))};
  const store=db.architecture;
  if(store.schemaVersion!==1||tables.some(name=>!store[name]||typeof store[name]!=='object'||Array.isArray(store[name]))) {
    throw error('能力架构数据库版本或结构无效，已停止写入',409);
  }
  return store;
}

export function projectCatalog(db) {
  return db.projects.flatMap(project=>(project.documents||[]).map(doc=>{
    const progress=project.analysisProgressByDocument?.[doc.id]??
      (project.analysisProgress?.documentId===doc.id?project.analysisProgress:null);
    return {id:doc.id,slug:project.slug,title:doc.name,
      ready:Boolean(progress&&progress.nextChunk>=progress.totalChunks),truncated:Boolean(doc.truncated)};
  }));
}

export function recordBuild(db, project, build) {
  if (!project.blueprintId) return;
  const a=architecture(db);
  const blueprint=a.blueprints[project.blueprintId];
  if(!blueprint||blueprint.status!=='approved')throw error('能力蓝图审批无效',409);
  const suite=a.evalSuites[blueprint.evalSuiteId];
  if(!suite||suite.plan!==project.testPlan)throw error('当前测试要求与已批准的测试套件不一致',409);
  const id=key('version',project.slug,project.revision,build.bundleHash);
  a.skillVersions[id]??={id,slug:project.slug,revision:project.revision,blueprintId:blueprint.id,evalSuiteId:suite.id,bundleHash:build.bundleHash,createdAt:timestamp()};
  build.skillVersionId=id;
}
export function recordEval(db, project, run) {
  if(!project.blueprintId)return;
  const a=architecture(db);
  const version=a.skillVersions[run.skillVersionId];
  if(!version)throw error('评测未关联到独立技能版本',409);
  a.evalRuns[run.id]={...run,evalSuiteId:version.evalSuiteId};
}
export function recordRelease(db, project, release) {
  if(!project.blueprintId)return;
  const a=architecture(db);
  a.releases[release.id]={...release,skillVersionId:project.build.skillVersionId,blueprintId:project.blueprintId};
  for (const record of Object.values(a.releases)) {
    if(record.slug===release.slug&&record.id!==release.id)record.active=false;
  }
}
