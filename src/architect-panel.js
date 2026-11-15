function ArchitectPanel({call,waitForJob,models,onOpen,initialSourceId}) {
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
  const [overrides,setOverrides]=React.useState({});
  const [mergeIds,setMergeIds]=React.useState([]);
  const [assets,setAssets]=React.useState(null);
  const [accepted,setAccepted]=React.useState(false);
  const lock=React.useRef(false);
  async function reload(){const snapshot=await call('/architecture');setData(snapshot);return snapshot;}
  React.useEffect(()=>{reload().catch(e=>setMessage(e.message));},[]);
  React.useEffect(()=>{if(initialSourceId)setSelected(old=>[...new Set([...old,initialSourceId])]);},[initialSourceId]);
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
  const decisionsLabel={CREATE:'独立新建',REUSE:'复用现有 Skill',ENHANCE:'增强已有 Skill',MERGE:'聚合为一个 Skill',SPLIT:'拆为独立能力',REFERENCE:'仅做知识参考',REJECT:'暂不生成'};
  const actionable=new Set(['CREATE','ENHANCE','MERGE','SPLIT']);
  const chosenDecision=c=>overrides[c.id]||c.decision;
  function proposedCount(){
    let count=0;
    for(const c of caps){
      if(mergeIds.includes(c.id))continue;
      const d=chosenDecision(c);
      if(d==='SPLIT')count+=c.partitions?.length>1?c.partitions.length:c.taskIds.length;
      else if(actionable.has(d))count++;
    }
    if(mergeIds.length>=2)count++;
    return count;
  }
  function compileEdits(){
    if(!mergeIds.length&&!Object.keys(overrides).length)return undefined;
    if(mergeIds.length===1)throw Error('至少选中两项能力才能合并');
    const result=[];
    const merged=caps.filter(c=>mergeIds.includes(c.id));
    if(merged.length){
      if(merged.some(c=>!actionable.has(chosenDecision(c))))throw Error('仅可合并建议生成的任务能力；知识参考和排除项不可合并');
      result.push({capabilityIds:merged.map(c=>c.id),taskIds:[...new Set(merged.flatMap(c=>c.taskIds))],
        name:merged.map(c=>c.name).join(' / ').slice(0,150),decision:'MERGE',assetIds:[],reason:'人工审核：这些任务共享一个核心用户目标，建议先作为一个 Skill 的内部能力开发'});
    }
    for(const c of caps){
      if(mergeIds.includes(c.id))continue;
      const d=chosenDecision(c);
      if(d==='SPLIT'){
        const partitions=(c.partitions?.length>1?c.partitions:c.taskIds.map(id=>({name:data.tasks[id]?.name||c.name,taskIds:[id]})));
        if(partitions.length<2)throw Error('这项能力只有一个任务，无法按任务拆分');
        for(const part of partitions)result.push({capabilityIds:[c.id],taskIds:part.taskIds,name:part.name,decision:'CREATE',assetIds:[],reason:'人工审核：任务边界独立，按任务拆分开发'});
      }else result.push({capabilityIds:[c.id],taskIds:c.taskIds,name:c.name,decision:d,
        assetIds:d===c.decision?c.assetIds:[],reason:d===c.decision?c.reason:'人工审核：调整此项任务能力的生成决策'});
    }
    return result;
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
      setPlanId(p.id);setOverrides({});setMergeIds([]);setAccepted(false);
    }),'primary',busy||!sent||!choice||!selected.length),
    h('div',{className:'sf-field'},h('select',{value:planId,onChange:e=>{setPlanId(e.target.value);setOverrides({});setMergeIds([]);setAccepted(false);}},
      h('option',{value:''},'打开已保存规划'),...Object.values(data?.plans||{}).map(p=>h('option',{key:p.id,value:p.id},p.status+' · '+new Date(p.createdAt).toLocaleString())))),
    plan?h('div',{className:'sf-note',style:{margin:'18px 0'}},
      '任务 '+(plan.taskIds?.length||0)+' 项 · 模型建议 '+caps.length+' 个能力簇 · 当前架构预计生成 '+proposedCount()+' 个 Skill。知识参考、复用与排除项不生成独立 Skill；数量不是按书籍章节或提取方法决定的。'):null,
    ...caps.map(c=>h('div',{key:c.id,className:'sf-panel',style:{margin:'10px 0'}},
      h('div',{className:'sf-between'},h('h3',null,c.name),h('span',{className:'sf-tag'},decisionsLabel[c.decision]||c.decision)),
      h('p',{className:'sf-sub'},c.reason),
      h('p',{className:'sf-caption'},'关联任务：'+c.taskIds.map(id=>data.tasks[id]?.name||id).join('、')),
      c.assetIds?.length?h('p',{className:'sf-caption'},'已有资产：'+c.assetIds.join('、')):null,
      plan?.status==='proposed'?h('div',{className:'sf-toolbar',style:{marginTop:10}},
        h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:mergeIds.includes(c.id),disabled:busy||!actionable.has(chosenDecision(c)),onChange:e=>setMergeIds(old=>e.target.checked?[...old,c.id]:old.filter(id=>id!==c.id))}),'与其他任务合并'),
        h('label',{className:'sf-field',style:{margin:0}},'调整架构',h('select',{value:chosenDecision(c),onChange:e=>{const v=e.target.value;setOverrides(old=>({...old,[c.id]:v}));setMergeIds(old=>old.filter(id=>id!==c.id));}},
          ...[c.decision,'CREATE','SPLIT','REFERENCE','REJECT'].filter((v,i,a)=>a.indexOf(v)===i&&(v!=='SPLIT'||c.taskIds.length>1||c.partitions?.length>1)).map(v=>h('option',{key:v,value:v},decisionsLabel[v]))))):null,
      h('details',null,h('summary',null,'查看依据、备选决策与风险'),h('pre',{className:'sf-code'},JSON.stringify({tasks:c.taskIds.map(id=>data.tasks[id]),assets:c.assetIds,alternatives:c.alternatives,assumptions:c.assumptions,evidence:c.evidenceIds},null,2))))),
    plan?.status==='proposed'?h('div',{className:'sf-toolbar'},
      mergeIds.length>1?h('span',{className:'sf-tag purple'},'将选中的 '+mergeIds.length+' 项任务能力合并为一个 Skill'):null,
      btn('重置为系统推荐',()=>{setOverrides({});setMergeIds([]);},'mini',busy),
      btn('确认架构，生成待批蓝图',()=>action(async()=>{
        await job('architect-prepare',{planId,revision:plan.revision,edits:compileEdits()},planId);
        setMessage('蓝图和测试案例已保存，请审核后批准；不会自动发布 Skill');
      }),'primary',busy||!choice||!sent||mergeIds.length===1)):null,
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
