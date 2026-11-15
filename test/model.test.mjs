import test from 'node:test';
import assert from 'node:assert/strict';
import { draftFields, parseJson, validateDraft, requestDraft, generatePrompt, oneShot } from '../src/model.mjs';

const draft = Object.fromEntries(draftFields.map(field => [field, field + ' value']));
const prompt=generatePrompt({method:{name:'method'},project:{},excerpt:'source'});
const opts={provider:'fixture',model:'fixture'};
const asJson=fields=>({text:JSON.stringify(fields),usage:{outputTokens:10}});
const {trigger,...missing}=draft;

test('parse whole object and JSON fence; decline arrays, empty, prose and truncation',()=>{
  assert.deepEqual(parseJson('  ```json\n{"d":1}\n``` '),{d:1});
  for (const text of ['','[{"ok":true}]','text {"k":1}','{"key":','{}{}']) assert.throws(()=>parseJson(text));
});
test('normalize exact aliases and text arrays without fabricating trigger',()=>{
  assert.equal(validateDraft({...missing,whenToUse:['Use for review','Use for revisions']}).trigger,'Use for review\nUse for revisions');
  assert.throws(()=>validateDraft({...missing,inputs:['a',12],outputs:'  '}),e=>{
    assert.deepEqual(Object.keys(e.details.issues),['trigger','inputs','outputs']);
    assert.equal(e.details.candidate.trigger,undefined);
    return e.code==='DRAFT_SCHEMA';
  });
  assert.throws(()=>validateDraft({...missing,whenToUse:'one',triggers:'different'}),/trigger/);
});
test('repair malformed and schema-invalid attempts, retaining diagnostic and token evidence',async()=>{
  const responses=[{text:'{"trigger":'},asJson(missing),asJson(draft)];
  const calls=[];
  const result=await requestDraft(async input=>{calls.push(input);return responses.shift();},opts,prompt);
  assert.equal(result.status,'ready');
  assert.deepEqual(result.draft,draft);
  assert.equal(result.attempts[0].code,'JSON_INVALID');
  assert.equal(result.attempts[1].issues.trigger,'缺失或为空');
  assert.equal(result.attempts[2].usage.outputTokens,10);
  assert.match(calls[1].prompt,/previousOutput/);
  assert.match(calls[2].prompt,/DRAFT_SCHEMA/);
  assert.ok(calls[1].maxTokens>calls[0].maxTokens);
});
test('exhausted repairs preserve partial fields but never invent trigger',async()=>{
  const r=await requestDraft(async()=>asJson(missing),opts,prompt);
  assert.equal(r.status,'needs-review');
  assert.equal(r.attempts.length,3);
  assert.deepEqual(r.draft,missing);
  assert.equal(r.issues.trigger,'缺失或为空');
  assert.equal(JSON.parse(r.candidateOutput).title,draft.title);
});
test('SDK exceptions and absent finish cannot pass; token truncation can be repaired',async()=>{
  const sdk=(kind)=>({llm:{listProviders:async()=>[{id:'fixture'}],async *stream(){
    yield {type:'text-delta',text:'{"x":'};
    yield {type:'usage',usage:{outputTokens:123}};
    if(kind==='throw')throw Error('provider unavailable');
    if(kind)yield {type:'finish',reason:{kind}};
  }}});
  await assert.rejects(oneShot(sdk(),{...opts,...prompt}),e=>e.code==='MODEL_NO_FINISH'&&e.details.usage.outputTokens===123);
  const failed=await requestDraft(x=>oneShot(sdk('throw'),x),opts,prompt);
  assert.equal(failed.attempts.length,1);
  assert.equal(failed.attempts[0].code,'MODEL_EXCEPTION');
  let calls=0;
  const repaired=await requestDraft(x=>++calls===1?oneShot(sdk('max-tokens'),x):asJson(draft),opts,prompt);
  assert.equal(repaired.status,'ready');
  assert.equal(repaired.attempts[0].finish,'max-tokens');
});
