/** Single source of truth for the optional in-workbench help dock. */
export const HELP_CONTENT = Object.freeze({
  home:{title:'总览',purpose:'知识先入库，真实任务再开发 Skill。',prerequisite:'有书籍/SOP 或明确任务。',steps:['知识库中按需查找来源。','创建/改进 Skill 中输入需要交付的真实工作。','已创建草稿走 Evals 和人工发布。'],done:'明确下一步，Skill 数量不是目标。',next:'进入知识库或创建/改进 Skill。'},
  projects:{title:'开发项目',purpose:'查看独立 Skill 工程及草稿版本。',prerequisite:'已经创建项目或批准能力蓝图。',steps:['选择项目进入五个开发阶段。','保存修改后注意 revision 变化。','从「评测」运行真实模型测试，质量合格后才申请发布。'],done:'每个工程有自己的来源、版本和质量记录。',next:'打开一个项目，依次检查来源、能力、封装、评测、发布。'},
  detail:{title:'Skill 开发',purpose:'按阶段完成一个独立 Skill 的构建、测试与审核。',prerequisite:'项目已创建；蓝图项目须先完成能力审批。',steps:['来源：上传资料并检查解析、分析进度和引文。','能力：检查触发条件、输入、步骤和人工确认边界。','封装：构建 SKILL.md 并完成结构检查。','评测：运行真实 A/B，必要时生成修复候选并试跑。','发布：所有门禁满足后仍需你明确批准。'],done:'当前构建通过质量要求，且审批、版本、引用均可追溯。',next:'失败时先定位原因；不要为提高评分修改冻结断言。'},
  task:{title:'创建 / 改进 Skill',purpose:'从一项明确的真实业务任务出发，优先查重，再复用、增强或新建。',prerequisite:'任务有明确交付；调用 AI 前选模型并确认发送资料片段。',steps:['描述任务和验收输出。','选择相关知识来源。','审阅模型建议及已有 Skill。','明确同意后仅创建开发草稿，继续真实评测和发布审批。'],done:'产生可追溯方案或复用建议，不自动发布。',next:'打开开发草稿进入质量评测。'},
  architect:{title:'高级 · 能力架构',purpose:'决定是否需要 Skill、应新建、复用、增强、合并还是拆分。',prerequisite:'至少有一份登记来源或一项实际业务任务。',steps:['登记资料或业务任务。','选择模型并确认需要发送的内容。','发现任务并审阅 CREATE/REUSE/ENHANCE/MERGE/SPLIT/REFERENCE/REJECT 决策。','先批准蓝图，再生成工程。'],done:'每项能力有明确任务边界、来源证据与用户批准记录。',next:'打开已生成的 Skill 工程进行构建和 Evals。'},
  lab:{title:'质量实验室',purpose:'比较基础模型和 Skill 的任务表现，而非只看结构分数。',prerequisite:'构建当前版本，准备有效、已批准的测试材料。',steps:['先校验 Fixture 是否足以完成预期任务。','运行 Execution A/B；同时检查独立关键风险判定。','通过真实 DSH 会话检查 Trigger Eval，记录实际加载证据。','未通过时只修改 Skill，保留原测试与失败记录。'],done:'质量门禁通过且有真实模型调用证据；未验证不得标记为通过。',next:'需要时试跑自动修复候选，完成全套回归后提交人工发布审批。'},
  library:{title:'技能库',purpose:'维护已经发布的 Skill 资产。',prerequisite:'存在人工批准且通过门禁的发布。',steps:['核对 Skill 版本与生效状态。','后续修改需要产生新版本并重新测试。','不覆盖来源不明的外部 Skill。'],done:'发布、回滚记录完整且对应的文件哈希一致。',next:'返回项目执行回归或检查新版质量。'},
  sources:{title:'知识库',purpose:'独立检索本机保存的书籍、SOP 与解析文本。',prerequisite:'已经上传可解析的 PDF、EPUB、DOCX、TXT 或 MD。',steps:['导入资料项目并上传文件。','输入问题，本地检索不发送模型。','如需模型回答，明确确认仅发送本次检索摘录。','有实际任务再转创建/改进 Skill。'],done:'能够看到明确来源和解析文本位置；无法检索时不凭空回答。',next:'转创建/改进 Skill；扫描 PDF 仍需先 OCR。'},
  settings:{title:'设置',purpose:'检查插件 Host、模型连接和存储位置。',prerequisite:'DSH 已启动。',steps:['确认 Host 版本与客户端一致。','在 DSH 中启用模型提供商；插件本身不索取另一套 API Key。','修改前备份项目数据，勿清空历史评测。'],done:'能读取项目状态和模型列表，无 Host 版本错误。',next:'返回总览继续。'},
});
export const HELP_FAQ = Object.freeze([
 {q:'结构检查 8/8 是否代表 Skill 可用？',a:'不代表。结构检查只验证完整性，还需要有效用例、真实触发和 Execution A/B。'},
 {q:'为什么 Evals 显示 INVALID_FIXTURE？',a:'测试缺少原文或必需附件、断言与材料冲突时应修正测试材料；保留原冻结版本。'},
 {q:'NEEDS_REVIEW 为什么不能发布？',a:'裁判或证据尚不能形成可靠判断，必须人工复核，不能默认通过。'},
 {q:'自动修复会覆盖原 Skill 吗？',a:'不会。修复先进入独立候选，再执行小批冻结用例试跑；只有人工确认才会应用为新的草稿 revision。应用后仍须重跑全套 Evals。'},
 {q:'模型调用会上传哪些内容？',a:'仅在用户勾选模型内容发送确认后，当前任务所需的草稿、测试材料或方法片段才送到所选 DSH 模型提供商。'},
 {q:'为什么需要人工批准？',a:'生成与评测不等于有权发布。系统必须保留最终发布审批，不能修改其他未经管理的 Skill。'},
 {q:'扫描版 PDF 能直接提取吗？',a:'目前不能保证。扫描型 PDF 需要单独的 OCR 流程；解析失败时应显示缺失，不可冒充全文分析完成。'},
]);
export function helpSearch(query,section='home'){
 const q=String(query||'').trim().toLowerCase();
 const item=HELP_CONTENT[section]||HELP_CONTENT.home;
 return {item,faq:q?HELP_FAQ.filter(x=>(x.q+x.a).toLowerCase().includes(q)):HELP_FAQ};
}
