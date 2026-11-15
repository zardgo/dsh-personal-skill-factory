function ArchitectPanel({call,waitForJob,models,onOpen}) {
  const [data,setData]=React.useState(null);
  const [busy,setBusy]=React.useState(false);
  const [message,setMessage]=React.useState('');
  const [kind,setKind]=React.useState('business-task');
  const [title,setTitle]=React.useState('');
  const [text,setText]=React.useState('');
  const [legacy,setLegacy]=React.useState('');
  const [scope,setScope]=React.useState('');
  const [selected,setSelected]=React.useState([]);
  const [planId,setPlanId]=React.useState('');
  const [choice,setChoice]=React.useState('');
  const [sent,setSent]=React.useState(false);
  const [edits,setEdits]=React.useState('');
  const [assets,setAssets]=React.useState(null);
  const [accepted,setAccepted]=React.useState(false);
  const lock=React.useRef(false);
  async function reload(){const snapshot=await call('/architecture');setData(snapshot);return snapshot;}
  React.useEffect(()=>{reload().catch(e=>setMessage(e.message));},[]);
  async function action(fn) {
    if(lock.current)return;
    lock.current=true;setBusy(true);setMessage('');
    try{await fn();await reload();}catch(e){setMessage(e.message);}
    finally{lock.current=false;setBusy(false);}
  }
  async function job(operation, args, slug) {
    if(!sent||!choice)throw Error('请先选择模型并确认发送');
    const task=await call('/job-start',{...JSON.parse(choice),...args,operation,slug,allowModelSend:true,cwd:scope.trim()||undefined});
    return (await waitForJob(task.id)).result;
  }
  const plan=data?.plans?.[planId];
  const caps=plan?.capabilityIds?.map(id=>data.capabilities[id])||[];
  const blueprints=plan?.blueprintIds?.map(id=>data.blueprints[id])||[];
  function editTemplate() {
    const draft=caps.flatMap(c=>c.decision==='SPLIT'?c.partitions.map(p=>({capabilityIds:[c.id],taskIds:p.taskIds,name:p.name,decision:'CREATE',assetIds:[],reason:''})):
      [{capabilityIds:[c.id],taskIds:c.taskIds,name:c.name,decision:c.decision,assetIds:c.assetIds,reason:c.reason}]);
    setEdits(JSON.stringify(draft,null,2));
  }
  return h('div',null,
    h('h1',{className:'sf-title'},'能力架构'),
    h('p',{className:'sf-lead'},'汇集资料与业务任务，核对可复用的 Skill，审批蓝图后生成。'),
    h('div',{className:'sf-toolbar'},
      btn('检查并登记旧版版本与发布',()=>action(async()=>{const r=await call('/architecture/migrate',{});setMessage('已登记 '+r.legacyVersions+' 个旧版构建');}),'mini',busy),
      btn('读取 DSH Skill 资产',()=>action(async()=>setAssets(await call('/architecture/inventory',{cwd:scope.trim()||undefined}))),'mini',busy)),
    h(Field,{label:'DSH 工作区绝对路径（选填，用于盘点项目 Skill）',value:scope,onChange:setScope}),
    assets?h('details',null,h('summary',null,'DSH 可发现资产 '+assets.length+' 项'),h('pre',{className:'sf-code'},assets.map(a=>a.id+' · '+(a.managed?'本工厂管理':'外部')+' · '+a.description).join('\n'))):null,
    h('h2',{className:'sf-section-title'},'知识摄入'),
    h('div',{className:'sf-field'},h('select',{value:kind,onChange:e=>setKind(e.target.value)},
      ...[['business-task','业务任务'],['knowledge','知识资料'],['sop','SOP'],['legacy','复用已分析的项目资料']].map(([id,label])=>h('option',{key:id,value:id},label)))),
    kind==='legacy'?h('select',{value:legacy,onChange:e=>setLegacy(e.target.value)},h('option',{value:''},'选择已分析资料'),
      ...(data?.legacySources||[]).filter(x=>x.ready).map(d=>h('option',{key:d.id,value:JSON.stringify({slug:d.slug,documentId:d.id})},d.title))):
      h(React.Fragment,null,h(Field,{label:'来源名称',value:title,onChange:setTitle}),h(Field,{label:'来源内容',multiline:true,value:text,onChange:setText})),
    btn('登记来源',()=>action(async()=>{
      const source=await call('/architecture/ingest',kind==='legacy'?{kind,...JSON.parse(legacy)}:{kind,title,text});
      setSelected(old=>[...new Set([...old,source.id])]);setTitle('');setText('');setMessage('来源已登记');
    }),'mini',busy||(kind==='legacy'?!legacy:!title.trim()||!text.trim())),
    h('h2',{className:'sf-section-title'},'任务发现与架构规划'),
    ...Object.values(data?.sources||{}).map(source=>h('label',{key:source.id,className:'sf-confirm'},
      h('input',{type:'checkbox',checked:selected.includes(source.id),onChange:e=>setSelected(old=>e.target.checked?[...old,source.id]:old.filter(id=>id!==source.id))}),source.title+' · '+source.kind)),
    h('div',{className:'sf-field'},h('select',{value:choice,onChange:e=>setChoice(e.target.value)},h('option',{value:''},'选择 DSH 模型'),
      ...(models.models||[]).map(m=>h('option',{key:m.provider+'/'+m.model,value:JSON.stringify({provider:m.provider,model:m.model})},m.label)))),
    h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:sent,onChange:e=>setSent(e.target.checked)}),'确认向选定模型发送所选资料和 Skill 元数据'),
    btn('发现任务并审查能力架构',()=>action(async()=>{
      const p=await job('architect-plan',{sourceIds:selected},'portfolio');
      setPlanId(p.id);setEdits('');setAccepted(false);
    }),'primary',busy||!sent||!choice||!selected.length),
    h('div',{className:'sf-field'},h('select',{value:planId,onChange:e=>{setPlanId(e.target.value);setEdits('');setAccepted(false);}},
      h('option',{value:''},'打开已保存规划'),...Object.values(data?.plans||{}).map(p=>h('option',{key:p.id,value:p.id},p.status+' · '+new Date(p.createdAt).toLocaleString())))),
    ...caps.map(c=>h('details',{key:c.id},h('summary',null,c.decision+' · '+c.name),h('p',null,c.reason),
      h('pre',{className:'sf-code'},JSON.stringify({tasks:c.taskIds.map(id=>data.tasks[id]),assets:c.assetIds,alternatives:c.alternatives,assumptions:c.assumptions,evidence:c.evidenceIds},null,2)))),
    plan?.status==='proposed'?h('div',{className:'sf-toolbar'},
      btn('编辑合并、拆分或排除',editTemplate,'mini',busy),
      btn('起草待批蓝图',()=>action(async()=>{
        await job('architect-prepare',{planId,revision:plan.revision,edits:edits?JSON.parse(edits):undefined},planId);
        setMessage('蓝图和评测用例已保存，请审阅后批准');
      }),'primary',busy||!choice||!sent)):null,
    plan?.status==='proposed'&&edits?h(Field,{label:'人工架构决策 JSON（合并引用多个候选；拆分按不同任务建子项；排除用 REJECT）',value:edits,onChange:setEdits,multiline:true,rows:14}):null,
    ...blueprints.map(b=>h(Card,{key:b.id},h('h3',null,b.title),h('p',null,b.trigger),h('details',null,h('summary',null,'审阅交付、边界、证据及冻结测试'),
      h('pre',{className:'sf-code'},JSON.stringify({exclusions:b.exclusions,deliverable:b.deliverable,boundaries:b.boundaries,sourceIds:b.sourceIds,baseline:b.baseline?.slug,cases:data.evalSuites[b.evalSuiteId].cases},null,2))),
      b.projectSlug?btn('打开 Skill 工程',()=>onOpen(b.projectSlug),'mini',busy):
        btn('生成 Skill 工程',()=>action(async()=>{const r=await job('architect-generate',{blueprintId:b.id},b.id);setMessage(r.slug?'已生成工程，请构建并运行 Evals':'模型候选需补齐，请查看诊断');}),'primary',busy||b.status!=='approved'||!sent||!choice),
      b.generation?.status==='needs-review'?h('pre',{className:'sf-code'},JSON.stringify(b.generation.issues,null,2)):null)),
    plan?.status==='pending'?h('div',null,h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:accepted,onChange:e=>setAccepted(e.target.checked)}),'已审核能力决策、蓝图和评测预期'),
      btn('批准当前架构与蓝图',()=>action(()=>call('/architecture/approve',{planId,revision:plan.revision,approved:true})),'primary',busy||!accepted)):null,
    busy?h('p',{role:'status'},'工作台处理中，已完成结果会自动保存。'):null,
    message?h('p',{role:'status'},message):null);
}
