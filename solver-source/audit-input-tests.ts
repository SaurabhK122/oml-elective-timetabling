/** Regression checks for editable and imported main-module inputs. */
import assert from 'node:assert/strict';
import loadHighs from 'highs';
import {OmlModel, type Input, type Settings} from './oml-model';
import {solveOML} from './oml-solve';

const input:Input={
  units:[
    {unit_id:'A',credits:1,seat_cap:1,movable:1,is_pgpx_or_fabm:0},
    {unit_id:'B',credits:.75,seat_cap:1,movable:1,is_pgpx_or_fabm:0},
    {unit_id:'P',credits:.5,seat_cap:1,movable:0,is_pgpx_or_fabm:1},
  ],
  sessions:['A','B','P'].map((unit_id,i)=>({unit_id,date:'2026-12-01',slot:String(i+1),session_type:'class'})),
  groups:{},students:{S1:['A','B']},
};
const settings:Settings={floor:1.75,maxCredits:2.25,version:'with',theta:0,timeLimit:10};
const highs=await loadHighs();
const run=(i:Input=input,s:Settings=settings)=>{
  const result=solveOML(highs,i,s);
  assert(result.optimal);assert(result.plan);
  return result.plan;
};
// Changing these inputs changes the actual mathematical constraints.
assert.equal(run().credits,2.25);
assert.equal(run(input,{...settings,maxCredits:1.75}).credits,1.75);
assert.equal(run(input,{...settings,version:'without'}).credits,1.75);
assert.equal(run(input,{...settings,outsideLimit:0}).credits,1.75);
assert.equal(run({...input,units:input.units.map(u=>u.unit_id==='B'?{...u,seat_cap:0}:u)}).credits,1.5);
assert.equal(run({...input,groups:{Same:['A','B']}}).short,.25);
assert.equal(run(input,{...settings,timeLimit:null}).credits,2.25);

for(const change of [
  {sessions:input.sessions.map((s,i)=>i? s:{...s,date:'2026-02-30'})},
  {sessions:input.sessions.map((s,i)=>i? s:{...s,slot:Infinity})},
  {units:input.units.map((u,i)=>i? u:{...u,seat_cap:1e20})},
  {units:input.units.map((u,i)=>i? u:{...u,credits:1e20})},
  {units:input.units.map((u,i)=>i? u:{...u,movable:2})},
  {groups:{Same:['A','B'],Duplicate:['A']}},
  {students:{S1:['A','A']}},
])assert.throws(()=>new OmlModel({...input,...change},settings));
console.log('Editable input audit: 7 optimal solves and 7 malformed import checks passed.');
