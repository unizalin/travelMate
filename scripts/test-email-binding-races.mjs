import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { fixtureSql, trip, users } from '../tests/journey-service/email-binding-fixture.mjs'
const run = promisify(execFile)
const container = `travelmate-email-binding-test-${Date.now()}`
const psql = async sql => {
  const child = spawn('docker',['exec','-i',container,'psql','-h','127.0.0.1','-U','postgres','-d','postgres','-X','-v','ON_ERROR_STOP=1','-At'], {stdio:['pipe','pipe','pipe']})
  let output='', errors=''
  child.stdout.on('data', data=>{output+=data})
  child.stderr.on('data', data=>{errors+=data})
  child.stdin.end(sql)
  const code=await new Promise(resolve=>child.on('close',resolve))
  if(code!==0) throw new Error(errors)
  return output
}
const login = n => `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${users[n]}',false);`
const reserve = `SELECT public.tripbook_set_email_reservation('${trip}','member-2','person1@example.test');`
const confirm = `SELECT public.tripbook_confirm_email_reservation('${trip}','member-2');`
const invite = `SELECT public.tripbook_join_invite(repeat('a',64),'member-2');`
const reset = async()=>psql(`DELETE FROM public.tripbook_member_claims WHERE member_id<>'member-1';${login(0)}${reserve}`)
async function race(firstUser, firstSql, secondUser, secondSql, expectedError) {
  await reset()
  const first = spawn('docker',['exec','-i',container,'psql','-h','127.0.0.1','-U','postgres','-X','-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']})
  let text='', errors=''
  first.stderr.on('data',data=>{errors+=data})
  const done=new Promise(resolve=>first.on('close',resolve))
  const locked = new Promise((resolve,reject)=>{first.stdout.on('data',data=>{text+=data;if(text.includes('LOCKED'))resolve()});first.on('close',()=>reject(new Error(errors || 'lock session closed')))})
  first.stdin.write(`BEGIN; SELECT 1 FROM public.tripbook_fixed_journey WHERE trip_id='${trip}' FOR UPDATE;${login(firstUser)}\n\\echo LOCKED\n`)
  await locked
  const second = psql(`${login(secondUser)}${secondSql}`).then(()=>({success:true}),error=>({error:error.message}))
  // Poll the server's lock wait, not elapsed-time assumptions.
  let waiting=false
  for(let i=0;i<30;i++) {
    const status=await psql("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%tripbook_%';")
    if(status.trim()==='1'){waiting=true;break}
    await new Promise(resolve=>setTimeout(resolve,20))
  }
  assert.equal(waiting,true,'competing claim must wait on the journey lock')
  first.stdin.end(`${firstSql} COMMIT;`)
  assert.equal(await done,0,errors)
  assert.match((await second).error,new RegExp(expectedError))
  assert.equal((await psql("SELECT count(*) FROM public.tripbook_member_claims WHERE member_id='member-2';")).trim(),'1')
}
await run('docker',['run','-d','--name',container,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:15-alpine'])
try {
  for(let i=0;i<50;i++) {
    try { await run('docker',['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres']);break } catch { await new Promise(resolve=>setTimeout(resolve,100)) }
  }
  await psql(await fixtureSql())
  await race(3,invite,1,confirm,'member_already_claimed')
  await race(1,confirm,3,invite,'member_already_claimed')
  await race(1,confirm,1,`SELECT public.tripbook_join_invite(repeat('a',64),'member-3');`,'account_already_claimed')
  await race(1,confirm,1,confirm,'account_already_claimed')
  console.log('Four PostgreSQL concurrent claim races passed; invitation and email claims serialize correctly.')
} finally {
  // Keep this disposable test container stopped for review; do not remove any existing data.
  await run('docker',['stop',container])
}
