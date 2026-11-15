import test from 'node:test';
import assert from 'node:assert/strict';
import { portfolioPacket, validatePortfolioProposal, editsForPortfolio } from '../src/portfolio-optimizer.mjs';

const cap=(n,decision='CREATE')=>({id:'cap-'+n,name:'Goal method '+n,reason:'Repeatable goal review '+n,decision,
 taskIds:['task-'+n],evidenceIds:['evidence-'+n],assetIds:[],partitions:[]});
const task=(n,actor='Manager')=>({id:'task-'+n,name:'Review goal '+n,actor,trigger:'Quarterly review '+n,
 inputs:'Submitted goals '+n,output:'Auditable review '+n,recurring:true,evidenceIds:['evidence-'+n],methodIds:[]});
const group=(name,capabilityIds)=>({name,capabilityIds,sharedGoal:'Shared objective management workflow',
 reason:'Same actor and business goal; specialized triggers remain independent',roleBoundary:'Managers only; no privileged external writes',
 exclusions:'No publishing or unauthorized account access'});

test('Portfolio optimizer reduces eight capabilities to one Skill without erasing any task or reference',()=>{
 const candidates=[...Array.from({length:8},(_,i)=>cap(i)),cap(8,'REFERENCE'),cap(9,'REJECT')];
 const tasks=Object.fromEntries(Array.from({length:10},(_,i)=>['task-'+i,task(i)]));
 const p=validatePortfolioProposal({groups:[group('Goal management coach',Array.from({length:8},(_,i)=>'cap-'+i))]},candidates,tasks);
 assert.equal(p.status,'ready');assert.equal(p.skillCount,1);
 assert.equal(p.originalCreateCount,8);assert.equal(p.protectedCapabilityIds.length,2);
 const edits=editsForPortfolio(p,candidates);
 assert.deepEqual(edits.map(e=>e.decision),['MERGE','REFERENCE','REJECT']);
 assert.equal(edits[0].taskIds.length,8);
 assert.equal(new Set(edits.flatMap(e=>e.taskIds)).size,10);
 assert.deepEqual(portfolioPacket(candidates,tasks).eligibleCapabilities.length,8);
});

test('Portfolio optimizer refuses missing, repeated and protected capability IDs',()=>{
 const candidates=[cap(0),cap(1),cap(2,'REFERENCE')];
 const tasks=Object.fromEntries(Array.from({length:3},(_,i)=>['task-'+i,task(i)]));
 const check=groups=>validatePortfolioProposal({groups},candidates,tasks);
 assert.throws(()=>check([group('Partial',['cap-0'])]),/完整覆盖/);
 assert.throws(()=>check([group('Dup',['cap-0','cap-0']),group('Other',['cap-1'])]),/重复/);
 assert.throws(()=>check([group('Protected',['cap-0','cap-2']),group('Other',['cap-1'])]),/越界|禁止/);
 assert.throws(()=>check([group('Unknown',['cap-0','cap-ghost']),group('Other',['cap-1'])]),/越界|禁止/);
});

test('Portfolio optimizer rejects cross-role merges and unreviewed boundary data',()=>{
 const candidates=[cap(0),cap(1)];
 const tasks={'task-0':task(0,'Manager'),'task-1':task(1,'Finance Controller')};
 assert.throws(()=>validatePortfolioProposal({groups:[group('Unsafe',['cap-0','cap-1'])]},candidates,tasks),/跨角色/);
 // Singletons are allowed without falsely claiming permission equivalence.
 const p=validatePortfolioProposal({groups:[group('Manager',['cap-0']),group('Finance',['cap-1'])]},candidates,tasks);
 assert.equal(p.skillCount,2);
 const broad={...task(0),trigger:'One'};
 const cs={...cap(0),taskIds:[...Array.from({length:20},(_,i)=>'b-'+i)]};
 const ds=Object.fromEntries(cs.taskIds.map((id,i)=>[id,{...broad,id,trigger:'Different trigger '+i,output:'Different output '+i,actor:'Manager'}]));
 ds['task-1']=task(1);
 assert.throws(()=>validatePortfolioProposal({groups:[group('Hidden',['cap-0','cap-1'])]},[cs,cap(1)],ds),/未展示/);
});

test('Portfolio optimizer protects existing enhanced, split and reused capabilities',()=>{
 const c0=cap(0);const c1={...cap(1,'ENHANCE'),assetIds:['managed']};
 const c2={...cap(2,'SPLIT'),partitions:[{name:'Audit A',taskIds:['task-2']},{name:'Audit B',taskIds:['task-3']}],taskIds:['task-2','task-3']};
 const c3=cap(4,'REUSE');const tasks=Object.fromEntries(Array.from({length:5},(_,i)=>['task-'+i,task(i)]));
 const p=validatePortfolioProposal({groups:[group('Review',['cap-0'])]},[c0,c1,c2,c3],tasks);
 assert.equal(p.skillCount,4);
 const edits=editsForPortfolio(p,[c0,c1,c2,c3]);
 assert.deepEqual(edits.map(x=>x.decision),['CREATE','ENHANCE','CREATE','CREATE','REUSE']);
 assert.deepEqual(edits.flatMap(x=>x.taskIds),['task-0','task-1','task-2','task-3','task-4']);
});
