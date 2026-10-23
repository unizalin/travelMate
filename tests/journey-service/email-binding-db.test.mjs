import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

import { trip, users, fixtureSql } from './email-binding-fixture.mjs'

test('email reservations keep admin, self match, claim and invitation boundaries', async () => {
  const db = new PGlite()
  try {
    await db.exec(await fixtureSql())
    const login = async n => { await db.exec('RESET ROLE; SET ROLE authenticated'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [users[n]]) }
    const set = (id, email) => db.query('SELECT public.tripbook_set_email_reservation($1,$2,$3)', [trip,id,email])
    const match = async () => (await db.query('SELECT public.tripbook_match_email_reservation($1) AS result',[trip])).rows[0].result
    const confirm = id => db.query('SELECT public.tripbook_confirm_email_reservation($1,$2)',[trip,id])
    await login(1)
    await assert.rejects(set('member-2','person1@example.test'), /admin_required/)
    await assert.rejects(db.query('SELECT * FROM public.tripbook_email_reservations'), e => e.code === '42501')
    assert.equal(await match(), null)
    for (const sql of ["INSERT INTO public.tripbook_email_reservations VALUES ('"+trip+"','member-4','direct@example.test',now())","DELETE FROM public.tripbook_email_reservations","UPDATE public.tripbook_email_reservations SET email='direct@example.test'"]) await assert.rejects(db.query(sql), e=>e.code==='42501')
    await login(0)
    await assert.rejects(set('member-1','person1@example.test'), /member_already_claimed/)
    await assert.rejects(set('missing','person1@example.test'), /unknown_member/)
    for (const invalid of ['', 'x', 'a@b', 'a b@example.test', 'a@@example.test']) await assert.rejects(set('member-2',invalid), /invalid_email/)
    await assert.rejects(set('member-4','unizalin@gmail.com'), /account_already_claimed/)
    await set('member-2','  PERSON1@EXAMPLE.TEST  ')
    await assert.rejects(set('member-3','person1@example.test'), /email_already_reserved/)
    await set('member-3','person2@example.test')
    const admin = (await db.query('SELECT public.tripbook_admin_state($1) AS result',[trip])).rows[0].result
    assert.equal(admin.members.find(m=>m.id==='member-2').reservedEmail,'person1@example.test')
    await login(1)
    assert.equal((await db.query('SELECT public.tripbook_admin_state($1) AS result',[trip])).rows[0].result.isAdmin,false)
    assert.deepEqual(await match(), {id:'member-2',name:'Two'})
    await assert.rejects(confirm('member-3'), /email_reservation_mismatch/)
    await login(2)
    assert.deepEqual(await match(), {id:'member-3',name:'Three'})
    await db.exec('RESET ROLE')
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.tripbook_member_claims')).rows[0].n,1,'matching is read only')
    await login(1)
    await confirm('member-2')
    assert.equal(await match(),null)
    await assert.rejects(confirm('member-2'), /account_already_claimed/)
    await assert.rejects(confirm('member-3'), /account_already_claimed/)
    const preview = (await db.query("SELECT public.tripbook_invite_preview(repeat('a',64)) AS result")).rows[0].result
    assert.equal(preview.members.find(m=>m.id==='member-2').claimed,true)
    await login(3)
    await db.query("SELECT public.tripbook_join_invite(repeat('a',64),'member-3')")
    await login(2)
    assert.equal(await match(),null)
    await assert.rejects(confirm('member-3'), /member_already_claimed/)
    await login(0)
    const after = (await db.query('SELECT public.tripbook_admin_state($1) AS result',[trip])).rows[0].result
    assert.equal(after.members.find(m=>m.id==='member-3').reservedEmail,null)
    await set('member-4','person2@example.test')
    await set('member-4','unclaimed@example.test')
    await set('member-4',null)
    await db.exec('RESET ROLE')
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.tripbook_email_reservations')).rows[0].n,0)
    await db.exec('SET ROLE anon')
    for (const sql of ["SELECT * FROM public.tripbook_email_reservations",`SELECT public.tripbook_match_email_reservation('${trip}')`,`SELECT public.tripbook_confirm_email_reservation('${trip}','member-4')`]) await assert.rejects(db.query(sql), e=>e.code==='42501')
  } finally { await db.close() }
})
