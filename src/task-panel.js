// Task-first workflow: one requested deliverable, inventory check, human approval, then standard Skill Evals.
function TaskPanel({call,waitForJob,models,sourceProjectSlug='',initialGoal='',onOpen,onManual}){
 const [goal,setGoal]=React.useState(initialGoal||'');
 const [context,setContext]=React.useState('');
 const [source,setSource]=React.useState(sourceProjectSlug||'');
 const [docs,setDocs]=React.useState([]);
 const [model,setModel]=React.useState('');
 const [consent,setConsent]=React.useState(false);
 const [plans,setPlans]=React.useState([]);
 const [active,setActive]=React.useState(null);
 const [approved,setApproved]=React.useState(false);
 const [busy,setBusy]=React.useState(false);
 const [err,setErr]=React.useState('');
 React.useEffect(()=>{call('/knowledge/documents').then(setDocs).catch(e=>setErr(e.message));call('/task/history').then(setPlans).catch(e=>setErr(e.message));},[]);
 React.useEffect(()=>{if(sourceProjectSlug)setSource(sourceProjectSlug);},[sourceProjectSlug]);
 React.useEffect(()=>{if(initialGoal)setGoal(initialGoal);},[initialGoal]);
 React.useEffect(()=>{if(!model&&models.models?.length)setModel(JSON.stringify({provider:models.models[0].provider,model:models.models[0].model}));},[models.models]);
 async function plan(){if(!goal.trim()||!model||!consent)return;setBusy(true);setErr('');setActive(null);setApproved(false);
  try{const job=await call('/job-start',{operation:'task-plan',slug:'task-workflow',...JSON.parse(model),goal,context,projectSlug:source||undefined,allowModelSend:true});
   const completed=await waitForJob(job.id,480000);setActive(completed.result);setPlans(old=>[completed.result,...old.filter(x=>x.id!==completed.result.id)]);
  }catch(e){setErr(e.message);}finally{setBusy(false);}}
 async function accept(){if(!active||!approved)return;setBusy(true);setErr('');try{
  const p=await call('/task/accept',{planId:active.id,revision:active.revision,approved:true});
  onOpen(p);
 }catch(e){setErr(e.message);}finally{setBusy(false);}}
 const sources=[...new Map(docs.map(d=>[d.projectSlug,d.projectTitle])).entries()];
 const decisions={CREATE:'建议新建 Skill',REUSE:'建议复用已有 Skill',ENHANCE:'建议增强已有 Skill',REFERENCE:'仅需知识参考',REVIEW:'任务边界尚不清楚'};
 return h('div',null,
   h('div',{className:'sf-welcome'},h('div',null,h('h1',{className:'sf-title'},'创建 / 改进 Skill'),h('p',{className:'sf-lead'},'先告诉 AI 要完成什么工作。系统检查已有 Skill，并仅针对这项任务提出复用、增强或创建建议。')),btn('直接创建手动草稿',onManual,'mini')),
   h('div',{className:'sf-panel',style:{marginTop:20}},
     h(Field,{label:'需要 AI 完成的实际任务（必填）',value:goal,onChange:setGoal,multiline:true,rows:3,placeholder:'例如：审核一份季度 OKR，指出不可衡量的 KR，并给出具体修改建议。'}),
     h(Field,{label:'现有输入、交付标准、限制（选填）',value:context,onChange:setContext,multiline:true,rows:3,placeholder:'例如：输入部门 OKR 文本；输出审核表、风险、待补资料；不得虚构指标。'}),
     h('div',{className:'sf-field'},h('label',null,'优先使用的知识来源（可选）'),h('select',{value:source,onChange:e=>setSource(e.target.value)},h('option',{value:''},'不限定资料，按现有 Skill 和任务直接判断'),...sources.map(([id,name])=>h('option',{key:id,value:id},name)))),
     h('div',{className:'sf-field'},h('label',null,'DSH 模型'),h('select',{value:model,onChange:e=>setModel(e.target.value)},h('option',{value:''},'请选择模型'),...(models.models||[]).map(m=>h('option',{key:m.provider+'/'+m.model,value:JSON.stringify({provider:m.provider,model:m.model})},m.label)))),
     h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:consent,onChange:e=>setConsent(e.target.checked)}),'确认向选定模型发送任务、所需知识摘录和已有 Skill 摘要'),
     btn(busy?'正在检查现有 Skill…':'检查复用并提出 Skill 方案',plan,'primary',busy||goal.trim().length<6||!model||!consent),
     h('p',{className:'sf-caption'},'不会自动创建、修改或发布 Skill。遇到已有合适能力时优先复用；没有真实任务时不生产 Skill。')),
   active?h('div',{className:'sf-panel',style:{marginTop:18}},
     h('div',{className:'sf-between'},h('h2',{className:'sf-section-title'},decisions[active.decision]||active.decision),h('span',{className:'sf-tag'},'待人工审核')),
     h('p',{style:{lineHeight:1.8}},active.reason),
     active.assetId?h('p',{className:'sf-note'},'匹配的现有 Skill：'+active.assetId):null,
     active.uncertainties?.length?h('details',null,h('summary',null,'尚待核实的条件'),...active.uncertainties.map((v,i)=>h('p',{key:i,className:'sf-caption'},'· '+v))):null,
     active.sourceExcerpts?.length?h('details',null,h('summary',null,'参考知识摘录 · '+active.sourceExcerpts.length+' 条'),...active.sourceExcerpts.map(v=>h('p',{key:v.id,className:'sf-caption'},v.documentName+' · 偏移 '+v.offset+' · '+v.text))):null,
     active.draft?h('div',{style:{marginTop:16}},h('h3',null,'待创建的 Skill 草稿'),h('p',{className:'sf-sub'},active.draft.description),
       h('details',null,h('summary',null,'展开全部触发、步骤、边界和冻结前测试案例'),
         ...['trigger','inputs','outputs','steps','rules','limits','testPlan'].map(k=>h('div',{key:k,style:{marginTop:10}},h('b',null,labels[k]),h('pre',{className:'sf-code'},active.draft[k])))),
       active.projectSlug?btn('打开已创建草稿',()=>onOpen({slug:active.projectSlug}),'primary'):
       h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:approved,onChange:e=>setApproved(e.target.checked)}),'我已检查任务、使用范围、人工确认边界和测试计划；同意仅创建受版本与真实 Evals 门禁约束的开发草稿（评测套件仍需单独审批）'),
       !active.projectSlug?btn('批准创建开发草稿',accept,'primary',busy||!approved):null):
       h('div',{className:'sf-note',style:{marginTop:12}},'本次不建议创建新 Skill。可直接复用、补充真实任务，或从已有项目进行改进。')):null,
   plans.length?h('details',{style:{marginTop:24}},h('summary',null,'历史任务方案 '+plans.length+' 项（不会自动重跑模型）'),...plans.map(plan=>h('button',{key:plan.id,className:'sf-choice',style:{display:'block',width:'100%',marginTop:7},onClick:()=>{setActive(plan);setApproved(false);}},plan.goal+' · '+(decisions[plan.decision]||plan.decision)))):null,
   err?h('div',{role:'alert',className:'sf-note sf-alert',style:{marginTop:12}},err):null
 );
}
