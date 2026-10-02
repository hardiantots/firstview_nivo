const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./sdd34-harness.cjs');
const d=load('src/shared/journey/domain.ts'),c=load('src/shared/consultation/domain.ts');
const now=new Date('2026-09-30T16:00:00Z'),id=()=>crypto.randomUUID();
const update=(s,a,time=now)=>d.reduceJourney(s,a,id(),time);
test('Makassar midnight, missing vs zero, future/backfill validation',()=>{
 assert.equal(d.localDate('2026-09-30T15:59:59Z','Asia/Makassar'),'2026-09-30');assert.equal(d.localDate(now,'Asia/Makassar'),'2026-10-01');
 let s=d.emptyJourney();assert.equal(s.daily['2026-10-01'],undefined);s=update(s,{type:'daily',date:'2026-10-01',count:0});assert.equal(s.daily['2026-10-01'].status,'reported');s=update(s,{type:'daily',date:'2026-10-01',count:null});assert.equal(s.daily['2026-10-01'].status,'unreported');assert.equal(d.estimatedSavings(s.daily['2026-10-01']),null);
 assert.throws(()=>update(s,{type:'daily',date:'2026-10-02',count:1}));assert.throws(()=>update(s,{type:'daily',date:'2026-02-30',count:1}));
});
test('baseline revisions preserve historical estimate and edit timestamps',()=>{
 let s=update(d.emptyJourney(),{type:'baseline',cigarettesPerDay:10,pricePerCigarette:1000});s=update(s,{type:'daily',date:'2026-10-01',count:2});const created=s.daily['2026-10-01'].createdAt;
 s=update(s,{type:'baseline',cigarettesPerDay:20,pricePerCigarette:5000});s=update(s,{type:'daily',date:'2026-10-01',count:3},new Date('2026-10-02T00:00:00Z'));assert.equal(d.estimatedSavings(s.daily['2026-10-01']),7000);assert.equal(s.daily['2026-10-01'].createdAt,created);assert.notEqual(s.daily['2026-10-01'].updatedAt,created);assert.equal(Object.keys(s.daily).length,1);
 s=update(s,{type:'daily',date:'2026-09-29',count:2});assert.equal(d.estimatedSavings(s.daily['2026-09-29']),null);
});
test('slip keeps quit phase and previous records; unknown fields and future event rejected',()=>{
 let s=update(d.emptyJourney(),{type:'plan',timezone:'Asia/Makassar',targetQuitDate:'2026-09-20',actualQuitDate:'2026-09-20'});
 s=update(s,{type:'slip',occurredAt:now.toISOString(),count:1,trigger:'',nextStep:'Rencana saya'});assert.equal(d.phase(s),'POST_QUIT');assert.equal(s.actualQuitDate,'2026-09-20');assert.equal(s.slips.length,1);
 assert.throws(()=>update(s,{type:'slip',occurredAt:'2027-01-01T00:00:00Z',count:1,trigger:'',nextStep:'x'}));assert.throws(()=>update(s,{type:'daily',date:'2026-10-01',count:0,userId:'another'}));
});
test('reminder consent, pause, cap, answer replay, disable',()=>{
 let s=d.emptyJourney();const p={type:'preferences',enabled:true,consent:true,time:'00:00',maxPerDay:1,pausedUntil:null,followupDays:[1,7,30]};assert.throws(()=>update(s,{...p,consent:false}));s=update(s,p);const r=d.dueReminders(s,now)[0];assert.ok(r);s=update(s,{type:'reminder_answer',reminderId:r.id,answer:'difficult'});assert.equal(d.dueReminders(s,now).length,0);assert.throws(()=>update(s,{type:'reminder_answer',reminderId:r.id,answer:'okay'}));s=update(s,{...p,pausedUntil:'2026-10-02'});assert.equal(d.dueReminders(s,now).length,0);s=update(s,{...p,enabled:false});assert.equal(d.dueReminders(s,now).length,0);
});
test('patterns need multiple days; coping feedback needs an existing plan',()=>{
 let s=d.emptyJourney();assert.throws(()=>update(s,{type:'coping_feedback',planId:id(),helped:'yes'}));for(let i=0;i<3;i++)s=update(s,{type:'checkin',occurredAt:(i===2?'2026-09-29T00:00:00Z':now.toISOString()),trigger:'Makan',intensity:3,context:''});assert.equal(d.triggerPatterns(s)[0][1],3);
});
const room=()=>({user:'user-a',consultant:'consultant',state:'queued',createdAt:now.toISOString(),policy:{version:'fixture'},sharedSummary:'',consentAt:now.toISOString(),messages:[],reads:{},reports:[],summary:null,signals:[],operations:{}});
const act=(s,actor,a,operation=id())=>c.applyRoom(s,actor,a,operation,now);
test('room isolation, acceptance, message retry and reused ID with changed payload',()=>{
 let r=room();assert.throws(()=>act(r,'user-b',{type:'accept'}));assert.throws(()=>act(r,'user-a',{type:'accept'}));assert.throws(()=>act(r,'user-a',{type:'message',text:'a'}));r=act(r,'consultant',{type:'accept'});const op=id();r=act(r,'user-a',{type:'message',text:'fixture'},op);r=act(r,'user-a',{type:'message',text:'fixture'},op);assert.equal(r.messages.length,1);assert.throws(()=>act(r,'user-a',{type:'message',text:'changed'},op));r=act(r,'consultant',{type:'read',messageId:op});assert.equal(r.reads.consultant,op);
});
test('summary requires user approval, report survives session end, closed chat cannot send',()=>{
 let r=act(room(),'consultant',{type:'accept'});r=act(r,'consultant',{type:'summary',text:'Usulan sintetis'});assert.equal(r.summary.approved,false);assert.throws(()=>act(r,'consultant',{type:'approve_summary'}));r=act(r,'user-a',{type:'approve_summary'});assert.equal(r.summary.approved,true);r=act(r,'user-a',{type:'end'});r=act(r,'user-a',{type:'report',reason:'Laporan sintetis'});assert.equal(r.reports.length,1);assert.throws(()=>act(r,'user-a',{type:'message',text:'closed'}));
});
test('signaling rejects cross-room/overlapping calls, dedupes and purges on end',()=>{
 let r=act(room(),'consultant',{type:'accept'});const callId=id(),op=id(),offer={type:'signal',kind:'offer',callId,data:'synthetic'};r=act(r,'user-a',offer,op);r=act(r,'user-a',offer,op);assert.equal(r.signals.length,1);assert.equal(Object.keys(r.operations).length,1);assert.throws(()=>act(r,'user-b',{...offer,kind:'answer'}));assert.throws(()=>act(r,'consultant',{...offer,callId:id()}));r=act(r,'user-a',{type:'end'});assert.equal(r.signals.length,0);
});
test('journey route replay, two-device conflict and delete stale-write barrier (RPC model)',async()=>{
 const {NextRequest,NextResponse}=require('next/server');let row=null;const operations=new Map();let actor='user-a';class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
 const http={identity:async()=>actor,json:NextResponse.json,body:r=>r.json(),HttpError,failure:e=>NextResponse.json({error:e.message},{status:e.status||400}),database:()=>({from:table=>{const filters={};const q={select:()=>q,eq:(k,v)=>(filters[k]=v,q),maybeSingle:async()=>({data:table==='nivo_journeys'?row:operations.has(filters.operation_id)?{request:operations.get(filters.operation_id)}:null,error:null})};return q;},rpc:async(name,p)=>{if(name==='nivo_delete_journey'){if((row?.revision||0)!==p.p_expected)return {data:false};row={revision:p.p_expected+1,document:p.p_empty};operations.clear();return {data:true};}if((row?.revision||0)!==p.p_expected)return {data:{error:'conflict'}};row={revision:p.p_expected+1,document:p.p_document};operations.set(p.p_operation,p.p_request);return {data:{revision:row.revision,state:row.document}};}})};
 const route=load('src/app/api/journey/route.ts',{'@/shared/server/http':http});const req=(payload,method='POST')=>new NextRequest('http://localhost/api/journey',{method,body:JSON.stringify(payload)});
 const payload={operationId:id(),expectedRevision:0,action:{type:'daily',date:'2026-01-01',count:0}};
 assert.equal((await route.POST(req(payload))).status,200);assert.equal((await route.POST(req(payload))).status,200);assert.equal(row.revision,1);assert.equal((await route.POST(req({...payload,operationId:id()}))).status,409);assert.equal((await route.POST(req({...payload,action:{...payload.action,count:2}}))).status,409);
 assert.equal((await route.DELETE(req({expectedRevision:1,confirm:'HAPUS PERJALANAN'},'DELETE'))).status,200);assert.equal(row.revision,2);assert.equal((await route.POST(req({...payload,operationId:id()}))).status,409);
});
test('server access denies another user and unverified consultant, records verified consultant access',async()=>{
 let actor='user-b',verified=false,audits=0;class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
 const data={id:id(),expires_at:'2099-01-01T00:00:00Z',document:room()};
 const database=()=>({from:table=>{const q={select:()=>q,eq:()=>q,not:()=>q,maybeSingle:async()=>({data}),insert:async()=>{audits++;return{};},then:resolve=>resolve({data:verified?[{user_id:'consultant',role:'consultant'}]:[]})};return q;}});
 const server=load('src/shared/consultation/server.ts',{'@/shared/server/http':{database,HttpError}});
 await assert.rejects(()=>server.access(data.id,actor),e=>e.status===404);await assert.rejects(()=>server.access(data.id,'consultant'),e=>e.status===404);verified=true;await server.access(data.id,'consultant');assert.equal(audits,1);await server.access(data.id,'user-a');assert.equal(audits,1);
});

test('deleted chat rejects delayed writes, including old reports',()=>{const r={...room(),state:'ended',contentDeleted:true};assert.throws(()=>act(r,'user-a',{type:'report',reason:'delayed'}));assert.throws(()=>act(r,'user-a',{type:'message',text:'delayed'}));});

test('consultation create rejects consultant without a current availability lease',async()=>{
 const {NextRequest,NextResponse}=require('next/server');class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
 const http={identity:async()=> 'user-a',body:r=>r.json(),json:NextResponse.json,HttpError,failure:e=>NextResponse.json({error:e.message},{status:e.status||400}),database:()=>({from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;},rpc:()=>{throw Error('Must not create unavailable session');}})};
 const server={configuration:()=>({version:'fixture',hours:[{start:'2020-01-01T00:00:00Z',end:'2099-01-01T00:00:00Z'}]}),staff:async()=>[{role:'consultant',available_until:null}]};
 const route=load('src/app/api/consultation/route.ts',{'@/shared/server/http':http,'@/shared/consultation/server':server});const req=new NextRequest('http://localhost/api/consultation',{method:'POST',body:JSON.stringify({id:id(),consultant:id(),consent:true,policyVersion:'fixture',sharedSummary:''})});assert.equal((await route.POST(req)).status,409);
});
