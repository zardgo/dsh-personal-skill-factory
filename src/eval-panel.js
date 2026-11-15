function EvaluationV2({project,call,waitForJob,modelChoice,consent,picker}) {
  const [state,setState]=React.useState(null),[draft,setDraft]=React.useState(''),[reason,setReason]=React.useState('');
  const [picked,setPicked]=React.useState(''),[session,setSession]=React.useState(''),[workspace,setWorkspace]=React.useState(null);
  const [busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState('');
  const lock=React.useRef(false);
  const model=modelChoice?JSON.parse(modelChoice):{};
  const args={slug:project.slug,revision:project.revision,...model};
  async function refresh(){setState(await call('/eval-v2/status',args));}
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
      h('details',null,h('summary',null,'已保存运行 '+state.runs.length),h('pre',{className:'sf-code'},JSON.stringify(state.runs.map(r=>({case:r.caseId,status:r.status,mode:r.mode,failures:r.failures})),null,2)))):null,
    notice?h('p',{role:'status'},notice):null);
}
