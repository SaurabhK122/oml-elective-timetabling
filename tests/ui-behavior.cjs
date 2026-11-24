const fs=require('fs');
const vm=require('vm');
const assert=require('assert/strict');
const {JSDOM}=require('jsdom');
const root=require('path').resolve(__dirname,'../public/lab');
const data=JSON.parse(fs.readFileSync(root+'/data/oml_project.json','utf8'));
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'http://localhost:8765/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;const downloads=[];const createdWorkers=[];
w.fetch=async()=>({ok:true,json:async()=>data});w.Blob=Blob;
w.URL.createObjectURL=b=>{downloads.push(b);return 'blob:test'};w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){if(this.classList.contains('brand'))this.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};w.scrollTo=()=>{};
let loadResolve;let storedRuns=[];let failSave=false;
const copy=x=>JSON.parse(JSON.stringify(x));
const api={inputFromBundle:(d,id)=>({units:d.units,sessions:d.sessions,students:d.surveys.find(x=>x.id===id).preferences,groups:{}}),validateInput:()=>true};
w.__loadAPI=async()=>api;
class WorkerMock {constructor(){this.terminated=false;createdWorkers.push(this)}postMessage(v){this.input=v}terminate(){this.terminated=true}}
w.Worker=WorkerMock;
const code=fs.readFileSync(root+'/app.js','utf8').replace("import {openRunStore, retainedRuns, fingerprint, ENGINE_VERSION} from './run-history.js';","const {openRunStore, retainedRuns, fingerprint, ENGINE_VERSION}=window.__historyAPI;").replaceAll('import.meta.url','"http://localhost:8765/app.js"').replaceAll("await import('./oml-api.js')","await window.__loadAPI()");
const tick=()=>new Promise(r=>setTimeout(r,0));
function choose(id,v){const el=w.document.getElementById(id);assert(el,`missing select ${id}`);el.value=String(v);el.dispatchEvent(new w.Event('change',{bubbles:true}));}
function click(q){const el=w.document.querySelector(q);assert(el,`missing ${q}`);el.click()}
function input(id,v){const el=w.document.getElementById(id);el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}))}
async function submit(){const before=createdWorkers.length;w.document.getElementById('live-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));for(let n=0;n<500&&w.OML.state.liveBusy&&createdWorkers.length===before;n++)await tick();}
(async()=>{
 const historyAPI=await import('../public/lab/run-history.js');
 w.__historyAPI={...historyAPI,openRunStore:async()=>({list:async()=>copy(storedRuns),save:async record=>{if(failSave)throw Error('Quota exceeded');storedRuns=historyAPI.retainedRuns(storedRuns,record);return copy(storedRuns)}})};
 await vm.runInContext('(async()=>{'+code+'})()',dom.getInternalVMContext());
 assert.equal(w.OML.selectedRun().credits,2521);assert.equal(w.OML.selectedRun().asked.length,5);let checked=0;
 for(const s of data.surveys)for(const r of s.runs){
  choose('survey',s.id);choose('floor',r.floor);choose('version',r.version);choose('theta',r.theta);choose('method',r.method);
  const got=w.OML.selectedRun();assert.equal(got.id,r.id);assert.equal(got.credits,r.credits);assert.equal(got.short,r.short);
  const kp=[...w.document.querySelectorAll('.kpi-value')].map(e=>e.textContent.replaceAll(',','').trim());
  assert(kp[0].startsWith(String(416-r.students_short)));assert.equal(Number(kp[1]),r.short);assert.equal(Number(kp[2]),r.asked.length);assert.equal(Number(kp[3]),r.credits);
  click('[data-tab="requests"]');assert.equal(w.document.querySelectorAll('#moves-table tbody tr').length,r.moves.length);
  click('[data-tab="students"]');assert.equal(w.document.querySelectorAll('#entity-table tbody tr').length,20);
  assert.equal(w.document.querySelector('#entity-table tbody tr td.code').textContent,'S001');
  const credits=w.document.querySelectorAll('#entity-table tbody tr')[0].querySelectorAll('td')[2].textContent;
  const map=Object.fromEntries(data.units.map(u=>[u.unit_id,u.credits]));assert.equal(Number(credits),r.allocation.S001.reduce((n,x)=>n+map[x],0));
  click('[data-tab="overview"]');checked++;
 }
 click('[data-tab="requests"]');click('.brand');assert.equal(w.OML.state.tab,'overview');assert.equal(w.location.hash,'#overview');assert(w.document.querySelector('.capacity-note').textContent.includes('80 seats'));click('[data-tab="method"]');assert(w.document.querySelector('.capacity-note').textContent.includes('80 seats'));
 // Selected method-specific downloads and filters.
 choose('survey','survey_9_to_10.5_credits');choose('floor',5);choose('version','with');choose('theta',0);choose('method','solver');
 click('[data-tab="students"]');input('student-search','S001');assert.equal(w.document.querySelectorAll('#entity-table tbody tr').length,1);click('[data-export="students"]');assert.equal((await downloads.at(-1).text()).split('\r\n').length,2);
 input('student-search','');const short=w.document.getElementById('short-only');short.checked=true;short.dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('#entity-table tbody tr').length,3);
 click('[data-entity="courses"]');assert.equal(w.document.querySelectorAll('#entity-table tbody tr').length,69);input('course-search','FABM');assert.equal(w.document.querySelectorAll('#entity-table tbody tr').length,6);
 click('[data-tab="method"]');click('[data-export="all-summaries"]');assert.equal((await downloads.at(-1).text()).split('\r\n').length,49);
 // Editable main-module inputs survive view changes and reach the worker unchanged.
 click('[data-tab="live"]');assert.equal(w.document.getElementById('live-limit').value,'1200');
 choose('live-survey','survey_5_to_9_credits');choose('live-method','both');choose('live-version','without');
 input('live-floor','5.25');input('live-max','8.75');input('live-theta','17');input('live-limit','60');
 input('live-penalty','1200');input('live-rounds','50');input('live-patience','20');input('live-group','8');input('live-seed','2345');
 const showLog=w.document.getElementById('live-show-log');showLog.checked=true;showLog.dispatchEvent(new w.Event('change'));
 click('[data-tab="overview"]');click('[data-tab="live"]');assert.equal(w.document.getElementById('live-floor').value,'5.25');
 await submit();let worker=createdWorkers.at(-1);assert(w.OML.state.liveBusy);assert.equal(worker.input.method,'both');
 for(const [key,value]of Object.entries({floor:5.25,maxCredits:8.75,theta:.17,version:'without',timeLimit:60,penalty:1200,heuristicRounds:50,heuristicPatience:20,heuristicGroup:8,heuristicSeed:2345,showSolverLog:true}))assert.equal(worker.input.settings[key],value,key);
 await worker.onmessage({data:{type:'progress',phase:'Stage 1'}});await worker.onmessage({data:{type:'log',message:'MIP log line'}});assert(w.document.getElementById('run-log').textContent.includes('MIP log line'));
 // A partial both-method result must not create or evict history.
 await worker.onmessage({data:{type:'result',results:{solver:{plan:null,message:'No feasible plan found (time limit).'}}}});assert(!w.OML.state.liveBusy);assert.equal(storedRuns.length,0);assert(w.document.getElementById('live-status').textContent.includes('No feasible plan'));
 await submit();worker=createdWorkers.at(-1);worker.onerror({message:'Test worker failure'});assert(!w.OML.state.liveBusy);assert.equal(w.OML.state.liveError,'Test worker failure');
 await submit();worker=createdWorkers.at(-1);click('#cancel-live');assert(worker.terminated);assert(!w.OML.state.liveBusy);await worker.onmessage({data:{type:'progress',phase:'stale'}});assert.notEqual(w.OML.state.livePhase,'stale');assert.equal(storedRuns.length,0);
 const beforeWorkers=createdWorkers.length;w.__loadAPI=()=>new Promise(r=>loadResolve=r);const pending=submit();click('#cancel-live');loadResolve(api);await pending;assert.equal(createdWorkers.length,beforeWorkers);w.__loadAPI=async()=>api;
 // Unlimited solver time and a valid low-credit custom scenario.
 const unlimited=w.document.getElementById('live-unlimited');unlimited.checked=true;unlimited.dispatchEvent(new w.Event('change'));assert(w.document.getElementById('live-limit').disabled);
 await submit();worker=createdWorkers.at(-1);assert.equal(worker.input.settings.timeLimit,null);click('#cancel-live');
 // Validate invalid settings before creating a worker.
 input('live-floor','9.5');const count=createdWorkers.length;await submit();assert.equal(createdWorkers.length,count);assert(w.OML.state.liveError.includes('minimum'));input('live-floor','5.25');
 input('live-penalty','200');await submit();assert.equal(createdWorkers.length,count);assert(w.OML.state.liveError.includes('greater than 276'));input('live-penalty','1200');
 const exemplar=data.surveys.find(s=>s.id==='survey_5_to_9_credits').runs.find(r=>r.method==='solver'&&r.floor===5&&r.version==='with'&&r.theta===.1);
 const response=(method='solver')=>({plan:{...copy(exemplar),moves:exemplar.moves.map(m=>({unit_id:m.unit??m.unit_id,date:m.date,slot:m.slot}))},step1:method==='solver'?exemplar.step1:null,step2:method==='solver'?exemplar.step2:null,total_seconds:12.5,message:null});
 async function complete(){await submit();const current=createdWorkers.at(-1);const methods=current.input.method==='both'?['solver','heuristic']:[current.input.method];await current.onmessage({data:{type:'result',results:Object.fromEntries(methods.map(method=>[method,response(method)])),engineVersion:historyAPI.ENGINE_VERSION}});return current;}
 // Four completed executions retain exactly the newest three; both methods are one execution.
 await complete();assert.equal(storedRuns.length,1);assert.equal(Object.keys(storedRuns[0].results).length,2);assert(w.OML.state.live);const oldest=storedRuns[0].id;
 click('[data-live-result="heuristic"]');assert.equal(w.OML.state.liveResultMethod,'heuristic');click('[data-live-result="solver"]');
 click('[data-export="live"]');const exported=JSON.parse(await downloads.at(-1).text());assert.deepEqual(Object.keys(exported.results),['solver','heuristic']);assert.equal(exported.settings.floor,5.25);assert.equal(exported.input.students.S001.length,worker.input.input.students.S001.length);
 click('[data-export="live-students"]');assert.equal((await downloads.at(-1).text()).split('\r\n').length,417);
 for(let n=0;n<3;n++){input('live-seed',String(2346+n));await complete();}assert.equal(storedRuns.length,3);assert(!storedRuns.some(run=>run.id===oldest));
 // Failed and cancelled runs preserve both the latest result and all three saved records.
 const previous=w.OML.state.live;const savedIDs=storedRuns.map(run=>run.id).join();await submit();worker=createdWorkers.at(-1);await worker.onmessage({data:{type:'result',results:{solver:{plan:null,message:'No incumbent'}}}});assert.equal(w.OML.state.live,previous);assert.equal(storedRuns.map(run=>run.id).join(),savedIDs);
 await submit();click('#cancel-live');assert.equal(storedRuns.map(run=>run.id).join(),savedIDs);
 // Loading restores the exact settings, dataset, full method results, and logs without a worker.
 const selected=copy(storedRuns[2]);input('live-floor','6');const workersBeforeLoad=createdWorkers.length;click('[data-tab="history"]');assert.equal(w.document.querySelectorAll('[data-load-run]').length,3);click(`[data-load-run="${selected.id}"]`);assert.equal(createdWorkers.length,workersBeforeLoad);assert.equal(w.OML.state.liveLoaded,true);assert.equal(w.document.getElementById('live-floor').value,String(selected.controls.floor));assert.equal(JSON.stringify(w.OML.state.customInput),JSON.stringify(selected.input));assert.equal(JSON.stringify(w.OML.state.liveExecution.results),JSON.stringify(selected.results));
 // A failed browser-storage transaction never removes visible or durable prior history.
 failSave=true;await complete();assert.equal(storedRuns.map(run=>run.id).join(),savedIDs);assert.equal(w.OML.state.recent.map(run=>run.id).join(),savedIDs);assert(w.OML.state.historyError.includes('Quota exceeded'));assert(w.OML.state.liveExecution);failSave=false;
 // A malformed worker result fails cleanly, leaving history untouched.
 await submit();worker=createdWorkers.at(-1);await worker.onmessage({data:{type:'result',results:{solver:{plan:{allocation:{}}},heuristic:{plan:{allocation:{}}}}}});assert(!w.OML.state.liveBusy);assert(!w.OML.state.liveSaving);assert.equal(storedRuns.map(run=>run.id).join(),savedIDs);
 // Null solve objectives are not displayed as zero.
 w.OML.state.liveExecution.results.solver.step1.objective=null;click('[data-tab="live"]');assert(w.document.querySelector('#live-result').textContent.includes('Not reported'));
 // Reloading the app reads persisted history rather than clearing it.
 await vm.runInContext('(async()=>{'+code+'})()',dom.getInternalVMContext());assert.equal(w.OML.state.recent.length,3);click('[data-tab="history"]');assert.equal(w.document.querySelectorAll('[data-load-run]').length,3);
 console.log(JSON.stringify({passed:true,saved_scenarios_checked:checked,checks:['All 48 headline metrics','All 48 method-specific faculty move lists','All 48 student allocation credits','Student search and shortfall filter','Course programme search','CSV exports (filtered and full)','Source-default solve time','No-incumbent handling','Worker error','Cancel and stale messages','Cancel during import','Preserved previous completed result','Null solver values','Editable model and heuristic settings','Unlimited time','Both-method execution grouping','Three-run retention','Fourth-run eviction','Exact history restoration without recomputation','History survives app reload','Storage-failure preservation','Malformed result handling','Complete result and table exports','Brand navigation','Visible capacity assumption'],browser_visual_validation:'Not included in this DOM-level test'},null,2));
 dom.window.close();
})().catch(e=>{console.error(e.stack);process.exit(1)});
