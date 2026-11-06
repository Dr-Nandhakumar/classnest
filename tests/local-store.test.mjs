import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const code=await fs.readFile(new URL('../src/local-store.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const store=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const api=store.localRequest;
test('Offline records, attachments, role views and backups',async t=>{
 await assert.rejects(()=>api('/api/hub'),/Choose a workspace/);
 await store.setProfile({mode:'staff'});
 const {id:classId}=await api('/api/hub',{action:'create',name:'B.Pharm · First Year',subject:'B.Pharm'});
 await t.test('roster import is atomic and preserves missing source values',async()=>{
  await assert.rejects(()=>api('/api/roster-import',{classId,students:[{name:'Should roll back',email:'',roll:''},{name:'Invalid phone',parentPhone:'123'}]}),/country code/);
  assert.equal((await store.readWorkspace()).students.length,0);
  const rows=Array.from({length:74},(_,i)=>({name:'Student '+String(i+1).padStart(2,'0'),roll:'',email:i<63?'student'+i+'@example.com':i===73?'':'bad email '+i,parentName:i<73?'Test Parent':'',parentPhone:i<73?'+15555550123':''}));
  const result=await api('/api/roster-import',{classId,source:'Synthetic roster',students:rows});assert.equal(result.imported,74);assert.equal(result.emailReview,11);assert.equal(result.missingRolls,74);assert.equal(result.missingParentContacts,1);
  const repeat=await api('/api/roster-import',{classId,students:rows});assert.equal(repeat.imported,0);assert.equal(repeat.skipped,74);
 });
 let w=await store.readWorkspace();const [one,two]=w.students;
 await t.test('attendance saves, deduplicates and cancels unsent messages',async()=>{
  await api('/api/hub',{action:'student',classId,id:one.id,...one,smsEnabled:'yes'});
  const entries=w.students.map(s=>({id:s.id,status:s.id===one.id?'absent':'present'}));
  await api('/api/hub',{action:'attendance',classId,date:'2026-11-06',entries});await api('/api/hub',{action:'attendance',classId,date:'2026-11-06',entries});
  w=await store.readWorkspace();assert.equal(w.records.filter(r=>r.kind==='attendance').length,74);assert.equal(w.alerts.length,1);assert.equal(w.alerts[0].status,'manual_required');
  await api('/api/hub',{action:'attendance',classId,date:'2026-11-06',entries:entries.map(e=>({...e,status:'present'}))});w=await store.readWorkspace();assert.equal(w.alerts[0].status,'cancelled');
  await assert.rejects(()=>api('/api/hub',{action:'manualOpened',classId,id:w.alerts[0].id}),/no longer marked absent/);
 });
 const shared=await store.uploadFile(classId,new File(['Shared material'],'notes.txt',{type:'text/plain'}));
 const staffFile=await store.uploadFile(classId,new File(['Staff planning only'],'lesson.txt',{type:'text/plain'}));
 await api('/api/hub',{action:'record',classId,kind:'note',title:'Class notes',subject:'Pharmaceutics',body:'Study this topic.',fileId:shared.id});
 await api('/api/hub',{action:'record',classId,kind:'lesson',title:'Staff lesson',subject:'Pharmaceutics',body:'Teaching activities',objectives:'Learning objectives',method:'Lecture',lessonDate:'2026-11-10',duration:60,status:'planned',fileId:staffFile.id});
 await api('/api/hub',{action:'record',classId,kind:'mark',studentId:one.id,title:'Test 1',subject:'Pharmaceutics',score:8,total:10});
 await api('/api/hub',{action:'record',classId,kind:'mark',studentId:two.id,title:'Other student result',subject:'Pharmaceutics',score:4,total:10});
 await api('/api/hub',{action:'record',classId,kind:'assignment',title:'Homework',subject:'Pharmaceutics',body:'Complete the task.',due:'2026-11-12'});
 const staffBackup=await store.exportBackup();let studentBackup;
 await t.test('student views and exports omit other students and staff lesson files',async()=>{
  studentBackup=await store.exportBackup(one.id);assert.equal(studentBackup.data.students.length,1);assert.equal(studentBackup.data.records.some(r=>r.kind==='lesson'),false);assert.equal(studentBackup.data.records.filter(r=>r.kind==='mark').length,1);assert.equal(studentBackup.files.length,1);assert.equal(studentBackup.files[0].id,shared.id);
  await store.setProfile({mode:'student',studentId:one.id});const view=await api('/api/hub?class='+classId);assert.equal(view.role,'student');assert.equal(view.students.length,1);assert.equal(view.records.some(r=>r.kind==='lesson'),false);assert.equal(view.records.filter(r=>r.kind==='mark').length,1);
  assert.equal(await (await store.readAttachment(shared.id)).blob.text(),'Shared material');await assert.rejects(()=>store.readAttachment(staffFile.id),/not available/);
  await assert.rejects(()=>api('/api/hub',{action:'record',classId,kind:'note',title:'Wrong mode',subject:'X'}),/staff workspace/);
  const assignment=view.records.find(r=>r.kind==='assignment');await api('/api/hub',{action:'submit',classId,assignment:assignment.id,text:'Student answer'});
  await store.setProfile({mode:'staff'});const detail=await api('/api/hub?class='+classId);assert.equal(detail.records.filter(r=>r.kind==='submission').length,1);
 });
 await t.test('backups restore records and attachments, and malformed restores do not overwrite',async()=>{
  await store.restoreBackup(studentBackup);w=await store.readWorkspace();assert.equal(w.students.length,1);assert.equal(w.studentPackage,true);await assert.rejects(()=>store.setProfile({mode:'staff'}),/individual student view/);
  const bad=structuredClone(staffBackup);bad.data.records[0].classId='missing-class';await assert.rejects(()=>store.restoreBackup(bad),/Invalid class records/);assert.equal((await store.readWorkspace()).students.length,1);
  const restored=await store.restoreBackup(staffBackup);assert.equal(restored.students,74);assert.equal(restored.attachments,2);assert.equal(await (await store.readAttachment(staffFile.id)).blob.text(),'Staff planning only');
 });
 await t.test('validation rejects invalid marks and lesson dates',async()=>{
  await assert.rejects(()=>api('/api/hub',{action:'record',classId,kind:'mark',studentId:one.id,title:'Invalid',subject:'X',score:11,total:10}),/maximum/);
  await assert.rejects(()=>api('/api/hub',{action:'record',classId,kind:'lesson',title:'Invalid',subject:'X',lessonDate:'2026-02-30'}),/valid date/);
 });
});
