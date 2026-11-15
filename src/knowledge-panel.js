// Local lexical retrieval. No document text is sent to a model unless the user opts into the Q&A action.
function KnowledgePanel({call,waitForJob,models,onTask,onCreate,onOpen}){
 const [docs,setDocs]=React.useState([]);
 const [scope,setScope]=React.useState('');
 const [query,setQuery]=React.useState('');
 const [result,setResult]=React.useState(null);
 const [answer,setAnswer]=React.useState(null);
 const [model,setModel]=React.useState('');
 const [consent,setConsent]=React.useState(false);
 const [busy,setBusy]=React.useState(false);
 const [err,setErr]=React.useState('');
 React.useEffect(()=>{call('/knowledge/documents').then(setDocs).catch(e=>setErr(e.message));},[]);
 React.useEffect(()=>{if(!model&&models.models?.length)setModel(JSON.stringify({provider:models.models[0].provider,model:models.models[0].model}));},[models.models]);
 async function search(){if(!query.trim())return;setBusy(true);setErr('');setAnswer(null);try{setResult(await call('/knowledge/search',{query,projectSlug:scope||undefined}));}catch(e){setErr(e.message);}finally{setBusy(false);}}
 async function ask(){if(!consent||!model||!query.trim())return;setBusy(true);setErr('');try{
   const job=await call('/job-start',{operation:'knowledge-answer',slug:'knowledge',query,projectSlug:scope||undefined,...JSON.parse(model),allowModelSend:true});
   const done=await waitForJob(job.id,360000);setAnswer(done.result);setResult(done.result);
  }catch(e){setErr(e.message);}finally{setBusy(false);}}
 const sources=[...new Map(docs.map(d=>[d.projectSlug,d.projectTitle])).entries()];
 return h('div',null,
  h('div',{className:'sf-welcome'},h('div',null,h('h1',{className:'sf-title'},'知识库'),h('p',{className:'sf-lead'},'书籍与 SOP 是可追溯的参考资料，并不自动变成 Skill。先检索，再按真实任务决定是否封装。')),btn('+ 导入资料',onCreate,'primary')),
  h('div',{className:'sf-panel',style:{marginTop:18}},
   h('h3',null,'从已上传的资料中查找'),
   h('div',{className:'sf-field'},h('label',null,'检索范围'),h('select',{value:scope,onChange:e=>{setScope(e.target.value);setResult(null);setAnswer(null);}},h('option',{value:''},'全部本地资料'),...sources.map(([id,name])=>h('option',{key:id,value:id},name)))),
   h(Field,{label:'要查找的概念、方法或问题',value:query,onChange:setQuery,placeholder:'例如：什么是承诺型 OKR？'}),
   h('div',{className:'sf-toolbar'},btn('本地检索（不调用模型）',search,'primary',busy||!query.trim()),btn('用当前范围创建 Skill',()=>onTask(scope||'',query), 'mini',busy)),
   h('p',{className:'sf-caption'},'检索只读取本机解析后的文字；摘录偏移不是原书页码，也不代表全书解析完整。')),
  result?h('div',{style:{marginTop:18}},h('h2',{className:'sf-section-title'},'检索结果 · '+result.hits.length+' 条'),
    h('p',{className:'sf-caption'},result.warning),
    result.hits.length?result.hits.map(hit=>h('div',{key:hit.id,className:'sf-panel',style:{margin:'10px 0'}},
     h('div',{className:'sf-between'},h('b',null,hit.documentName),h('span',{className:'sf-tag'},'解析文本偏移 '+hit.offset)),
     h('p',{style:{lineHeight:1.8,whiteSpace:'pre-wrap',fontSize:12}},hit.excerpt),
     hit.truncated?h('div',{className:'sf-note sf-alert'},'该资料解析时被截断，检索结果不代表全文完整。'):null,
     h('div',{className:'sf-toolbar'},btn('基于此资料创建 Skill',()=>onTask(hit.projectSlug,query),'mini'),btn('打开来源项目',()=>onOpen(hit.projectSlug),'mini')))):
      h('div',{className:'sf-note'},'没有找到匹配的解析文本；不能据此推断原书没有相关内容。')):null,
  result?.hits?.length?h('div',{className:'sf-panel',style:{marginTop:18}},h('h3',null,'使用选定模型解答（仅发送上述检索摘录）'),
   h('div',{className:'sf-field'},h('label',null,'DSH 模型'),h('select',{value:model,onChange:e=>setModel(e.target.value)},h('option',{value:''},'请选择模型'),...(models.models||[]).map(m=>h('option',{key:m.provider+'/'+m.model,value:JSON.stringify({provider:m.provider,model:m.model})},m.label)))),
   h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:consent,onChange:e=>setConsent(e.target.checked)}),'确认仅向模型发送本次问题和检索摘录（可能使用云端提供商）'),
   btn(busy?'正在处理…':'依据摘录回答',ask,'primary',busy||!consent||!model),
   answer?h('div',{className:'sf-note',style:{marginTop:14}},h('b',null,'模型回答（仍需核验）'),h('p',{style:{whiteSpace:'pre-wrap'}},answer.answer),
      h('p',null,'引用：'+(answer.citationIds||[]).map(id=>answer.hits.find(h=>h.id===id)?.documentName+' ['+(answer.hits.find(h=>h.id===id)?.offset??'?')+']').join('、')),
      answer.limitations?h('p',null,'限制：'+answer.limitations):null):null):null,
  !docs.length?h('div',{className:'sf-note',style:{marginTop:20}},'尚无已上传的资料。先点击「导入资料」。'):h('details',{style:{marginTop:24}},h('summary',null,'已存资料 '+docs.length+' 份'),...docs.map(d=>h('p',{key:d.documentId,className:'sf-caption'},d.projectTitle+' · '+d.name+(d.truncated?'（截断）':'')))),
  err?h('div',{role:'alert',className:'sf-note sf-alert',style:{marginTop:12}},err):null);
}
