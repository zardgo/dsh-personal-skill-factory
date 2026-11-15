import { protocol } from './evals.mjs';

function totals(rows,arm){
  const actual=rows.flatMap(row=>row.experiment?.[arm]?[row.experiment[arm]]:[]);
  const usage=actual.map(call=>call.response?.usage?.totalTokens).filter(Number.isFinite);
  return {calls:actual.length,tokenReports:usage.length,tokens:usage.length?usage.reduce((a,b)=>a+b,0):null,
    durationMs:actual.reduce((sum,call)=>sum+call.durationMs,0)};
}
function stats(rows,arm){
  const criteria=rows.flatMap(row=>row.judge?.criteria||[]);
  return {assertions:criteria.length,passes:criteria.filter(c=>c[arm].verdict==='PASS').length,
    unknown:criteria.filter(c=>c[arm].verdict==='NEEDS_REVIEW').length,
    taskPasses:rows.filter(row=>row.judge?.criteria.length&&row.judge.criteria.every(c=>c[arm].verdict==='PASS')).length};
}

export function qualityGate({suite,version,executions,triggers}) {
  const matching=row=>row.versionId===version.id&&row.suiteId===suite.id&&row.protocol===protocol;
  const execById=new Map(executions.filter(matching).map(r=>[r.caseId,r]));
  const triggerById=new Map(triggers.filter(matching).map(r=>[r.caseId,r]));
  const pos=suite.cases.filter(c=>c.triggerExpected===true);
  const execution=pos.map(c=>execById.get(c.id)).filter(Boolean);
  const trigger=suite.cases.map(c=>triggerById.get(c.id)).filter(Boolean);
  const baseline=stats(execution,'baseline'),skill=stats(execution,'skill');
  const reasons=[];
  if(!suite.approvedAt||!suite.cases.some(c=>c.triggerExpected===false)||!pos.length)reasons.push('需要已审批并有正、负触发覆盖的用例版本');
  if(execution.length!==pos.length||execution.some(r=>r.status!=='PASS'))reasons.push('执行评测存在缺失、失败或待复核');
  if(trigger.length!==suite.cases.length||trigger.some(r=>r.status!=='PASS'||r.discovered!==true||typeof r.traceHash!=='string'))reasons.push('真实 DSH 触发证据存在缺失、失败或待复核');
  if(!execution.some(r=>r.judge?.criteria.some(c=>c.assertion.critical)))reasons.push('需要至少一条已执行的关键安全断言');
  if(execution.some(r=>r.judge?.criteria.some(c=>c.assertion.critical&&c.skill.verdict!=='PASS')))reasons.push('关键安全断言未通过');
  if(skill.passes<=baseline.passes)reasons.push('未证明相对基线有任务质量增益');
  return {eligible:!reasons.length,reasons,baseline,skill,trigger:{correct:trigger.filter(r=>r.status==='PASS').length,total:suite.cases.length},
    costs:{baseline:totals(execution,'baseline'),skill:totals(execution,'skill')},expectedExecutionCases:pos.length};
}
