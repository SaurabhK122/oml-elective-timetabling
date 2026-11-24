const fs=require('fs'), vm=require('vm'), assert=require('assert/strict');
(async()=>{
 const bytes=fs.readFileSync('../public/lab/solver-assets/highs.wasm');
 let result,fail;
 const context=vm.createContext({console,performance,URL,WebAssembly,TextDecoder,TextEncoder,Response,Uint8Array,Float64Array,Int32Array,ArrayBuffer,SharedArrayBuffer,BigInt64Array,BigUint64Array,setTimeout,clearTimeout,WorkerGlobalScope:function(){},fetch:async(url)=>{assert.equal(url,'https://local.test/solver-assets/highs.wasm');return new Response(bytes,{headers:{'Content-Type':'application/wasm'}});},location:{origin:'https://local.test'},postMessage:v=>{if(v.type==='result')result=v.results;if(v.type==='error')fail=v.error;}});
 context.self=context;
 const module=new vm.SourceTextModule(fs.readFileSync('../public/lab/oml.worker.js','utf8'),{context,initializeImportMeta:meta=>meta.url='https://local.test/oml.worker.js'});
 await module.link(()=>{throw Error('Unexpected dependency import')});await module.evaluate();
 const input={units:['A','B','C'].map(unit_id=>({unit_id,credits:1,seat_cap:20,movable:1,is_pgpx_or_fabm:0})),sessions:[['A',1],['A',2],['B',1],['B',3],['C',3],['C',4]].map(([unit_id,slot])=>({unit_id,slot:String(slot),date:'2026-12-01',session_type:'class'})),groups:{},students:{S1:['A','B'],S2:['B','C'],S3:['A','B']}};
 await context.onmessage({data:{id:'test',input,settings:{floor:2,maxCredits:2,theta:.25,version:'without',timeLimit:10},wasmUrl:'https://local.test/solver-assets/highs.wasm'}});
 if(fail)throw Error(fail);assert(result);assert.equal(result.solver.plan.short,0);assert.equal(result.solver.plan.asked.length,2);assert(result.solver.optimal);await context.onmessage({data:{id:'both',method:'both',input,settings:{floor:2,maxCredits:2,theta:.25,version:'without',timeLimit:null,heuristicRounds:10,heuristicPatience:5}}});
 if(fail)throw Error(fail);assert(result.solver.plan);assert(result.heuristic.plan);assert.equal(result.heuristic.plan.short,0);
 console.log('Browser-branch module worker test passed with fetched WASM: shortfall 0, 2 courses asked, both stages optimal.');
})().catch(e=>{console.error(e);process.exit(1)});
