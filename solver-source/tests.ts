import assert from 'node:assert/strict';
import fs from 'node:fs';
import loadHighs from 'highs';
import {OmlModel,type Input} from './oml-model';
import {solveOML,inputFromBundle} from './oml-solve';
const highs=await loadHighs();
const unit=(id:string,outside=0)=>({unit_id:id,credits:1,seat_cap:20,movable:1,is_pgpx_or_fabm:outside});
const ses=(u:string,t:number,type='class')=>({unit_id:u,date:'2026-12-01',slot:String(t),session_type:type});
const a:Input={units:['A','B','C'].map(x=>unit(x)),sessions:[ses('A',1),ses('A',2),ses('B',1),ses('B',3),ses('C',3),ses('C',4)],groups:{},students:{S1:['A','B'],S2:['B','C'],S3:['A','B']}};
for(const [theta,short,asked]of [[0,3,0],[.25,0,2],[1,0,1]]){
  const result=solveOML(highs,a,{floor:2,maxCredits:2,theta,version:'without',timeLimit:15});
  assert.equal(result.plan?.short,short);assert.equal(result.plan?.asked.length,asked);assert.equal(result.optimal,true);assert.equal(result.step2?.started_from_plan,true);
  console.log('Test A passed:',theta,short,asked);
}
const b:Input={units:[unit('A'),unit('P',1),unit('Q',1)],sessions:[ses('A',1),ses('P',2),ses('Q',3)],groups:{},students:{S1:['A']}};
const rb=solveOML(highs,b,{floor:3,maxCredits:3,theta:0,version:'with',timeLimit:15});assert.equal(rb.optimal,true);assert.equal(rb.plan?.short,1);assert.equal(rb.plan?.allocation.S1.length,2);console.log('Test B outside-unit cap passed');
const blocked:Input={units:[unit('A'),unit('B')],sessions:[ses('A',1,'block'),ses('B',1,'block')],groups:{},students:{S1:['A','B']}};
const rc=solveOML(highs,blocked,{floor:2,maxCredits:2,theta:1,version:'without',timeLimit:15});assert.equal(rc.optimal,true);assert.equal(rc.plan?.short,1);assert.equal(rc.plan?.moves.length,0);console.log('Immutable block test passed');
const cap:Input={...b,units:[{...unit('A'),seat_cap:1}],sessions:[ses('A',1)],students:{S1:['A'],S2:['A']}};
const rd=solveOML(highs,cap,{floor:1,maxCredits:1,theta:0,version:'without',timeLimit:15});assert.equal(rd.optimal,true);assert.equal(rd.plan?.short,1);assert.equal(rd.plan?.credits,1);console.log('Seat capacity test passed');
const bundlePath=process.env.OML_BUNDLE_PATH??['../public/lab/data/oml_project.json'].find(p=>fs.existsSync(p));
if(!bundlePath)throw Error('Set OML_BUNDLE_PATH to the verified oml_project.json file');
const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
let checked=0;
for(const survey of bundle.surveys){
  const input=inputFromBundle(bundle,survey.id);
  for(const r of survey.runs){
    const model=new OmlModel(input,{floor:r.floor,version:r.version,theta:r.theta});
    const plan={allocation:r.allocation,moves:r.moves.map((m:any)=>({unit_id:m.unit,date:m.date,slot:String(m.slot)})),short:r.short,credits:r.credits,students_short:r.students_short,asked:r.asked};
    model.validate(plan);model.validateVector(model.start(plan));checked++;
  }
}
assert.equal(checked,48);console.log('All 48 saved runs passed independent TypeScript validation and exact MILP row validation');
