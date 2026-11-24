const fs=require('fs');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();
 const script=fs.readFileSync('../public/lab/oml.worker.js','utf8');
 const wasm='data:application/wasm;base64,'+fs.readFileSync('../public/lab/solver-assets/highs.wasm').toString('base64');
 const output=await page.evaluate(async({script,wasm})=>{
  const worker=new Worker(URL.createObjectURL(new Blob([script],{type:'application/javascript'})),{type:'module'});
  const input={units:['A','B','C'].map(unit_id=>({unit_id,credits:1,seat_cap:20,movable:1,is_pgpx_or_fabm:0})),sessions:[['A',1],['A',2],['B',1],['B',3],['C',3],['C',4]].map(([unit_id,slot])=>({unit_id,slot:String(slot),date:'2026-12-01',session_type:'class'})),groups:{},students:{S1:['A','B'],S2:['B','C'],S3:['A','B']}};
  return await new Promise((resolve,reject)=>{worker.onmessage=e=>{if(e.data.type==='result'){worker.terminate();resolve(e.data.results.solver)}else if(e.data.type==='error'){worker.terminate();reject(Error(e.data.error))}};worker.onerror=e=>reject(Error(e.message));worker.postMessage({id:'test',input,settings:{floor:2,maxCredits:2,theta:.25,version:'without',timeLimit:10},wasmUrl:wasm});setTimeout(()=>reject(Error('browser timeout')),30000)});
 },{script,wasm});
 if(output.plan.short!==0||output.plan.asked.length!==2||!output.optimal)throw Error(JSON.stringify(output));
 console.log('Chromium module worker + actual WASM passed Test A 25% with optimal result',JSON.stringify({short:output.plan.short,asked:output.plan.asked,stages:[output.step1.status,output.step2.status]}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
