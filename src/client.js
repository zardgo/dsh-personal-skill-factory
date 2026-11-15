window.__ModuleLoader__.load({ id: "dsh-personal-skill-factory", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
'use strict';
const React = require('react');
const h = React.createElement;
const VERSION='0.3.8';
const DRAFT_FIELDS=['title','description','trigger','inputs','outputs','steps','rules','limits','testPlan'];
const NS='personal.skillFactory';
const ID='personal-skill-factory';
const API='api/personal/skill-factory';
/* HELP_CONTENT */
const CN={panel:'技能工厂'};const EN={panel:'Skill Factory'};
const stageNames=['来源','能力','封装','评测','发布'];
const navItems=[['home','总览','◫'],['projects','开发项目','▦'],['architect','能力架构','⧉'],['lab','质量实验室','◇'],['library','技能库','▣'],['sources','知识来源','≡'],['settings','设置','⚙']];
const types={book:'书籍 / 方法论',sop:'SOP / 流程',problem:'业务问题',existing:'现有 Skill'};
const labels={title:'Skill 项目名称',description:'技能描述（告诉 Agent 何时调用）',sourceLocation:'章节/页码补充（选填）',purpose:'需要解决的实际问题',trigger:'触发条件',inputs:'输入要求（每行一项）',outputs:'输出内容（每行一项）',steps:'执行步骤（每行一项）',rules:'判断规则（每行一项）',limits:'失败处理与人工审批边界',testPlan:'测试场景（每行一项）'};
const theme=`
.sf-root{--sf-text:#232635;--sf-muted:#7d8494;--sf-border:#e6e9f0;--sf-primary:#545bc4;--sf-bg:#f7f8fb;--sf-white:#fff;height:100%;display:flex;background:var(--sf-bg);color:var(--sf-text);font-family:Inter,system-ui,-apple-system,"PingFang SC",sans-serif;min-height:0;font-size:13px}
.sf-root *{box-sizing:border-box}.sf-root button,.sf-root input,.sf-root select,.sf-root textarea{font:inherit}.sf-root button{cursor:pointer}.sf-root button:disabled{opacity:.45;cursor:not-allowed}.sf-side{width:198px;flex-shrink:0;background:#fff;border-right:1px solid var(--sf-border);padding:22px 12px;display:flex;flex-direction:column;gap:3px}.sf-brand{display:flex;gap:10px;align-items:center;font-size:14px;font-weight:750;padding:2px 9px 29px}.sf-brand span{display:grid;place-items:center;width:34px;height:34px;background:#343a59;color:#fff;border-radius:9px;font-weight:800}.sf-side-caption{font-size:10px;letter-spacing:.1em;color:#a0a5b0;padding:5px 10px 9px}.sf-nav{display:flex;align-items:center;gap:11px;border:0;border-radius:8px;background:transparent;padding:11px 10px;color:#707786;text-align:left;font-size:12px}.sf-nav .sf-nav-icon{width:18px;font-size:18px;text-align:center}.sf-nav:hover{background:#f2f3f9}.sf-nav.active{background:#eff0fd;color:#4b51b5;font-weight:650}.sf-side-bottom{margin-top:auto;padding:14px 10px;border-top:1px solid var(--sf-border);font-size:11px;color:#9299a7}.sf-main{min-width:0;flex:1;overflow-y:auto;height:100%}.sf-topbar{height:62px;background:#ffffffd8;border-bottom:1px solid var(--sf-border);position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:center;padding:0 29px}.sf-main-content{padding:30px;max-width:1250px;margin:0 auto 40px}.sf-crumb{font-size:11px;color:#a0a5b1}.sf-crumb strong{color:#50566a}.sf-top-actions{display:flex;gap:9px;align-items:center}.sf-eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#686cc4}.sf-title{font-size:27px;letter-spacing:-.8px;margin:9px 0 7px;font-weight:700}.sf-lead{font-size:12px;color:var(--sf-muted);line-height:1.7}.sf-welcome{display:flex;align-items:center;justify-content:space-between;gap:20px}.sf-btn{border:1px solid #dfe3ec;color:#50586c;background:#fff;border-radius:8px;padding:9px 13px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px}.sf-btn:hover{background:#f6f7fb}.sf-btn.primary{border-color:var(--sf-primary);background:var(--sf-primary);color:#fff}.sf-btn.primary:hover{background:#454da9}.sf-btn.danger{color:#af5353;border-color:#e8c1c1}.sf-btn.mini{padding:6px 9px;font-size:11px}.sf-btn:focus-visible,.sf-nav:focus-visible{outline:2px solid #8c91dc;outline-offset:2px}.sf-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin:22px 0 27px}.sf-card,.sf-panel,.sf-stat{background:#fff;border:1px solid var(--sf-border);border-radius:12px;box-shadow:0 1px 3px #20284508}.sf-stat{padding:18px}.sf-stat strong{display:block;font-size:26px;margin:8px 0;font-variant-numeric:tabular-nums}.sf-stat small{font-size:10px;color:#9aa0ac}.sf-stat .label{font-size:11px;color:#8b92a0}.sf-two{display:grid;grid-template-columns:1.5fr 1fr;gap:17px}.sf-panel{padding:20px;min-width:0}.sf-panel h3{font-size:14px;margin:0 0 7px}.sf-sub{font-size:11px;color:#8e95a4;margin:0}.sf-section-title{font-size:14px;margin:26px 0 13px;font-weight:650}.sf-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.sf-choice{padding:17px;text-align:left;border:1px solid #e7eaf1;background:#fff;border-radius:10px}.sf-choice:hover{border-color:#aeb2ec;background:#fcfcff}.sf-choice b{display:block;font-size:12px}.sf-choice span{display:block;color:#8b92a0;font-size:11px;line-height:1.7;margin-top:8px}.sf-glyph{width:31px;height:31px;border-radius:9px;display:grid;place-items:center;color:#6266b7;background:#f1f1fb;margin-bottom:13px;font-size:19px}.sf-steps-mini{color:#9299a6;font-size:10px;margin-top:20px;display:flex;align-items:center;justify-content:space-between;gap:6px}.sf-steps-mini span{white-space:nowrap}.sf-list{width:100%;border-collapse:collapse;text-align:left;font-size:12px}.sf-list th{text-align:left;font-size:10px;color:#a0a6b1;font-weight:600;padding:12px;background:#fafbfe;border-bottom:1px solid var(--sf-border)}.sf-list td{padding:14px 12px;border-bottom:1px solid #eef0f5;color:#666e7c}.sf-list tbody tr{cursor:pointer}.sf-list tbody tr:hover{background:#fafaff}.sf-list tbody tr:last-child td{border-bottom:0}.sf-table-wrap{border:1px solid var(--sf-border);border-radius:11px;overflow:auto;background:#fff}.sf-bold{font-weight:650;color:#2b3141}.sf-muted{color:#9ba1ab;font-size:11px}.sf-tag{display:inline-block;border:1px solid #e4e6ed;background:#f9fafc;border-radius:6px;padding:4px 7px;color:#737a89;font-size:10px;white-space:nowrap}.sf-tag.warn{background:#fff6e6;color:#ae7d3a;border-color:#f4e4c4}.sf-tag.good{background:#eef9f2;color:#287f56;border-color:#d4eadd}.sf-tag.purple{background:#f1f0ff;color:#5c59b1;border-color:#e1dffa}.sf-tag.bad{background:#fff1f1;color:#b54e58;border-color:#f3d6d6}.sf-row{display:flex;align-items:center;gap:9px}.sf-between{display:flex;justify-content:space-between;align-items:center;gap:12px}.sf-issue{display:flex;gap:10px;padding:13px 0;border-bottom:1px solid #f0f2f6}.sf-dot{width:7px;height:7px;background:#dfa357;border-radius:50%;margin-top:5px;flex-shrink:0}.sf-issue b{font-size:11px}.sf-issue p{margin:4px 0 0;color:#9399a5;font-size:11px;line-height:1.55}.sf-issue:last-child{border-bottom:0}.sf-field{display:flex;flex-direction:column;gap:7px;margin:15px 0}.sf-field label{font-size:11px;font-weight:650;color:#60697b}.sf-field input,.sf-field textarea,.sf-field select{outline:0;border:1px solid #e0e4ec;border-radius:8px;background:#fff;color:#333a4c;padding:10px 11px;width:100%;font-size:12px;line-height:1.6}.sf-field textarea{min-height:84px;resize:vertical}.sf-field input:focus,.sf-field textarea:focus,.sf-field select:focus{border-color:#9da3e5;box-shadow:0 0 0 3px #616bc417}.sf-note{padding:13px;background:#f7f8fc;border:1px solid #e9ecf3;border-radius:9px;color:#788191;font-size:11px;line-height:1.8}.sf-stage-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0 14px}.sf-stage{display:flex;align-items:center;gap:8px;border:1px solid #e2e6ee;background:#fff;border-radius:8px;padding:9px 13px;font-size:11px;color:#727888}.sf-stage.active{color:#4d54b4;background:#f0f1ff;border-color:#bec3ef}.sf-step-index{width:18px;height:18px;border-radius:50%;background:#f0f2f5;display:grid;place-items:center;font-size:10px}.sf-stage.active .sf-step-index{background:#5b62c3;color:#fff}.sf-detail-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,1fr);gap:16px}.sf-check{display:flex;align-items:flex-start;gap:10px;border-bottom:1px solid #f0f1f6;padding:12px 0}.sf-check:last-child{border-bottom:0}.sf-check .sf-flag{font-size:15px;width:16px}.sf-check b{display:block;font-size:11px}.sf-check p{margin:4px 0 0;font-size:10px;color:#9098a4}.sf-code{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #e2e5ef;background:#fafbfe;padding:15px;border-radius:8px;font-size:11px;line-height:1.65;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;max-height:510px;overflow:auto}.sf-toast{position:sticky;bottom:12px;z-index:5;margin:15px auto 0;background:#262e40;color:#fff;border-radius:9px;padding:11px 16px;font-size:11px;max-width:600px;box-shadow:0 10px 24px #0002}.sf-overlay{position:fixed;inset:0;background:#1c244755;z-index:999;display:grid;place-items:center}.sf-modal{width:min(460px,calc(100vw - 40px));max-height:90vh;overflow:auto;background:white;border-radius:13px;padding:25px;box-shadow:0 20px 50px #0003}.sf-modal h2{margin:0 0 7px;font-size:18px}.sf-empty{text-align:center;padding:45px 16px;color:#9ca3af;font-size:12px}.sf-right-note{font-size:10px;color:#a0a6b1;text-align:right}.sf-confirm{display:flex;align-items:start;gap:10px;margin-top:14px;color:#656d7b;font-size:11px}.sf-confirm input{margin-top:2px}.sf-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sf-pipeline{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.sf-metric{padding:12px;background:#fbfcfd;border:1px solid #edf0f5;border-radius:8px}.sf-metric b{font-size:22px}.sf-metric small{display:block;color:#a0a6b1;margin-top:4px}.sf-dangertext{color:#b45d5d}.sf-link{border:0;background:none;color:#5559ad;padding:4px;font-size:11px}.sf-link:hover{text-decoration:underline}.sf-caption{font-size:10px;color:#a0a6b1;line-height:1.7}
.sf-progress-wrap{margin:14px 0}.sf-progress-wrap .sf-between b{font-size:12px}.sf-progress-pct{font-variant-numeric:tabular-nums;color:#5a6180;font-size:12px;font-weight:650}.sf-progress-track{height:10px;border-radius:100px;background:#e8ebf2;overflow:hidden;margin-top:9px}.sf-progress-fill{height:100%;background:#6069c8;border-radius:100px;transition:width .25s ease}.sf-progress-hint{font-size:11px;color:#6269ae;margin:8px 0 0}.sf-alert{border-color:#e8d8a9;background:#fffaf0;color:#956c27;margin:11px 0}.sf-next-step{margin-top:22px;border:1px solid #dbe2f0;border-radius:12px;background:#f8faff;padding:16px}.sf-next-step>.sf-between{align-items:flex-start}.sf-next-step b{font-size:12px}.sf-next-step .sf-sub{margin-top:6px;line-height:1.7}.sf-group{padding:15px 3px;border-bottom:1px solid #e4e9f2}.sf-group:last-child{border-bottom:0}.sf-group>b,.sf-group b{font-size:12px}.sf-group .sf-sub{margin-top:7px;line-height:1.7}.sf-methods{margin-top:18px;border-top:1px solid #edf0f5}.sf-summary-list{margin-top:15px}.sf-summary-list .sf-group:first-of-type{margin-top:7px}.sf-group .sf-between .sf-caption{max-width:65%}.sf-detail-grid>div:last-child{align-self:start;position:sticky;top:80px}.sf-detail-grid>div:first-child{min-width:0}


.sf-help-anchor{position:fixed;right:22px;bottom:22px;z-index:40;pointer-events:none;font-size:12px}
.sf-help-anchor>*{pointer-events:auto}.sf-help-fab{border:1px solid #d5d9ef;background:var(--sf-primary);color:#fff;min-height:40px;padding:9px 14px;border-radius:24px;box-shadow:0 8px 24px #252a5638;cursor:pointer;font-weight:650}
.sf-help-fab:focus-visible,.sf-help-close:focus-visible{outline:3px solid #9da3e5;outline-offset:2px}
.sf-help-box{width:min(350px,calc(100vw - 34px));max-height:min(72vh,580px);display:flex;flex-direction:column;background:var(--sf-white);border:1px solid var(--sf-border);border-radius:13px;box-shadow:0 12px 42px #10193636;overflow:hidden;color:var(--sf-text)}
.sf-help-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--sf-border);font-weight:700}
.sf-help-head-actions{display:flex;gap:6px}.sf-help-close{border:1px solid var(--sf-border);background:transparent;color:var(--sf-text);border-radius:7px;width:29px;height:29px;cursor:pointer}
.sf-help-search{margin:12px 14px 0;padding:9px 10px;border-radius:7px;border:1px solid var(--sf-border);width:calc(100% - 28px);background:var(--sf-white);color:var(--sf-text)}
.sf-help-scroll{padding:12px 14px 16px;overflow-y:auto;min-height:0;line-height:1.7}.sf-help-scroll ol{padding-left:20px}.sf-help-scroll li{margin:6px 0}.sf-help-scroll p{margin:4px 0 10px;color:var(--sf-muted)}
.sf-help-scroll summary{cursor:pointer;font-weight:600;padding:7px 0}.sf-help-scroll details{border-bottom:1px solid var(--sf-border)}.sf-help-scroll h4{margin:13px 0 5px;font-size:12px}
@media(max-width:580px){.sf-help-anchor{right:10px;bottom:10px}.sf-help-box{max-height:65vh;width:min(350px,calc(100vw - 20px))}}
@media(prefers-color-scheme:dark){.sf-help-box{background:#25293b;color:#eef0f6;border-color:#50576d}.sf-help-search{background:#2e3448;color:#eef0f6;border-color:#50576d}.sf-help-close{color:#eef0f6;border-color:#50576d}.sf-help-scroll p{color:#b8c0ce}}
@media(max-width:980px){.sf-side{width:54px;padding:16px 6px}.sf-side-caption,.sf-side-bottom,.sf-brand b,.sf-nav .sf-nav-label{display:none}.sf-brand{padding:4px 4px 20px}.sf-nav{justify-content:center}.sf-two,.sf-detail-grid{grid-template-columns:1fr}.sf-stat-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:580px){.sf-main-content{padding:20px 14px}.sf-topbar{padding:0 14px}.sf-title{font-size:22px}.sf-stat-grid,.sf-choice-grid{grid-template-columns:1fr 1fr}.sf-welcome{align-items:start;flex-direction:column}.sf-pipeline{grid-template-columns:1fr 1fr}.sf-top-actions .sf-btn{padding:7px}}
`;
function badge(s){if(s==='published-experimental')return h('span',{className:'sf-tag purple'},'实验版已发布');return h('span',{className:'sf-tag warn'},'开发草稿')}
function btn(label,fn,variant='',disabled=false){return h('button',{type:'button',className:'sf-btn '+variant,onClick:fn,disabled},label)}
function Field({label,value,onChange,multiline=false,rows=4,placeholder='',readOnly=false}){const id=React.useId();return h('div',{className:'sf-field'},h('label',{htmlFor:id},label),multiline?h('textarea',{id,value:value||'',rows,readOnly,onChange:e=>onChange(e.target.value),placeholder}):h('input',{id,value:value||'',onChange:e=>onChange(e.target.value),placeholder}))}
function Card({children,className=''}){return h('div',{className:'sf-panel '+className},children)}
function checkStatus(checks){return h('div',null,...checks.map(x=>h('div',{className:'sf-check',key:x.id},h('span',{className:'sf-flag',style:{color:x.passed?'#33936c':'#d29b53'}},x.passed?'✓':'!'),h('div',null,h('b',null,x.label),h('p',null,x.passed?'结构要求已满足':x.remedy))))) }
function Icon(){return h('svg',{width:17,height:17,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7},h('path',{d:'M5 7h14M5 12h14M5 17h9'}))}

// One stable component mounted once per workbench, not inside any page render.
function HelpDock({page,stage}) {
 const key='dsh-skill-factory-help-v035';
 const [mode,setMode]=React.useState(()=>{try{const value=window.localStorage.getItem(key);return ['open','min','closed'].includes(value)?value:'min'}catch{return 'min'}});
 const [search,setSearch]=React.useState('');
 const [allFaq,setAllFaq]=React.useState(false);
 const fab=React.useRef(null);
 const section=HELP_CONTENT[page]||HELP_CONTENT.home;
 const faqs=HELP_FAQ.filter(x=>(x.q+x.a).toLowerCase().includes(search.trim().toLowerCase()));
 React.useEffect(()=>{try{window.localStorage.setItem(key,mode)}catch{}},[mode]);
 React.useEffect(()=>{
   if(mode!=='open')return;
   const escape=e=>{if(e.key==='Escape'){setMode('min');fab.current?.focus()}};
   document.addEventListener('keydown',escape);
   return()=>document.removeEventListener('keydown',escape);
 },[mode]);
 const change=value=>setMode(value);
 return h('div',{className:'sf-help-anchor',role:'complementary','aria-label':'Skill Factory 使用指南'},
  mode!=='open'?h('button',{ref:fab,type:'button',className:'sf-help-fab','aria-label':'打开使用指南',onClick:()=>change('open')},mode==='closed'?'?  帮助':'?  使用指南'):
   h('section',{className:'sf-help-box','aria-label':'使用指南内容'},
    h('div',{className:'sf-help-head'},h('span',null,'◧  使用指南'),h('div',{className:'sf-help-head-actions'},
     h('button',{type:'button',className:'sf-help-close','aria-label':'最小化使用指南',title:'最小化',onClick:()=>change('min')},'−'),
     h('button',{type:'button',className:'sf-help-close','aria-label':'关闭使用指南',title:'关闭',onClick:()=>change('closed')},'×'))),
    h('input',{className:'sf-help-search',type:'search',value:search,onChange:e=>setSearch(e.target.value),placeholder:'搜索使用说明与常见问题','aria-label':'搜索使用指南'}),
    h('div',{className:'sf-help-scroll'},
     h('div',{className:'sf-eyebrow'},'当前页面 · '+section.title+(page==='detail'?' / 第'+(stage+1)+'阶段':'')),
     h('h3',null,section.purpose),
     h('h4',null,'开始前'),h('p',null,section.prerequisite),
     h('h4',null,'怎么操作'),h('ol',null,...section.steps.map((s,i)=>h('li',{key:i},s))),
     h('h4',null,'完成标准'),h('p',null,section.done),
     h('h4',null,'下一步'),h('p',null,section.next),
     h('h4',null,'常见问题'),
     ...faqs.slice(0,search||allFaq?faqs.length:4).map((item,i)=>h('details',{key:item.q},h('summary',null,item.q),h('p',null,item.a))),
     faqs.length===0?h('p',null,'没有匹配的问题，请换个关键词。'):null,
     !search&&faqs.length>4?h('button',{type:'button',className:'sf-link',onClick:()=>setAllFaq(x=>!x)},allFaq?'收起问题':'查看全部常见问题'):null)));
}

/* ARCHITECT_PANEL */
function App(){
 const [page,setPage]=React.useState('home');const [architectFocus,setArchitectFocus]=React.useState('');const [data,setData]=React.useState({projects:[],runs:[],publications:[]});const [info,setInfo]=React.useState(null);const [selected,setSelected]=React.useState(null);const [edit,setEdit]=React.useState(null);const [stage,setStage]=React.useState(0);const [search,setSearch]=React.useState('');const [creating,setCreating]=React.useState(false);const [newData,setNewData]=React.useState({title:'',slug:'',sourceType:'book',purpose:''});const [toast,setToast]=React.useState('');const [busy,setBusy]=React.useState(false);const [buildResult,setBuildResult]=React.useState(null);const [publishSlug,setPublishSlug]=React.useState('');const [approve,setApprove]=React.useState(false);const [noEvals,setNoEvals]=React.useState(false);const [models,setModels]=React.useState({connected:false,models:[]});const [modelChoice,setModelChoice]=React.useState('');const [consent,setConsent]=React.useState(false);const [docId,setDocId]=React.useState('');const [proposal,setProposal]=React.useState(null);const [evalReport,setEvalReport]=React.useState(null);const [evalOffset,setEvalOffset]=React.useState(-1);const [analyzeResult,setAnalyzeResult]=React.useState(null);
 const [analyzeJob,setAnalyzeJob]=React.useState(null);
 const [synthesisJob,setSynthesisJob]=React.useState(null);
 const [showMethods,setShowMethods]=React.useState(false);const [methodLimit,setMethodLimit]=React.useState(6);
 const [showGroups,setShowGroups]=React.useState(false);
 const [evalJob,setEvalJob]=React.useState(null);
 const pauseRequested=React.useRef(false);
 const runningJob=React.useRef(false);
 const actionLock=React.useRef(false);
 const proposalPanel=React.useRef(null);
 async function call(endpoint,body){
  const url=new URL(API+endpoint,document.baseURI);
  let response;
  try{
   response=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'x-skill-factory-client':VERSION,...(body?{'content-type':'application/json'}:{})},signal:AbortSignal.timeout(45000),body:body?JSON.stringify(body):undefined});
  }catch(e){throw new Error(`请求失败（网络/客户端连接中断）：${e?.message||e}。已完成的归并进度保存在本机。`)}
  const contentType=(response.headers?.get?.('content-type')||'').toLowerCase();
  let text;
  try{text=await response.text()}catch(e){throw new Error('HTTP '+response.status+' · 响应读取中断或超时：'+(e?.message||e))}
  let result;
  try{result=JSON.parse(text)}catch{
   const status=response.status;
   const clue=status===404?'归并路由不存在，可能是新客户端仍连接旧版 DSH Host；请完全退出客户端，核对「设置」中的版本后重新打开。':
    [502,503,504].includes(status)?'DSH 网关或代理可能超时/不可用；新版长任务已改用后台轮询。':
    '请先检查插件版本与 DSH 连接，勿清空项目数据。';
   throw new Error(`HTTP ${status}，服务端响应不是 JSON（${contentType||'未声明类型'}）。${clue}`);
  }
  if(!result||typeof result!=='object'||!response.ok||result.ok!==true)throw new Error(`HTTP ${response.status} · `+(result?.error||'服务器未返回成功结果')+(result?.requestId?` [请求编号 ${result.requestId}]`:''));
  return result.data;
 }
  async function waitForJob(id,timeoutMs=540000,onProgress=null){
   // Long planner jobs may span many bounded model calls; do not confuse per-call timeout with job duration.
   for(const deadline=Date.now()+timeoutMs;Date.now()<deadline;){
    const job=await call('/job-status?id='+encodeURIComponent(id));
    if(onProgress&&job.progress)onProgress(job.progress);
    if(job.status==='completed')return job;
    if(job.status==='failed')throw new Error((job.error||'后台模型任务执行失败')+' [请求编号 '+job.requestId+']');
    if(!['queued','running'].includes(job.status))throw new Error('未知归并任务状态：'+job.status);
    await new Promise(resolve=>setTimeout(resolve,1000));
   }
   throw new Error('模型任务超过轮询期限；请刷新项目检查持久化的进度，不要重复上传文档');
  }
 const refresh=React.useCallback(async()=>{const i=await call('/info');setInfo(i);if(i.version!==VERSION)throw new Error('客户端 '+VERSION+' 与 Host '+i.version+' 版本不一致，请完全退出 DSH 后重开');const s=await call('/state');setData(s);return s},[]);
 React.useEffect(()=>{refresh().catch(e=>setToast('连接 DSH Host 失败：'+e.message));call('/models').then(m=>{setModels(m);if(m.models?.length)setModelChoice(JSON.stringify({provider:m.models[0].provider,model:m.models[0].model}))}).catch(e=>setToast('模型目录读取失败：'+e.message))},[refresh]);
 React.useEffect(()=>{if(!selected)return;const p=data.projects.find(x=>x.slug===selected);if(p&&(!edit||edit.slug!==selected)){setEdit({...p});setBuildResult(null)}},[selected,data]);
 function message(s){setToast(s)}
 function savePayload(project){const fields=['title','sourceType','purpose','description','trigger','inputs','outputs','steps','rules','limits','testPlan'];return Object.fromEntries(['slug','revision',...fields].map(k=>[k,project[k]]).filter(([,v])=>v!==undefined));}
 async function action(task,success,operation='操作'){if(busy||actionLock.current)return;actionLock.current=true;setBusy(true);try{const result=await task();if(success)message(success);const fresh=await refresh();if(selected){const latest=fresh.projects?.find(x=>x.slug===selected);if(latest)setEdit({...latest})}return result}catch(e){message(operation+'失败：'+e.message);return null}finally{actionLock.current=false;setBusy(false)}}
 async function planDocument(slug,documentId){
   if(!documentId){message('请先上传并分析资料');return}
   const source=await action(()=>call('/architecture/ingest',{kind:'legacy',slug,documentId}),'资料已加入能力架构，可统一规划并合并候选','登记已分析资料');
   if(source){setArchitectFocus(source.id);setPage('architect')}
 }
 function open(p){if(runningJob.current){message('请先暂停当前分析，再切换项目');return}setSelected(p.slug);setEdit({...p});setPage('detail');setStage(p.derivedFrom||p.blueprintId?1:0);setBuildResult(null);setPublishSlug('');setApprove(false);setNoEvals(false);setProposal(null);setEvalReport(null);setAnalyzeResult(null);setDocId(p.documents?.[0]?.id||'');setEvalOffset(-1);setAnalyzeJob(null);setSynthesisJob(null);setShowMethods(false);setMethodLimit(6);setShowGroups(false);setEvalJob(null)}
 function go(next){if(runningJob.current){message('分析/归并进行中，请先暂停后再切换页面');return}setPage(next);setToast('')}
 function currentCheck(){const p=edit||{};const tests=[['identity','名称与描述',!!(p.title&&p.description),'设置名称与技能描述'],['trigger','触发条件',!!p.trigger,'写明调用场景'],['io','输入输出',!!(p.inputs&&p.outputs),'写明输入与输出'],['method','执行步骤',String(p.steps||'').split('\n').filter(x=>x.trim()).length>=2,'至少两步'],['source','可追溯来源',p.sourceType==='problem'||p.sourceType==='existing'||Boolean((p.sourceReferences||[]).some(d=>d.sha256))||Boolean((p.documents||[]).some(d=>d.sha256))||!!(p.sourceTitle&&p.sourceLocation&&p.sourceExcerpt),'上传资料以自动保留文件名与来源指纹'],['uncertainty','缺失数据处理',/缺失|不足|不确定|不得编造|无法验证/.test((p.rules||'')+' '+(p.limits||'')),'禁止编造'],['approval','人工审批',/人工|审批|确认|review/i.test((p.rules||'')+' '+(p.limits||'')),'写明审批'],['evals','测试计划',String(p.testPlan||'').split('\n').filter(x=>x.trim()).length>=3,'至少三组场景']];return tests.map(([id,label,passed,remedy])=>({id,label,passed,remedy}))}

 function pickedModel(){if(!modelChoice)throw new Error('请在模型选择器中选定 DSH 已配置的模型');return JSON.parse(modelChoice)}
 async function runAi(endpoint,args,success){if(!consent){message('请先勾选模型内容发送确认');return null}let selected;try{selected=pickedModel()}catch(e){message(e.message);return null}return action(()=>call(endpoint,{...selected,...args,allowModelSend:true}),success,endpoint==='/analyze'?'AI知识提取':endpoint==='/model-eval'?'模型评测':'AI生成')}
 const readBase64=file=>new Promise((resolve,reject)=>{if(file.size>12*1024*1024)return reject(new Error('上传文件不得超过12MB'));const fr=new FileReader();fr.onload=()=>{const value=fr.result;if(typeof value!=='string'){reject(new Error('上传文件读取结果无效'));return}const offset=value.indexOf(';base64,');if(!value.startsWith('data:')||offset<0){reject(new Error('文件编码格式无法识别'));return}resolve(value.slice(offset+8))};fr.onerror=()=>reject(fr.error||new Error('文件读取失败'));fr.onabort=()=>reject(new Error('文件读取已取消'));fr.readAsDataURL(file)});
 async function uploadFile(file){if(!file)return;if(!/\.(pdf|epub|docx|txt|md)$/i.test(file.name)){message('只支持 PDF / EPUB / DOCX / TXT / MD');return}try{const b64=await readBase64(file);const res=await action(()=>call('/upload',{slug:p.slug,filename:file.name,base64:b64}),'文档已保存在个人本地空间','文件上传');if(res){setDocId(res.document.id);setAnalyzeResult(null);setProposal(null)}}catch(e){message('文件读取失败：'+e.message)}}
 function ModelPicker(){return h('div',{className:'sf-panel',style:{margin:'15px 0',background:'#fafbfe'}},h('h3',null,'DSH 模型'),models.models?.length?h('div',{className:'sf-field'},h('label',null,'已配置的模型'),h('select',{value:modelChoice,onChange:e=>setModelChoice(e.target.value)},models.models.map(m=>h('option',{key:m.provider+'-'+m.model,value:JSON.stringify({provider:m.provider,model:m.model})},m.label)))):h('div',{className:'sf-note'},models.reason||'未发现已配置的模型。请先在 DSH 设置中启用模型。'),h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:consent,onChange:e=>setConsent(e.target.checked)}),'我已知晓：运行 AI 时，选定的资料片段/测试内容会发送给当前 DSH 模型提供商（可能为云端）'))}
 function SourceAI(){
  const documents=p.documents||[];
  const current=documents.find(d=>d.id===docId)||documents[0];
  const methods=(p.analysis||[]).filter(m=>m.documentId===current?.id);
  const progress=(p.analysisProgressByDocument?.[current?.id]||(p.analysisProgress?.documentId===current?.id?p.analysisProgress:null));
  const summary=p.synthesisByDocument?.[current?.id];
  const analyzed=progress?.analyzedChunks||0;
  const total=progress?.totalChunks||0;
  const pct=total?Math.min(100,Math.round(analyzed*100/total)):0;
  const complete=Boolean(progress&&analyzed>=total);
  const verifiedCount=methods.filter(m=>m.verified).length;
  const synthesisComplete=Boolean(summary?.finalizedAt);
  const synthesisBatchComplete=Boolean(summary&&summary.nextMethod>=summary.totalMethods);
  const legacyRisk=Boolean(complete&&methods.length>=100&&!progress?.chunkResults?.length);
  const emptyChunks=(progress?.chunkResults||[]).filter(x=>x.methods===0).length;
  const coveredIds=new Set((summary?.finalGroups||summary?.groups||[]).flatMap(g=>g.methodIds||[]));
  const active=Boolean(analyzeJob?.active||synthesisJob?.active);
  const job=analyzeJob?.active?analyzeJob:synthesisJob?.active?synthesisJob:null;
  function showError(prefix,e){const reason=e?.message||String(e);message(prefix+'失败：'+reason);return reason;}
  async function sync(slug){const fresh=await refresh();const latest=fresh.projects?.find(x=>x.slug===slug);if(latest)setEdit({...latest});return latest;}
  async function runCompleteAnalysis(){
   if(!current||runningJob.current||!consent||!modelChoice)return;
   let chosen;try{chosen=pickedModel()}catch(e){message(e.message);return}
   runningJob.current=true;pauseRequested.current=false;setBusy(true);
   const slug=p.slug,id=current.id;let completed=analyzed,expected=total;
   setAnalyzeJob({active:true,completed,total:expected,phase:'preparing'});
   try{
    await call('/save',savePayload(p));
    let latest=await sync(slug);
    const initialProgress=latest.analysisProgressByDocument?.[id]||(latest.analysisProgress?.documentId===id?latest.analysisProgress:null);
    completed=initialProgress?.nextChunk||0;expected=initialProgress?.totalChunks||0;
    do{
     if(pauseRequested.current)break;
     setAnalyzeJob({active:true,completed,total:expected,phase:'analyzing'});
     const task=await call('/job-start',{operation:'analyze',slug,documentId:id,startChunk:completed,maxChunks:1,allowModelSend:true,...chosen});
     await waitForJob(task.id);
     latest=await sync(slug);
     const progress=latest.analysisProgressByDocument?.[id]||(latest.analysisProgress?.documentId===id?latest.analysisProgress:null);
     if(!progress||progress.nextChunk<=completed)throw new Error('Host 未保存预期的分析进度');
     completed=progress.nextChunk;expected=progress.totalChunks;
     setAnalyzeJob({active:true,completed,total:expected,phase:'analyzing'});
    }while(completed<expected&&!pauseRequested.current);
    if(completed>=expected)message('可解析文本已分析完成。下一步：点击「AI 归并为 Skill 建议」。');
    else message(`已暂停，保留 ${completed}/${expected} 段的进度。点击继续即可接着分析。`);
    setAnalyzeJob({active:false,completed,total:expected,phase:completed>=expected?'completed':'paused'});
   }catch(e){const reason=showError('全文分析',e);setAnalyzeJob({active:false,completed,total:expected,phase:'error',error:reason});await sync(slug).catch(()=>{});}
   finally{runningJob.current=false;pauseRequested.current=false;setBusy(false)}
  }
  async function runSynthesis(){
   if(!current||runningJob.current||!consent||!modelChoice||!complete)return;
   let chosen;try{chosen=pickedModel()}catch(e){message(e.message);return}
   // Never silently mix a newer UI bundle with an older Host API.
   if(!info||info.capabilities?.backgroundSynthesis!==true){
    message('方法归并暂不可用：客户端和 DSH Host 版本可能不一致。服务端版本 '+(info?.version||'读取中')+'，需要 v0.3.4。请完全退出 DSH 后重新安装并重启。');
    return;
   }
   runningJob.current=true;pauseRequested.current=false;setBusy(true);
   const slug=p.slug,id=current.id;let completed=summary?.nextMethod||0;let count=summary?.totalMethods||methods.length;
   setSynthesisJob({active:true,completed,total:count,phase:'grouping'});
   async function sendSynthesis(operation,args){
    const task=await call('/job-start',{operation,...args});
    await waitForJob(task.id);
    const db=await call('/state');
    const item=db.projects?.find(x=>x.slug===slug);
    const result=item?.synthesisByDocument?.[id];
    if(!result)throw new Error('模型任务已返回完成，但未找到保存的归并结果，请刷新项目');
    return result;
   }
   try{
    while(completed<count&&!pauseRequested.current){
     const result=await sendSynthesis('synthesize',{slug,documentId:id,maxMethods:25,allowModelSend:true,...chosen});
     completed=result.nextMethod;count=result.totalMethods;
     setSynthesisJob({active:true,completed,total:count,phase:'grouping'});
     await sync(slug);
    }
    if(completed>=count&&!pauseRequested.current){
     setSynthesisJob({active:true,completed,total:count,phase:'finalizing'});
     await sendSynthesis('synthesis-finalize',{slug,documentId:id,allowModelSend:true,...chosen});
     await sync(slug);
     message('归并与跨批次去重已完成。请选择一项「生成 Skill 草稿」，审核后进入第二步。');
    }else message(`归并已暂停，保留 ${completed}/${count} 条进度。`);
    setSynthesisJob({active:false,completed,total:count,phase:completed>=count&&!pauseRequested.current?'completed':'paused'});
   }catch(e){const reason=showError('方法归并',e);setSynthesisJob({active:false,completed,total:count,phase:'error',error:reason});await sync(slug).catch(()=>{});}
   finally{runningJob.current=false;pauseRequested.current=false;setBusy(false)}
  }
  async function resetDocument(){if(runningJob.current||!current)return;if(!confirm('确认重新分析当前文档吗？旧版候选和进度会先完整备份到本机，再从第1段开始；其他文档不会受影响。'))return;const result=await action(()=>call('/analysis-reset',{slug:p.slug,documentId:current.id,confirmed:true}),'旧提取结果已备份，当前文档可重新分析');if(result){setAnalyzeJob(null);setSynthesisJob(null);setShowMethods(false);setShowGroups(false);setProposal(null)}}
  async function generateProposal(selection){
   if(!consent||!modelChoice||runningJob.current||actionLock.current)return;
   runningJob.current=true;
   setBusy(true);
   try{
    const task=await call('/propose',{...pickedModel(),slug:p.slug,revision:p.revision,documentId:current.id,allowModelSend:true,...selection});
    message('正在生成草稿并校验九个字段…');
    const job=await waitForJob(task.id);
    setProposal(job.result);
    message(job.result.status==='ready'?'已生成可审核草稿':'保留了模型候选，请补齐字段后继续 [请求编号 '+job.result.requestId+']');
    requestAnimationFrame(()=>proposalPanel.current?.scrollIntoView({block:'start'}));
   }catch(e){showError('草稿生成',e)}
   finally{runningJob.current=false;setBusy(false)}
  }
  async function loadProposal(){
   try{
    const params=new URLSearchParams({slug:p.slug,documentId:current.id});
    const records=await call('/proposals?'+params);
    if(records.length){setProposal(records[0]);requestAnimationFrame(()=>proposalPanel.current?.scrollIntoView({block:'start'}));}
    else message('当前文档和版本暂无已保存候选');
   }catch(e){showError('读取草稿',e)}
  }
  async function applyProposal(){
   if(!proposal?.draft||DRAFT_FIELDS.some(key=>!proposal.draft[key]?.trim()))return;
   if(!confirm('确认按当前草稿创建独立 Skill 项目？'))return;
   const result=await action(()=>call('/fork',{slug:p.slug,revision:proposal.baseRevision,documentId:docId,groupId:proposal.groupId,methodId:proposal.methodId,proposalId:proposal.id,sourceMethodIds:proposal.sourceMethodIds,draft:proposal.draft,approved:true}),'已创建独立 Skill 项目');
   if(result){open(result);setStage(1)}
  }
  function progressBar(done,max,label){const value=max?Math.min(100,Math.round(done*100/max)):0;return h('div',{className:'sf-progress-wrap'},h('div',{className:'sf-between'},h('b',null,label),h('span',{className:'sf-progress-pct'},`${value}% · ${done}/${max||'…'}`)),h('div',{className:'sf-progress-track',role:'progressbar','aria-label':label,'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':value},h('div',{className:'sf-progress-fill',style:{width:value+'%'}})))}
  const ranked=(summary?.finalGroups||summary?.groups||[]).slice().sort((a,b)=>({high:0,medium:1,low:2}[a.priority]??1)-({high:0,medium:1,low:2}[b.priority]??1));
  const groupsShown=showGroups?ranked:ranked.slice(0,8);
  const methodsShown=methods.slice(0,methodLimit);
  return h('div',{className:'sf-ai-area'},
   h('h3',{style:{marginTop:20}},'上传资料 · 全文提取'),
   h('p',{className:'sf-sub'},'一次点击依次处理全部可解析文本；逐段保存、支持暂停与失败续跑。'),
   h('div',{className:'sf-field'},h('label',null,'上传 PDF / EPUB / DOCX / TXT / MD（≤12MB）'),h('input',{type:'file',accept:'.pdf,.epub,.docx,.txt,.md',disabled:busy||active,onChange:e=>{const f=e.target.files?.[0];if(f)uploadFile(f);e.target.value=''}})),
   documents.length?h('div',{className:'sf-field'},h('label',null,'当前文档'),h('select',{value:current?.id||'',disabled:active||busy,onChange:e=>{setDocId(e.target.value);setAnalyzeResult(null);setProposal(null);setShowMethods(false);setMethodLimit(6)}},documents.map(d=>h('option',{key:d.id,value:d.id},`${d.name} (${Math.round(d.characters/1000)}k字${d.truncated?'，已截断':''})`)))):h('div',{className:'sf-note'},'尚无资料。请上传文件开始。'),
   current?.truncated?h('div',{className:'sf-note sf-alert'},'注意：该文档超过当前80万字解析上限，仅分析已保存的前80万字。即使进度显示100%，也不代表覆盖原始全书。'):null,
   legacyRisk?h('div',{className:'sf-note sf-alert'},'旧版可能发生候选截断：v0.2.2 最多保存100条方法。本次虽然显示段落100%，但可能遗漏部分候选。',btn('备份并重新分析此文档',resetDocument,'mini',busy)):null,
   ModelPicker(),
   current?progressBar(analyzeJob?.active?analyzeJob.completed:analyzed,analyzeJob?.active?analyzeJob.total:total,'文档段落分析'):null,
   h('div',{className:'sf-toolbar',style:{marginTop:12}},
    btn(complete?'已完成全部可解析段落':analyzed?'继续一键分析全文':'一键分析全文',runCompleteAnalysis,'primary',busy||!current||!consent||!modelChoice||complete),
    analyzeJob?.active?btn(pauseRequested.current?'已请求暂停':'暂停（本段结束后）',()=>{pauseRequested.current=true;setAnalyzeJob(x=>({...x,phase:'pausing'}))},'mini',pauseRequested.current):null,
    total?h('span',{className:'sf-tag '+(complete?'good':'warn')},`成功处理 ${analyzed}/${total} 段 · 原文匹配方法 ${verifiedCount}/${methods.length}`):null),
   emptyChunks?h('p',{className:'sf-note sf-alert'},`${emptyChunks} 个段落没有提取到可用方法：这表示段落已处理，不代表其中没有知识。需要时可备份后重新分析。`):null,
   analyzeJob?.active?h('p',{className:'sf-progress-hint',role:'status'},pauseRequested.current?'正在等待当前段落完成后暂停…':`正在处理第 ${Math.min(analyzeJob.completed+1,analyzeJob.total||1)} 段；每段完成后自动保存。`):null,
   analyzeJob?.phase==='error'?h('p',{className:'sf-dangertext',role:'alert'},`上次分析中断：${analyzeJob.error}。已完成段落不会丢失，点击「继续一键分析全文」重试。`):null,
   complete?h('div',{className:'sf-next-step'},
     h('div',{className:'sf-between'},h('div',null,h('b',null,'下一步：统一规划 Skill，而不是逐条生成'),h('p',{className:'sf-sub'},'将已提取的方法交给能力架构，自动识别任务、合并重复能力、查找已有 Skill，最后由你确认数量。')),
     btn('进入能力架构 · 自动合并与规划',()=>planDocument(p.slug,current.id),'primary',busy||!current),
     summary?.groups?.length?h('p',{className:'sf-caption'},'历史 '+(summary.finalGroups||summary.groups).length+' 项建议仅供参考，不再对应独立的 Skill 数量。'):null),
     summary?progressBar(synthesisJob?.active?synthesisJob.completed:summary.nextMethod,synthesisJob?.active?synthesisJob.total:summary.totalMethods,'方法归并进度'):null,
     synthesisJob?.phase==='finalizing'?h('p',{className:'sf-progress-hint'},'正在执行跨批次合并与去重，请勿切换项目…'):null,
     synthesisJob?.active&&synthesisJob?.phase!=='finalizing'?btn('暂停归并（本批结束后）',()=>{pauseRequested.current=true;setSynthesisJob(x=>({...x,phase:'pausing'}))},'mini',pauseRequested.current):null,
     summary?.groups?.length?h('div',{className:'sf-summary-list'},
       h('h3',{style:{margin:'15px 0 6px'}},`旧版方法聚类参考（${ranked.length} 项，并非 ${ranked.length} 个独立 Skill）`),
       h('p',{className:'sf-caption'},`共 ${summary.totalMethods} 条原始方法，关联进推荐的 ${coveredIds.size} 条。未关联的可能是重复、相关性低或证据不足，请从下方原始列表复核。`),
       ...groupsShown.map((g,i)=>h('div',{className:'sf-group',key:g.id},h('div',{className:'sf-between'},h('b',null,`${i+1}. ${g.name}`),h('span',{className:'sf-tag '+(g.priority==='high'?'good':'')},g.priority==='high'?'优先':g.priority==='medium'?'一般':'低优先级')),h('p',{className:'sf-sub'},g.reason),h('div',{className:'sf-between',style:{marginTop:9}},h('span',{className:'sf-caption'},`关联 ${g.methodIds.length} 条原文候选方法 · ${g.evidenceCount||0} 条有可核查摘录`),h('span',{className:'sf-tag'},'等待统一规划')))),
       ranked.length>8?btn(showGroups?'收起':'展开全部推荐',()=>setShowGroups(!showGroups),'mini'):null):null):null,
   methods.length?h('div',{className:'sf-methods'},h('div',{className:'sf-between',style:{margin:'18px 0 8px'}},h('h3',null,`原始候选方法（${methods.length} 条）`),btn(methodLimit>=methods.length?'收起':`再看 ${Math.min(20,methods.length-methodLimit)} 条`,()=>setMethodLimit(x=>x>=methods.length?6:Math.min(methods.length,x+20)),'mini')),
     h('p',{className:'sf-sub'},'默认收起冗长列表。这里是逐段提取结果，不代表已经筛选为独立 Skill。'),
     ...methodsShown.map((m,i)=>h('div',{className:'sf-issue',key:(m.id||m.chunkIndex+':'+m.name)+':'+i},h('span',{className:'sf-dot',style:{background:m.verified?'#3c996d':'#d19b5b'}}),h('div',{style:{flex:1}},h('b',null,m.name),h('p',null,m.problem),h('p',null,m.verified?`第 ${m.chunkIndex} 段 · ${m.evidence.length} 条原文逐字匹配（仍需复核）`:`第 ${m.chunkIndex} 段 · 无匹配短引`)),h('span',{className:'sf-tag'},'方法参考')))):null,
   null, // Historical proposals are preserved in storage but new creation must use Architect.
   false&&proposal?.sourceTitle?h('div',{ref:proposalPanel,className:'sf-panel',style:{marginTop:15}},
     h('h3',null,'候选 Skill 草稿'),
     h('p',{className:'sf-sub'},'来源：'+proposal.sourceTitle+' · 请求编号 '+proposal.requestId),
     proposal.attempts?.some(x=>!x.success)?h('details',null,h('summary',null,'生成诊断与模型候选'),h('pre',{className:'sf-code'},JSON.stringify(proposal.attempts,null,2))):null,
     ...DRAFT_FIELDS.map(key=>h(Field,{key,label:labels[key]||key,value:proposal.draft[key],multiline:!['title','description'].includes(key),
       onChange:value=>setProposal(old=>({...old,draft:{...old.draft,[key]:value}}))})),
     h('div',{className:'sf-toolbar'},
       btn('确认创建独立 Skill',applyProposal,'primary',busy||DRAFT_FIELDS.some(key=>!proposal.draft[key]?.trim())),
       btn('重新生成',()=>generateProposal(proposal.groupId?{groupId:proposal.groupId,regenerate:true}:{chunkIndex:proposal.method.chunkIndex,methodName:proposal.method.name,regenerate:true}),'mini',busy||!consent||!modelChoice),
       btn('收起草稿',()=>setProposal(null),'mini',busy))):null
  );
 }
 function EvaluationAI(){
   let chosen=null;try{chosen=modelChoice?JSON.parse(modelChoice):null}catch{}
   const cases=String(p.testPlan||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,24);
   const relevant=(data.modelRuns||[]).filter(x=>x.slug===p.slug&&x.revision===p.revision&&!x.stale&&x.provider===chosen?.provider&&x.model===chosen?.model&&x.bundleHash===p.build?.bundleHash);
   const covered=new Set();for(const run of relevant){for(let i=0;i<(run.cases||[]).length;i++){const c=run.cases[i];if(c.verdict!=='error'&&c.baseline?.text&&c.skilled?.text)covered.add(run.startCase+i)}}
   let nextCase=0;while(nextCase<cases.length&&covered.has(nextCase))nextCase++;
   const last=relevant[0];const r=evalReport&&evalReport.slug===p.slug&&evalReport.revision===p.revision&&evalReport.provider===chosen?.provider&&evalReport.model===chosen?.model&&!evalReport.stale?evalReport:last;
   async function runEval(){
     if(runningJob.current||!consent||!chosen){message('请选择模型并确认发送测试场景');return}
     if(info?.capabilities?.backgroundEvals!==true){message('后台 Evals 需要 v0.3.4 Host，当前版本：'+(info?.version||'未知'));return}
     const saved=await action(()=>call('/save',savePayload(p)),null,'保存当前 Skill');if(!saved)return;
     setEvalJob({active:true,phase:'starting',caseIndex:null,total:cases.length});
     const args={slug:p.slug,provider:chosen.provider,model:chosen.model};
     runningJob.current=true;setBusy(true);
     try{
       if(saved.build?.revision!==saved.revision){await call('/build',{slug:p.slug});const fresh=await refresh();const latest=fresh.projects.find(x=>x.slug===p.slug);if(latest)setEdit(latest);}
       const qp=new URLSearchParams(args).toString();
       const status=await call('/eval-progress?'+qp);
       const startCase=evalOffset>=0?evalOffset:status.nextCase;
       setEvalJob({active:true,phase:'running',caseIndex:startCase,total:status.totalCases});
       if(startCase>=status.totalCases){message('该模型下所有案例已测试完成；如需重测请选择「从第1条重测」');return}
       const task=await call('/job-start',{operation:'model-eval',...args,startCase,maxCases:1,allowModelSend:true});
       message(`正在后台执行第 ${startCase+1}/${status.totalCases} 条测试，结果将自动保存…`);
       await waitForJob(task.id);
       const fresh=await refresh();const results=(fresh.modelRuns||[]).filter(x=>x.slug===p.slug&&x.revision===saved.revision&&x.provider===chosen.provider&&x.model===chosen.model);
       setEvalJob({active:false,phase:'completed',caseIndex:startCase,total:status.totalCases});
       if(results[0]){setEvalReport(results[0]);if(results[0].stale)message('测试运行期间 Skill 被修改，结果标为过期；请重新测试当前版本');else message('真实模型评测已保存，可继续下一条。')}
       setEvalOffset(evalOffset>=0&&startCase+1<status.totalCases?startCase+1:-1);
     }catch(e){message('后台 Evals 失败：'+e.message)}finally{setEvalJob(x=>x?.active?{...x,active:false,phase:'stopped'}:x);runningJob.current=false;setBusy(false)}
   }
   return h('div',{className:'sf-ai-area'},
     h('h3',{style:{marginTop:20}},'真实模型 A/B 评测'),
     h('p',{className:'sf-sub'},'同一案例调用基础模型和加载 Skill 的模型。结果逐条存盘，关闭页面后会从未覆盖案例继续；关键词断言不代表语义质量。'),
     h('div',{className:'sf-note'},'案例示例：用户要求制定2027年OKR，但目标口径未明确 || 待确认,统计口径'),
     ModelPicker(),
     evalJob?.active?h('p',{className:'sf-progress-hint',role:'status'},evalJob.caseIndex===null?'正在提交评测任务…':`后台模型评测进行中：第 ${evalJob.caseIndex+1}/${evalJob.total} 条。正在等待基础模型与加载 Skill 模型的输出。`):null,
     h('div',{className:'sf-progress-wrap'},h('div',{className:'sf-between'},h('b',null,'当前模型评测进度'),h('span',{className:'sf-progress-pct'},`${covered.size}/${cases.length} · ${cases.length?Math.round(covered.size/cases.length*100):0}%`)),h('div',{className:'sf-progress-track',role:'progressbar','aria-label':'模型评测完成进度','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':cases.length?Math.round(covered.size/cases.length*100):0},h('div',{className:'sf-progress-fill',style:{width:(cases.length?Math.round(covered.size/cases.length*100):0)+'%'}}))),
     h('div',{className:'sf-toolbar'},btn(evalOffset>=0?`重测第 ${evalOffset+1} 条`:'运行下一条真实 Evals',runEval,'primary',busy||!consent||!modelChoice||!cases.length||(nextCase>=cases.length&&evalOffset<0)),btn('从第1条重测',()=>{setEvalOffset(0);setEvalReport(null)},'mini',busy)),
     r?h('div',{style:{marginTop:16}},
       h('div',{className:'sf-pipeline'},[['符合字面断言',r.pass],['不符合',r.fail],['需人工审核',r.needsReview],['调用错误',r.errors]].map(([l,n])=>h('div',{key:l,className:'sf-metric'},h('b',null,n),h('small',null,l)))),
       ...(r.cases||[]).map(c=>h('div',{key:c.id,className:'sf-panel',style:{margin:'10px 0'}},h('div',{className:'sf-between'},h('b',null,c.input),h('span',{className:'sf-tag '+(c.verdict==='pass'?'good':c.verdict==='fail'?'bad':'warn')},c.verdict)),h('p',{className:'sf-sub'},'判定依据：'+c.criterion),c.error?h('p',{className:'sf-dangertext'},c.error):h('div',null,h('p',{className:'sf-sub'},'基础输出'),h('pre',{className:'sf-code'},c.baseline?.text||'（无）'),h('p',{className:'sf-sub'},'加载 Skill 输出'),h('pre',{className:'sf-code'},c.skilled?.text||'（无）')))),
       btn('针对失败生成修复候选',async()=>{const r2=await runAi('/repair-proposal',{slug:p.slug,runId:r.id},'已生成修复建议，未自动写入');if(r2)setProposal(r2)},'mini',busy||!consent||!modelChoice||r.stale),
       proposal?.draft?h('div',{className:'sf-panel',style:{marginTop:12}},h('h3',null,'修复建议（未应用）'),h('pre',{className:'sf-code'},JSON.stringify(proposal.draft,null,2)),btn('人工确认并应用修复建议',async()=>{if(!confirm('确认替换当前 Skill 字段？'))return;const v=await action(()=>call('/save',{slug:p.slug,revision:p.revision,...proposal.draft}),'修复草稿已应用，请重新运行 Evals');if(v){setProposal(null);setEvalOffset(-1);setEvalReport(null)}},'primary',busy)):null):null);
 }

 const projects=data.projects||[];const pubs=data.publications||[];const runs=data.runs||[];const p=edit;const activePub=p?pubs.find(x=>x.slug===p.slug&&x.active):null;const staticChecks=p?currentCheck():[];const valid=staticChecks.filter(x=>x.passed).length;
 function FormStage(){if(!p)return null;
 const put=(key,val)=>setEdit(old=>({...old,[key]:val}));const fields=(keys,multi=[])=>keys.map(key=>h(Field,{key,label:labels[key],value:p[key],onChange:v=>put(key,v),multiline:multi.includes(key),rows:key==='steps'?6:4}));
 if(stage===0&&(p.derivedFrom||p.blueprintId))return h(React.Fragment,null,h('h3',null,'第一步 · 已关联的来源资料'),h('div',{className:'sf-note'},`该 Skill 来源于 ${p.derivedFrom?.projectSlug||'已批准蓝图'}。原书文件仍保存在原项目，当前只携带选中方法的来源指纹和短引。`),...(p.sourceReferences||[]).map((r,i)=>h('div',{key:i,className:'sf-panel',style:{marginTop:12}},h('b',null,r.name),h('p',{className:'sf-sub'},`SHA-256 ${r.sha256||'未记录'} · 已关联 ${(r.methods||[]).length} 条来源方法`))),btn('继续查看能力定义',()=>setStage(1),'primary'));
 if(stage===0)return h(React.Fragment,null,h('h3',null,'第一步 · 上传资料'),h('p',{className:'sf-sub'},'上传后自动记录文件名、文件指纹和可核验引用，不再要求补填来源信息。'),h('div',{className:'sf-field'},h('label',null,'来源类型'),h('select',{value:p.sourceType,onChange:e=>put('sourceType',e.target.value)},Object.entries(types).map(([k,v])=>h('option',{key:k,value:k},v)))),h('div',{className:'sf-note'},'资料默认保存在本机。请使用有权处理的材料；只有你明确勾选确认并触发分析时，才向所选模型发送文档片段。'),SourceAI());
 if(stage===1)return h(React.Fragment,null,h('h3',null,'第二步 · 把知识变成能力'),p.derivedFrom?h('div',{className:'sf-note'},`派生自 ${p.derivedFrom.projectSlug}；该 Skill 仅保留所选方法的来源证据，不会改写原书分析项目。`):null,h('p',{className:'sf-sub'},'定义触发、输入、决策过程、输出和禁止动作，而不是做章节摘要。'),...fields(['title','description','purpose','trigger','inputs','outputs','steps','rules','limits'],['purpose','trigger','inputs','outputs','steps','rules','limits']));
 if(stage===2)return h(React.Fragment,null,h('div',{className:'sf-between'},h('h3',null,'第三步 · 生成 Skill 草稿'),btn('保存并生成文件',async()=>{if(!await action(()=>call('/save',savePayload(p))))return;const result=await action(()=>call('/build',{slug:p.slug}),'草稿文件已生成，未写入生产 Skill 目录');if(result)setBuildResult(result)},'primary',busy)),h('p',{className:'sf-sub'},'将生成 SKILL.md、来源登记、输出模板和 Evals 测试计划。'),h('div',{className:'sf-note',style:{marginTop:15}},'生成过程为结构化模板编译，不代表已经调用模型理解全书。'),buildResult?h('div',null,h('p',{className:'sf-caption'},`草稿：${buildResult.path} · SHA256 ${buildResult.hash.slice(0,16)}…`),h('pre',{className:'sf-code'},buildResult.preview)):p.build?h('div',{className:'sf-note',style:{marginTop:13}},`已构建 revision ${p.build.revision}，Hash ${p.build.hash.slice(0,16)}…。如需看文件预览，请再次点击生成。`):h('div',{className:'sf-empty'},'尚未生成文件'));
 if(stage===3)return h(React.Fragment,null,h('div',{className:'sf-between'},h('h3',null,'第四步 · 质量实验室'),btn('保存并运行结构校验',async()=>{if(!await action(()=>call('/save',savePayload(p))))return;await action(()=>call('/lint',{slug:p.slug}),'已记录结构校验（独立于模型测试）')},'primary',busy)),h('div',{className:'sf-note',style:{margin:'10px 0 14px'}},'8 项检查只验证结构。下方真实模型 Evals 会分别调用基础模型和加载 Skill 的模型并保存输出；关键词断言不是语义质量评估。'),checkStatus(staticChecks),h('div',{className:'sf-section-title'},'模型测试场景'),h(Field,{label:'测试计划（每行一个案例）',value:p.testPlan,onChange:v=>put('testPlan',v),multiline:true,rows:7,readOnly:Boolean(p.blueprintId)}),p.blueprintId?h(EvaluationV2,{key:p.slug,project:p,call,waitForJob,modelChoice,consent,picker:ModelPicker(),onChanged:async()=>{const fresh=await refresh();const updated=fresh.projects?.find(x=>x.slug===p.slug);if(updated)setEdit({...updated});}}):EvaluationAI(),btn('复制模型评测任务提示词',()=>{const prompt=`请评测 Skill「${p.title}」。输入场景：\n${p.testPlan}\n请逐项输出：测试输入、模型输出、可观察断言、通过/失败、错误归因；禁止把结构检查当作模型运行结果。`;navigator.clipboard?.writeText(prompt).then(()=>message('评测任务已复制')).catch(()=>message('剪贴板不可用，请手动复制'));}));
 return h(React.Fragment,null,h('h3',null,'第五步 · 审核发布'),h('p',{className:'sf-sub'},'只允许发布到个人 ~/.dsh/skills，不触碰其他业务工作区。'),h('div',{className:'sf-note',style:{marginTop:14}},'发布前请查看当前构建的评测门禁，并审核实际输出。'),h('div',{className:'sf-section-title'},`结构检查 ${valid}/8 · ${valid===8?'可进入人工审批':'请先修复缺失项目'}`),checkStatus(staticChecks),h(Field,{label:`输入技能 ID「${p.slug}」确认发布`,value:publishSlug,onChange:setPublishSlug}),h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:approve,onChange:e=>setApprove(e.target.checked)}),'我已审核输出，明确批准发布到个人 Skill 目录'),h('label',{className:'sf-confirm'},h('input',{type:'checkbox',checked:noEvals,onChange:e=>setNoEvals(e.target.checked)}),'我理解模型测试和关键词匹配不等于完整业务质量认证，仅申请发布实验版本'),h('div',{className:'sf-toolbar',style:{marginTop:20}},btn('发布实验版',()=>action(()=>call('/publish',{slug:p.slug,revision:p.revision,confirmSlug:publishSlug,approved:approve,...(modelChoice?JSON.parse(modelChoice):{}),acceptNoModelEvals:noEvals,replace:Boolean(activePub)}),'已发布个人实验版；请在真实业务中验证'),'primary',busy||valid!==8||publishSlug!==p.slug||!approve||!noEvals),activePub?.backupPath?btn('回滚上个版本',()=>action(()=>call('/rollback',{slug:p.slug,revision:p.revision,confirmSlug:publishSlug,approved:approve}),'已回滚到上一版本'),'danger',busy||publishSlug!==p.slug||!approve):null));
 }
 function main(){
 if(page==='architect')return h(ArchitectPanel,{call,waitForJob,models,initialSourceId:architectFocus,onOpen:async slug=>{const state=await refresh();const project=state.projects.find(x=>x.slug===slug);if(project)open(project)}});

 if(page==='home')return h(React.Fragment,null,h('div',{className:'sf-welcome'},h('div',null,h('div',{className:'sf-eyebrow'},'YOUR AI WORKBENCH'),h('h1',{className:'sf-title'},'让知识成为可执行的能力。'),h('p',{className:'sf-lead'},'来源可追溯、规则可审查、结构可评测、版本可回滚。')),btn('规划新能力',()=>go('architect'),'primary')),h('div',{className:'sf-stat-grid'},[['Skill 项目',projects.length,'实际存储'],['开发草稿',projects.filter(x=>x.status==='draft').length,'待进一步完善'],['静态校验记录',runs.length,'不等于模型 Evals'],['实验版发布',pubs.filter(x=>x.active).length,'需人工审批']].map(([lab,num,tip])=>h('div',{className:'sf-stat',key:lab},h('div',{className:'label'},lab),h('strong',null,num),h('small',null,tip)))),h('div',{className:'sf-two'},h(Card,null,h('div',{className:'sf-between'},h('h3',null,'从哪里开始'),h('span',{className:'sf-tag purple'},'4 种入口')),h('p',{className:'sf-sub'},'先定义要解决的问题，再封装为可复用 Skill。'),h('div',{className:'sf-choice-grid'},[['book','▤','从一本书开始','方法、规则与场景'],['sop','≡','从 SOP 开始','从流程到可验收操作'],['problem','◇','从业务问题开始','先明确目标与限制'],['existing','↗','改进现有 Skill','针对失败迭代版本']].map(([t,i,n,desc])=>h('button',{key:t,className:'sf-choice',onClick:()=>{if(t==='book'||t==='sop'){setNewData({title:'',slug:'',sourceType:t,purpose:''});setCreating(true)}else{setArchitectFocus('');go('architect')}}},h('div',{className:'sf-glyph'},i),h('b',null,n),h('span',null,desc)))),h('div',{className:'sf-steps-mini'},stageNames.map((n,i)=>h('span',{key:n},`${i+1} ${n}${i===4?'':'  →'}`)))),h(Card,null,h('h3',null,'需要处理'),h('p',{className:'sf-sub'},'项目状态来自本地真实数据。'),projects.length?h('div',null,...projects.slice(0,5).map(x=>h('div',{className:'sf-issue',key:x.slug},h('span',{className:'sf-dot'}),h('div',{style:{flex:1}},h('b',null,x.title),h('p',null,x.sourceType==='book'?'上传书籍并检查 AI 提取结果':'继续完善并通过质量校验')),btn('打开',()=>open(x),'mini')))):h('div',{className:'sf-empty'},'没有待处理项目，先导入资料或规划能力。'))),h('h2',{className:'sf-section-title'},'最近开发项目'),projectTable(projects.slice(0,6)));
 if(page==='projects')return h(React.Fragment,null,heading('开发项目','项目拥有独立来源、规则、静态检查记录和发布版本。',()=>setCreating(true)),h('div',{className:'sf-toolbar',style:{margin:'22px 0 13px'}},h('input',{className:'sf-field',style:{margin:0,padding:10,border:'1px solid #e0e4ec',borderRadius:8,minWidth:240},placeholder:'搜索项目名称或 ID',value:search,onChange:e=>setSearch(e.target.value)})),projectTable(projects.filter(x=>(x.title+' '+x.slug).toLowerCase().includes(search.toLowerCase()))));
 if(page==='detail'&&p)return h(React.Fragment,null,h('button',{className:'sf-link',onClick:()=>go('projects')},'← 返回开发项目'),h('div',{className:'sf-welcome'},h('div',null,h('div',{className:'sf-eyebrow'},'SKILL DEVELOPMENT'),h('h1',{className:'sf-title'},p.title),h('p',{className:'sf-lead'},`${types[p.sourceType]} · ${p.slug} · revision ${p.revision}`)),h('div',{className:'sf-toolbar'},badge(p.status),btn('保存修改',()=>action(()=>call('/save',savePayload(p)),'内容已持久化'),'primary',busy))),h('div',{className:'sf-stage-tabs'},stageNames.map((n,i)=>h('button',{className:'sf-stage '+(stage===i?'active':''),key:n,onClick:()=>runningJob.current?message('分析时请先暂停后切换步骤'):setStage(i)},h('span',{className:'sf-step-index'},i+1),n))),h('div',{className:'sf-detail-grid'},h(Card,null,FormStage()),h(Card,null,h('div',{className:'sf-between'},h('h3',null,'质量与溯源'),h('span',{className:'sf-tag purple'},'本地检查')),h('div',{className:'sf-pipeline'},[['规则',8],['满足',valid],['待修复',8-valid]].map(([l,n])=>h('div',{key:l,className:'sf-metric'},h('b',null,n),h('small',null,l)))),h('p',{className:'sf-section-title'},'目前缺失的事项'),checkStatus(staticChecks.filter(x=>!x.passed)),h('div',{className:'sf-note',style:{marginTop:16}},`草稿：${info?.storageRoot||'读取中'}。当前页面不会访问现有 HR、售后或公司资料。`))));
 if(page==='lab')return h(React.Fragment,null,heading('质量实验室','结构校验与模型 Evals 分开统计，不以配置检查替代真实运行。'),h('div',{className:'sf-two',style:{marginTop:20}},h(Card,null,h('h3',null,'最近结构检查'),runs.length?runs.slice(0,30).map(r=>h('div',{className:'sf-issue',key:r.createdAt+r.slug},h('span',{className:'sf-dot',style:{background:r.passed?'#3b956e':'#d9a257'}}),h('div',{style:{flex:1}},h('b',null,r.slug),h('p',null,`${r.score}/${r.total} · revision ${r.revision} · ${new Date(r.createdAt).toLocaleString()}`)),h('span',{className:'sf-tag '+(r.passed?'good':'warn')},r.passed?'结构通过':'待修复'))):h('div',{className:'sf-empty'},'尚未运行结构检查')),h(Card,null,h('h3',null,'真实模型 Evals'),h('p',{className:'sf-sub'},'模型运行记录与静态检查分开保存。自动断言仅判断必含关键词，不等同业务质量。'),(data.modelRuns||[]).length?(data.modelRuns||[]).slice(0,12).map(r=>h('div',{className:'sf-issue',key:r.id},h('div',null,h('b',null,r.slug+' · '+r.model),h('p',null,`rev ${r.revision} · pass ${r.pass} / fail ${r.fail} / review ${r.needsReview} / error ${r.errors}`)))):h('div',{className:'sf-note',style:{marginTop:15}},'尚无真实模型调用记录'))));
 if(page==='library')return h(React.Fragment,null,heading('技能库','展示本工厂发布的版本。原有业务 Skills 默认不扫描、不修改。'),h('h2',{className:'sf-section-title'},'已发布实验版'),pubs.length?h('div',{className:'sf-table-wrap'},h('table',{className:'sf-list'},h('thead',null,h('tr',null,...['Skill','发布状态','校验模式','时间'].map(x=>h('th',{key:x},x)))),h('tbody',null,pubs.map(x=>h('tr',{key:x.id},h('td',null,h('b',{className:'sf-bold'},x.slug),h('div',{className:'sf-muted'},x.target)),h('td',null,h('span',{className:'sf-tag '+(x.active?'good':'')},x.active?'当前版本':'历史版本')),h('td',null,x.modelEvaluated?'已有真实模型调用（非认证）':'尚无模型调用'),h('td',null,new Date(x.at).toLocaleString())))))):h('div',{className:'sf-panel sf-empty'},'没有发布记录。'));
 if(page==='sources')return h(React.Fragment,null,heading('知识来源','通过项目上传 PDF / EPUB / DOCX / 文本资料；保存来源哈希、章节证据，并保持引用可追溯。'),h('div',{className:'sf-table-wrap',style:{marginTop:20}},h('table',{className:'sf-list'},h('thead',null,h('tr',null,...['项目','资料名称','已上传','可核验方法'].map(x=>h('th',{key:x},x)))),h('tbody',null,projects.map(x=>h('tr',{key:x.slug,onClick:()=>open(x)},h('td',{className:'sf-bold'},x.title),h('td',null,x.sourceTitle||x.documents?.[0]?.name||'尚未上传'),h('td',null,`${(x.documents||[]).length} 份`),h('td',null,`${(x.analysis||[]).filter(m=>m.verified).length} 条`)))))));
 return h(React.Fragment,null,heading('设置','独立个人空间，不覆盖任何现有业务工作台。'),h('div',{className:'sf-two',style:{marginTop:20}},h(Card,null,h('h3',null,'存储路径'),h('div',{className:'sf-field'},h('label',null,'个人项目目录'),h('div',{className:'sf-code'},info?.storageRoot||'读取中')),h('div',{className:'sf-field'},h('label',null,'发布目标目录'),h('div',{className:'sf-code'},info?.publishRoot||'读取中')),h('div',{className:'sf-note'},'不支持用户自定义任意写入路径，避免意外修改公司现有工作区。')),h(Card,null,h('h3',null,'运行能力'),h('p',{className:'sf-lead'},`插件版本 ${info?.version||'0.1.0'}`),h('div',{className:'sf-check'},h('span',{className:'sf-flag',style:{color:'#39966a'}},'✓'),h('b',null,'项目持久化 / 草稿生成 / 结构校验')),h('div',{className:'sf-check'},h('span',{className:'sf-flag',style:{color:'#39966a'}},'✓'),h('b',null,'人工审批 / 同名保护 / 回滚')),h('div',{className:'sf-check'},h('span',{className:'sf-flag',style:{color:'#d5a15a'}},'!'),h('b',null,`DSH 模型服务：${models.connected?'已检测到接口':'未连接'} · 可用模型 ${models.models?.length||0} 个`)))));
 }
 function heading(t,sub,fn){return h('div',{className:'sf-welcome'},h('div',null,h('div',{className:'sf-eyebrow'},'SKILL FACTORY'),h('h1',{className:'sf-title'},t),h('p',{className:'sf-lead'},sub)),fn?btn('+ 新建项目',fn,'primary'):null)}
 function projectTable(arr){return arr.length?h('div',{className:'sf-table-wrap'},h('table',{className:'sf-list'},h('thead',null,h('tr',null,...['项目','来源','状态','版本','更新时间'].map(x=>h('th',{key:x},x)))),h('tbody',null,arr.map(x=>h('tr',{key:x.slug,onClick:()=>open(x)},h('td',null,h('div',{className:'sf-bold'},x.title),h('div',{className:'sf-muted'},x.slug)),h('td',null,types[x.sourceType]),h('td',null,badge(x.status)),h('td',null,'rev '+x.revision),h('td',null,new Date(x.updatedAt).toLocaleDateString())))))):h('div',{className:'sf-panel sf-empty'},'暂无项目，点击右上角创建第一个 Skill。')}
 return h('div',{className:'sf-root'},h('aside',{className:'sf-side'},h('div',{className:'sf-brand'},h('span',null,'S/'),h('b',null,'Skill Factory')),h('div',{className:'sf-side-caption'},'WORKSPACE'),...navItems.map(([key,label,glyph])=>h('button',{key,className:'sf-nav '+(page===key||page==='detail'&&key==='projects'?'active':''),onClick:()=>go(key),title:label},h('span',{className:'sf-nav-icon'},glyph),h('span',{className:'sf-nav-label'},label))),h('div',{className:'sf-side-bottom'},'个人空间 · DSH 原生插件')),h('div',{className:'sf-main'},h('header',{className:'sf-topbar'},h('div',{className:'sf-crumb'},'个人工作台 / ',h('strong',null,page==='detail'?p?.title||'开发项目':navItems.find(x=>x[0]===page)?.[1]||'总览')),h('div',{className:'sf-top-actions'},h('span',{className:'sf-tag'},'本地私有'),btn('规划新能力',()=>go('architect'),'primary mini'))),h('main',{className:'sf-main-content'},main(),h('div',{className:'sf-caption',style:{marginTop:35}},'Skill Factory v'+VERSION+' · 模型评测结果需业务复核'),toast?h('div',{className:'sf-toast',role:'status'},toast,btn('×',()=>setToast(''),'mini')):null)),creating?h('div',{className:'sf-overlay',role:'dialog','aria-modal':true},h('div',{className:'sf-modal'},h('h2',null,'创建资料分析项目'),h('p',{className:'sf-sub'},'这里只用于上传和提取知识；最终需要几个 Skill 由能力架构统一规划。'),h(Field,{label:'项目名称',value:newData.title,onChange:v=>setNewData(x=>({...x,title:v}))}),h(Field,{label:'技能 ID（英文小写，例：okr-strategy-coach）',value:newData.slug,onChange:v=>setNewData(x=>({...x,slug:v}))}),h('div',{className:'sf-field'},h('label',null,'来源类型'),h('select',{value:newData.sourceType,onChange:e=>setNewData(x=>({...x,sourceType:e.target.value}))},Object.entries(types).map(([k,v])=>h('option',{key:k,value:k},v)))),h(Field,{label:'要解决的问题',value:newData.purpose,onChange:v=>setNewData(x=>({...x,purpose:v})),multiline:true}),h('div',{className:'sf-between',style:{marginTop:17}},btn('取消',()=>setCreating(false)),btn('创建资料项目',async()=>{const result=await action(()=>call('/create',newData),'项目已创建');if(result){setCreating(false);open(result)}},'primary',busy)))):null,h(HelpDock,{page,stage}));
}
function styleOnce(){const id='personal-skill-factory-style';let el=document.getElementById(id);if(!el){el=document.createElement('style');el.id=id;document.head.appendChild(el)}el.textContent=theme}
function FactoryIcon(){return h('svg',{viewBox:'0 0 24 24',width:17,height:17,fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round'},h('path',{d:'M4 19V7l6 4V7l6 4V5h4v14H4Z'}),h('path',{d:'M8 16h2m4 0h2'}))}
const inject=['slots','locale'];
function apply(ctx){
 styleOnce();
 ctx.effect(()=>ctx.locale.register(NS,{zh:CN,en:EN}),'skill-factory: locale');
 ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:ID,locale:NS,inject:()=>({})},()=>h(App)));
 ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:ID,order:12,label:()=>ctx.locale.bind(NS)('panel'),locale:NS},FactoryIcon));
}
module.exports={inject,apply};

return module.exports;
}});
