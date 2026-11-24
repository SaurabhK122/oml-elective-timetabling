/** Full-population integration check against the supplied updated notebook runs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runHeuristic,ENGINE_HEURISTIC_VERSION} from './oml-heuristic';
import {inputFromBundle} from './oml-solve';
const bundle=JSON.parse(fs.readFileSync(new URL('../public/lab/data/oml_project.json',import.meta.url),'utf8'));
const records=[];
for(const survey of bundle.surveys){for(const theta of [0,.2]){
  const settings={floor:6,version:'with' as const,theta},input=inputFromBundle(bundle,survey.id),result=runHeuristic(input,settings);
  const expected=survey.runs.find((r:any)=>r.method==='heuristic'&&r.floor===6&&r.version==='with'&&r.theta===theta);
  for(const field of ['short','students_short','credits']as const)assert.equal(result.plan[field],expected[field],`${survey.id} theta ${theta} ${field}`);
  assert.deepEqual(result.plan.asked,[...expected.asked].sort());assert.equal(result.plan.moves.length,expected.moves.length);
  const rows=(allocation:Record<string,string[]>)=>Object.entries(allocation).sort().map(([i,us])=>[i,[...us].sort()]);
  const allocationMatches=JSON.stringify(rows(result.plan.allocation))===JSON.stringify(rows(expected.allocation));
  const moves=(ms:any[])=>ms.map(m=>[m.unit_id??m.unit,m.date,String(m.slot)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const movesMatch=JSON.stringify(moves(result.plan.moves))===JSON.stringify(moves(expected.moves));
  // Source Python sets do not guarantee cross-runtime tie order. Metrics and
  // feasibility must match; record whether the entire original plan matches too.
  records.push({survey:survey.id,theta,students:Object.keys(input.students).length,short:result.plan.short,credits:result.plan.credits,asked:result.plan.asked.length,moves:result.plan.moves.length,seconds:result.seconds,rounds:result.rounds_completed,allocation_matches_source:allocationMatches,moves_match_source:movesMatch});
  console.log(JSON.stringify(records.at(-1)));
}}
fs.writeFileSync(new URL('./HEURISTIC_VALIDATION.json',import.meta.url),JSON.stringify({engine:ENGINE_HEURISTIC_VERSION,source:'Updated master notebook, supplied saved plans',cases:records},null,2)+'\n');
