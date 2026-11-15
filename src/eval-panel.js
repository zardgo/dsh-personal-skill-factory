function EvaluationV2({project,call,waitForJob,modelChoice,consent,picker,onChanged}) {
  const [state,setState]=React.useState(null),[draft,setDraft]=React.useState(''),[reason,setReason]=React.useState('');
  const [picked,setPicked]=React.useState(''),[session,setSession]=React.useState(''),[workspace,setWorkspace]=React.useState(null);
  const [busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState('');
  const [optimizer,setOptimizer]=React.useState(null),[intent,setIntent]=React.useState('quality');
  const lock=React.useRef(false);
  const model=modelChoice?JSON.parse(modelChoice):{};
  const args={slug:project.slug,revision:project.revision,...model};
  async function refresh(){
    const [latest,candidates]=await Promise.all([call('/eval-v2/status',args),call('/optimizer/status?slug='+encodeURIComponent(project.slug))]);
    setState(latest);setOptimizer(candidates);
    setWorkspace(latest.workspaces?.at(-1)||null);
  }
  React.useEffect(()=>{refresh().catch(e=>setNotice(e.message));},[project.slug,project.revision,modelChoice]);
  async function action(fn){
    if(lock.current)return;
    lock.current=true;setBusy(true);setNotice('处理中，结果将自动保存…');
    try {await fn();await refresh();setNotice('已保存');}
    catch(e){setNotice(e.message);}
    finally{setBusy(false);lock.current=false;}
  }
  function edit(){
    const source=state.suite||state.original;
    setDraft(JSON.stringify(source.cases.map(c=>({...c,materials:c.materials||[],triggerExpected:c.kind!=='non-trigger',
      expectations:c.expectations.map((x,i)=>typeof x==='string'?{id:'assertion-'+(i+1),rule:x,critical:false,requiredMaterialIds:[]}:x)})),null,2));
  }
  return h('section',null,h('h3',null,'版本化质量评测'),picker,
    state?h('pre',{className:'sf-code'},JSON.stringify(state.gate,null,2)):null,
    btn('编辑新评测集',edit,'mini',busy||!state),
    draft?h(React.Fragment,null,h(Field,{label:'评测集 JSON',value:draft,onChange:setDraft,multiline:true,rows:12}),h(Field,{label:'变更理由',value:reason,onChange:setReason}),
      btn('保存待审评测集',()=>action(()=>call('/eval-v2/propose',{...args,cases:JSON.parse(draft),reason})),'mini',busy||!reason.trim())):null,
    ...(state?.pending||[]).map(s=>h('details',{key:s.id},h('summary',null,'待审评测集 '+s.id),h('pre',{className:'sf-code'},JSON.stringify(s,null,2)),
      btn('明确批准这份评测集',()=>{if(confirm('批准这个新版本的材料与断言？'))action(()=>call('/eval-v2/approve',{...args,suiteId:s.id,approved:true}));},'primary',busy))),
    state?.suite?h(React.Fragment,null,
      h('div',{className:'sf-field'},h('select',{value:picked,onChange:e=>setPicked(e.target.value)},h('option',{value:''},'选择用例'),...state.suite.cases.map(c=>h('option',{value:c.id,key:c.id},c.id+' · '+c.kind)))),
      btn('执行所选 A/B 评测',()=>action(async()=>{const j=await call('/job-start',{...args,operation:'eval-v2-execution',caseId:picked,allowModelSend:true});await waitForJob(j.id)}),'primary',busy||!picked||!consent||!modelChoice),
      btn('运行整套 Execution Evals',()=>action(async()=>{const j=await call('/job-start',{...args,operation:'eval-v2-suite',allowModelSend:true});await waitForJob(j.id,3600000); }),'mini',busy||!consent||!modelChoice),
      btn('准备隔离触发工作区',()=>action(async()=>setWorkspace(await call('/eval-v2/stage',args))),'mini',busy),
      workspace?h('pre',{className:'sf-code'},JSON.stringify({workspace:workspace.cwd,prompt:workspace.prompts.find(x=>x.id===picked)?.prompt},null,2)):null,
      workspace?h(React.Fragment,null,h(Field,{label:'DSH 新会话 ID',value:session,onChange:setSession}),
        btn('核验真实触发日志',()=>action(()=>call('/eval-v2/trigger',{...args,workspaceId:workspace.id,caseId:picked,sessionId:session})),'mini',busy||!picked||!session||!modelChoice)):null,
      h('h3',{className:'sf-section-title'},'自动修复实验（人工审核后应用）'),
      h('p',{className:'sf-note'},'吸收「生成候选 → 使用冻结用例试跑 → 比较 → 人工批准」的迭代方式。试跑基线是当前 Skill，而非裸模型。每次最多试跑 3 例；通过试跑也不代表已完成全套 Evals。'),
      h('div',{className:'sf-toolbar'},
        h('select',{'aria-label':'优化目标',value:intent,onChange:e=>setIntent(e.target.value)},
          h('option',{value:'quality'},'修复真实失败'),h('option',{value:'efficiency'},'减少无效指令与上下文')),
        btn('AI 生成修复候选',()=>action(async()=>{
          const j=await call('/job-start',{...args,operation:'optimizer-propose',intent,allowModelSend:true});
          await waitForJob(j.id,600000);
        }),'mini',busy||!consent||!modelChoice)),
      ...(optimizer?.proposals||[]).slice(0,5).map(candidate=>h('details',{key:candidate.id},
        h('summary',null,candidate.status+' · '+candidate.intent+' · '+candidate.id.slice(0,8)),
        h('p',{className:'sf-note'},'候选仅保存在本地，未更改 Skill 草稿 / 已发布版本。'+(candidate.issues?.length?' 问题：'+candidate.issues.join('、'):'')),
        h('pre',{className:'sf-code'},JSON.stringify({draft:candidate.draft,attempts:candidate.attempts?.map(x=>({attempt:x.attempt,success:x.success,usage:x.usage,code:x.code}))},null,2)),
        h('div',{className:'sf-toolbar'},
          btn('用 3 条冻结正例试跑',()=>action(async()=>{
            const caseIds=state.suite.cases.filter(c=>c.triggerExpected).slice(0,3).map(c=>c.id);
            const j=await call('/job-start',{...args,operation:'optimizer-trial',proposalId:candidate.id,caseIds,allowModelSend:true});
            await waitForJob(j.id,3600000);
          }),'mini',busy||candidate.status!=='ready'||!consent||!modelChoice||candidate.appliedAt),
          btn('人工确认应用为新草稿',()=>action(async()=>{
            if(!confirm('确定应用此修复候选吗？这会创建新 revision、使旧构建及全套 Evals 失效；不会自动发布。'))return;
            await call('/optimizer/apply',{...args,proposalId:candidate.id,approved:true,confirmSlug:project.slug});
            await onChanged?.();
          }),'primary mini',busy||candidate.appliedAt||!(optimizer?.trials||[]).some(t=>t.proposalId===candidate.id&&t.status==='PASS'))))),
      (optimizer?.trials||[]).length?h('details',null,h('summary',null,'候选试跑历史 '+optimizer.trials.length),
        h('pre',{className:'sf-code'},JSON.stringify(optimizer.trials,null,2))):null,
      h('details',null,h('summary',null,'已保存运行 '+state.runs.length),h('pre',{className:'sf-code'},JSON.stringify(state.runs.map(r=>({case:r.caseId,status:r.status,mode:r.mode,criticalRisks:r.judge?.risks?.filter(x=>x.skill?.verdict!=='PASS'),failures:r.failures})),null,2)))):null,
    notice?h('p',{role:'status'},notice):null);
}
