/// <reference lib="webworker" />
import loadHighs from 'highs';
import {solveOML} from './oml-solve';
import {runHeuristic} from './oml-heuristic';
export const ENGINE_VERSION='oml-2026-11-24-seven-step-v1';
let runtime:ReturnType<typeof loadHighs>|undefined;
let busy=false;
let logSink:((message:string)=>void)|undefined;
self.onmessage=async(event)=>{
  const {id,input,settings,wasmUrl,method='solver'}=event.data;
  if(busy){self.postMessage({id,type:'error',error:'An execution is already running'});return;}
  busy=true;
  try{
    if(!['solver','heuristic','both'].includes(method))throw Error('Choose solver, heuristic, or both');
    const results:Record<string,unknown>={};
    logSink=settings.showSolverLog?message=>self.postMessage({id,type:'log',message}):undefined;
    for(const chosen of method==='both'?['heuristic','solver']:[method]){
      const started=performance.now();
      const progress=(phase:string)=>self.postMessage({id,type:'progress',phase:`${chosen==='solver'?'Integer program':'Heuristic'}: ${phase}`});
      let result;
      if(chosen==='heuristic')result=runHeuristic(input,settings,progress);
      else{
        progress('Loading solver');
        runtime??=loadHighs({print:message=>logSink?.(message),printErr:message=>logSink?.(message),locateFile:()=>wasmUrl??new URL('/lab/solver-assets/highs.wasm',self.location.origin).href});
        result=solveOML(await runtime,input,settings,progress);
      }
      if(!result.plan)throw Error(result.message??`${chosen} finished without a feasible plan. This execution has not replaced any recent run.`);
      results[chosen]={...result,method:chosen,total_seconds:(performance.now()-started)/1000};
    }
    self.postMessage({id,type:'result',results,engineVersion:ENGINE_VERSION});
  }catch(e){self.postMessage({id,type:'error',error:e instanceof Error?e.message:String(e)});}
  finally{busy=false;logSink=undefined;}
};
// Cancellation terminates this worker, including an in-progress synchronous WASM
// call, and creates a new worker for the next execution. Partial runs never commit.
