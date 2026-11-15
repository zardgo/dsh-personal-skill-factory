import { error, key, timestamp } from './architecture-store.mjs';

// Portfolio optimization is a second decision layer. It groups already validated
// CREATE/MERGE capabilities into coherent Skill deliverables; it never collapses
// their task, evidence or method identities in storage.
const eligible = new Set(['CREATE','MERGE']);
const executable = new Set(['CREATE','MERGE','ENHANCE','SPLIT']);
export const PORTFOLIO_AUTO_THRESHOLD = 3;
export const PORTFOLIO_INSTRUCTION = `你是领域无关的 Skill 组合架构师。输入是已经过证据验证的候选能力，而不是需要逐项创建的 Skill。决定最小充分的最终 Skill 组合：共同业务目标、使用角色、权限范围及可以通过不同触发完成的交付，可合并为同一个 Skill 的内部能力；不同敏感权限、外部系统动作或无法共用的输出边界应分开。绝不可按章节数量决定 Skill 数量，也不可强制合并为 1 个。只处理输入的 eligibleCapabilities；既有 ENHANCE/SPLIT/REUSE/REFERENCE/REJECT 必须保持原有决策。每个 eligible capability ID 在 groups 中恰好出现一次，不许遗漏、重复或引用未知 ID。返回 JSON {"groups":[{"name":"最终 Skill 名称","capabilityIds":["已给定id"],"sharedGoal":"共同可执行目标","reason":"合并或保持独立的具体理由","roleBoundary":"使用角色和权限边界说明","exclusions":"此 Skill 不应处理的任务"}]}。若无法证明合并合理，保留独立；不要凭空补造权限事实。`;

const required=(value,label,max=600)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max)throw error('Skill 组合优化缺少'+label);
  return value.trim();
};
const list=(value,max=60)=>{
  if(!Array.isArray(value)||value.length>max)throw error('Skill 组合优化返回的数据结构无效');
  return value;
};
const unique=xs=>[...new Set(xs)];
const roles= (cap,tasks)=>unique(cap.taskIds.flatMap(id=>tasks[id]?.actor?[tasks[id].actor.trim().normalize('NFKC').toLowerCase()]:[])).sort();
const sameArray=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);

export function portfolioPacket(capabilities,tasks) {
  return {eligibleCapabilities:capabilities.filter(c=>eligible.has(c.decision)).map(c=>{
    const own=c.taskIds.map(id=>tasks[id]).filter(Boolean);
    const fields=(key,max=16)=>unique(own.map(t=>t[key]).filter(Boolean)).slice(0,max).map(v=>String(v).slice(0,160));
    return {id:c.id,name:c.name,decision:c.decision,reason:c.reason?.slice(0,300),taskCount:c.taskIds.length,
      actors:fields('actor'),triggers:fields('trigger'),outputs:fields('output'),inputs:fields('inputs'),
      omittedBoundaryExamples:['actor','trigger','output','inputs'].reduce((n,field)=>n+Math.max(0,unique(own.map(t=>t[field]).filter(Boolean)).length-16),0)};
  })};
}

export function validatePortfolioProposal(raw,capabilities,tasks) {
  const index=new Map(capabilities.map(c=>[c.id,c]));
  const target=new Set(capabilities.filter(c=>eligible.has(c.decision)).map(c=>c.id));
  const seen=new Set();
  const groups=list(raw?.groups,50).map((g,i)=>{
    const refs=list(g.capabilityIds,50);
    if(!refs.length||new Set(refs).size!==refs.length)throw error('Skill 组合存在空组或重复能力');
    for(const id of refs){if(!target.has(id)||seen.has(id))throw error('Skill 组合出现越界、重复或禁止合并的能力');seen.add(id);}
    // Different actor sets can imply different permissions. We do not have an
    // authoritative permission model, so the machine must never silently
    // approve a cross-role merge based only on prose from a model.
    if(refs.length>1){
      if(refs.some(id=>portfolioPacket([index.get(id)],tasks).eligibleCapabilities[0].omittedBoundaryExamples>0))
        throw error('能力簇包含未展示的角色或交付边界，不允许自动合并');
      const signatures=refs.map(id=>roles(index.get(id),tasks));
      if(signatures.some(signature=>!signature.length||!sameArray(signature,signatures[0])))
        throw error('跨角色能力可能涉及不同权限，请保持独立或在人工作业中审查');
      if(refs.some(id=>index.get(id).taskIds.some(tid=>tasks[tid]?.recurring!==true)))
        throw error('不能将纯知识参考或不可执行任务合并为 Skill');
    }
    return {id:key('portfolio-group',refs),name:required(g.name,'名称',150),capabilityIds:refs,
      sharedGoal:required(g.sharedGoal,'共同目标'),reason:required(g.reason,'判断理由'),
      roleBoundary:required(g.roleBoundary,'角色边界'),exclusions:required(g.exclusions,'非触发边界')};
  });
  if(seen.size!==target.size)throw error('Skill 组合没有完整覆盖全部可创建的能力；未保存不完整推荐');
  const protectedCapabilities=capabilities.filter(c=>!eligible.has(c.decision));
  const protectedSkillCount=protectedCapabilities.reduce((n,c)=>n+(!executable.has(c.decision)?0:c.decision==='SPLIT'?c.partitions.length:1),0);
  return {version:1,status:'ready',groups,protectedCapabilityIds:protectedCapabilities.map(c=>c.id),
    originalCapabilityCount:capabilities.length,originalCreateCount:capabilities.reduce((n,c)=>n+(!executable.has(c.decision)?0:c.decision==='SPLIT'?c.partitions.length:1),0),
    skillCount:groups.length+protectedSkillCount,generatedAt:timestamp()};
}

export function editsForPortfolio(portfolio,capabilities){
  if(portfolio?.status!=='ready')throw error('Skill 组合优化尚未完成，不应静默采用旧架构');
  const byId=new Map(capabilities.map(c=>[c.id,c]));
  const edits=[];
  for(const group of portfolio.groups){
    const cs=group.capabilityIds.map(id=>byId.get(id));
    if(cs.some(c=>!c))throw error('Skill 组合引用已失效的能力');
    const joined=group.capabilityIds.length>1;
    edits.push({capabilityIds:group.capabilityIds,taskIds:cs.flatMap(c=>c.taskIds),name:joined?group.name:cs[0].name,
      decision:joined?'MERGE':cs[0].decision,assetIds:joined?[]:cs[0].assetIds,
      reason:joined?group.reason:cs[0].reason});
  }
  for(const id of portfolio.protectedCapabilityIds){
    const c=byId.get(id);
    if(!c)throw error('保护能力引用已失效');
    if(c.decision==='SPLIT'){
      for(const part of c.partitions)edits.push({capabilityIds:[id],taskIds:part.taskIds,name:part.name,
        decision:'CREATE',assetIds:[],reason:'保留经审查的独立任务边界'});
    }else edits.push({capabilityIds:[id],taskIds:c.taskIds,name:c.name,decision:c.decision,assetIds:c.assetIds,reason:c.reason});
  }
  return edits;
}
