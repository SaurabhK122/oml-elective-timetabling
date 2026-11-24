import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PythonRandom,runHeuristic} from './oml-heuristic';
import {OmlModel,type Plan} from './oml-model';
const fixtures=JSON.parse(fs.readFileSync(new URL('./heuristic-oracle.json',import.meta.url),'utf8'));
for(const row of fixtures.randomSamples){const rng=new PythonRandom(row.seed);assert.deepEqual(row.lengths.map((n:number)=>rng.randbelow(n)),row.indexes,`Python random.Random compatibility for seed ${row.seed}`);}
const normalized=(p:Plan)=>({...p,allocation:Object.fromEntries(Object.entries(p.allocation).sort().map(([i,us])=>[i,[...us].sort()])),moves:[...p.moves].sort((a,b)=>JSON.stringify([a.unit_id,a.date,a.slot]).localeCompare(JSON.stringify([b.unit_id,b.date,b.slot]))),asked:[...p.asked].sort()});
let checked=0;
for(const row of fixtures.cases){const result=runHeuristic(row.input,row.settings);new OmlModel(row.input,row.settings).validate(result.plan);assert.deepEqual(normalized(result.plan),row.expected,row.name);checked++;}
assert.equal(checked,23);console.log(`${checked} heuristic full-plan Python oracle comparisons and four Python RNG sequences passed`);
const zeroRounds={...fixtures.cases.at(-1).settings,heuristicRounds:0};const first=runHeuristic(fixtures.cases.at(-1).input,zeroRounds);const second=runHeuristic(fixtures.cases.at(-1).input,zeroRounds);assert.equal(first.rounds_completed,0);assert.deepEqual(first.plan,second.plan);console.log('Zero-round behavior and repeatability passed');
// The source's cover search assumes its supplied course/floor grid. Imported
// datasets can put the smallest cover above the hard ceiling: never allot it.
const overshootInput={units:[{unit_id:'A',credits:1.5,seat_cap:1,movable:1,is_pgpx_or_fabm:0},{unit_id:'B',credits:1.5,seat_cap:1,movable:1,is_pgpx_or_fabm:0}],sessions:[{unit_id:'A',date:'2026-12-01',slot:'1',session_type:'class'},{unit_id:'B',date:'2026-12-01',slot:'2',session_type:'class'}],groups:{},students:{S1:['A','B']}};
const overshoot=runHeuristic(overshootInput,{floor:2,maxCredits:2.5,theta:0,version:'without'});
assert.equal(overshoot.plan.credits,1.5);assert.equal(overshoot.plan.short,.5);
const aboveCeiling=runHeuristic({...overshootInput,units:overshootInput.units.map(u=>({...u,credits:3}))},{floor:2,maxCredits:2.5,theta:0,version:'without'});
assert.equal(aboveCeiling.plan.credits,0);assert.equal(aboveCeiling.plan.short,2);
const emptyDemand=runHeuristic({...overshootInput,students:{S1:[]}},{floor:2,maxCredits:2.5,theta:0,version:'without'});
assert.equal(emptyDemand.plan.credits,0);assert.equal(emptyDemand.plan.short,2);
console.log('Imported-data ceilings, unreachable floors, and empty demand passed');
