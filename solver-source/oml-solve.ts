import loadHighs from 'highs';
import {OmlModel,type Input,type Settings,type Plan} from './oml-model';
export interface StageReport {status:string; found_plan:boolean; objective:number|null;bound:number|null;gap:number|null;seconds:number;started_from_plan:boolean}
type Highs=Awaited<ReturnType<typeof loadHighs>>;
const finite=(x:number)=>Number.isFinite(x)?x:null;
/** Accept an initialized runtime so one worker can reuse WASM without memory leaks. */
export function solveOML(highs:Highs,input:Input,settings:Settings,onProgress?:(phase:string)=>void){
  onProgress?.('Building model');const oml=new OmlModel(input,settings);
  const run=(stage:1|2,first?:Plan)=>{
    onProgress?.(`Solving stage ${stage}`);const started=performance.now(),extra=first?oml.locks(first):[];
    const model=highs.createModel({format:'lp',data:oml.toLP(stage,extra)});
    try{
      model.options.set({output_flag:oml.settings.showSolverLog,mip_rel_gap:0,...(oml.settings.timeLimit===null?{}:{time_limit:oml.settings.timeLimit})});
      // LP parsers need not preserve column order; map every variable by its safe name.
      const indexes=oml.upper.map((_,i)=>model.getColByName(`v${i}`));
      if(first){const src=oml.start(first);oml.validateVector(src,extra);const ordered=new Float64Array(src.length);indexes.forEach((j,i)=>ordered[j]=src[i]);model.setSolution({colValue:ordered});}
      model.run();const code=model.getModelStatus();
      const status=Object.entries(highs.constants.modelStatus).find(([,v])=>v===code)?.[0]??`status ${code}`;
      const info=(name:string)=>{try{return finite(Number(model.info.get(name)));}catch{return null;}};
      const found=model.info.get('primal_solution_status')===highs.constants.solutionStatus.feasible;
      const scale=stage===1?1:-0.25;
      const report:StageReport={status:status==='timeLimit'?'time limit':status,found_plan:found,objective:found?scale*model.getObjectiveValue():null,bound:info('mip_dual_bound')===null?null:scale*info('mip_dual_bound')!,gap:info('mip_gap'),seconds:(performance.now()-started)/1000,started_from_plan:!!first};
      if(!found)return {plan:null,report};
      const raw=model.getSolution().colValue,vector=Float64Array.from(indexes,j=>raw[j]);oml.validateVector(vector,extra);
      const plan=oml.decode(vector);oml.validate(plan);return {plan,report};
    }finally{model.dispose();}
  };
  const first=run(1);
  if(!first.plan)return {plan:null,step1:first.report,step2:null,message:first.report.status==='time limit'?'Stage 1 reached its time limit without a feasible incumbent. Increase the limit or inspect a saved study run.':`Stage 1 returned ${first.report.status} without a feasible incumbent. No result is being presented.`,model_size:{variables:oml.upper.length,constraints:oml.rows.length}};
  const second=run(2,first.plan);
  // Preserve a verified first-stage plan if native stage 2 fails to return its warm start.
  const raw=second.plan??first.plan;
  if(raw.short>first.plan.short+1e-8||raw.asked.length>first.plan.asked.length||raw.credits<first.plan.credits-1e-8)throw Error('Stage 2 violated priority locks');
  onProgress?.('Validating and removing unnecessary moves');const plan=oml.cleanup(raw);
  return {plan,step1:first.report,step2:second.report,optimal:first.report.status==='optimal'&&second.report.status==='optimal',message:second.plan?null:'Stage 2 did not return a feasible plan; showing the independently validated stage 1 incumbent.',model_size:{variables:oml.upper.length,constraints:oml.rows.length}};
}

/** Adapter for oml_project.json produced from the user-provided notebook. */
export function inputFromBundle(bundle:any,surveyId:string):Input{
  const survey=bundle.surveys.find((s:any)=>s.id===surveyId);if(!survey)throw Error('Unknown survey');
  const groups:Record<string,string[]>={};for(const row of bundle.sameContentGroups)(groups[row.group_id]??=[]).push(row.unit_id);
  return {units:bundle.units,sessions:bundle.sessions,students:survey.preferences,groups};
}

/** Validate an imported dataset against exactly the same rules as a live run. */
export function validateInput(input:Input,settings:Settings){new OmlModel(input,settings);return true;}
