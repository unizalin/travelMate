import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const owner='10000000-0000-0000-0000-000000000001', author='10000000-0000-0000-0000-000000000002'
const peer='10000000-0000-0000-0000-000000000003', outsider='10000000-0000-0000-0000-000000000004'
const trip='20000000-0000-0000-0000-000000000001', otherTrip='20000000-0000-0000-0000-000000000002'
const entry='30000000-0000-0000-0000-000000000001'

test('ledger migration enforces journey privacy, atomic exact splits, revisions and soft voids', async () => {
 const db = new PGlite()
 try {
  await db.exec(`
   CREATE ROLE anon; CREATE ROLE authenticated;
   CREATE SCHEMA auth;
   CREATE TABLE auth.users(id uuid PRIMARY KEY);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
   CREATE TABLE public.tripbook_journeys(trip_id uuid PRIMARY KEY,owner_id uuid NOT NULL,journey jsonb NOT NULL);
   CREATE TABLE public.tripbook_fixed_journey(trip_id uuid PRIMARY KEY);
   CREATE TABLE public.tripbook_journey_access(trip_id uuid,user_id uuid,role text);
   CREATE TABLE public.tripbook_member_claims(trip_id uuid,member_id text,user_id uuid);
   GRANT USAGE ON SCHEMA auth TO authenticated,anon;
  `)
  // Use the actual production membership helpers rather than a permissive test substitute.
  const membership = await readFile(new URL('../../supabase/migrations/20261022010000_tripbook_invite_membership.sql',import.meta.url),'utf8')
  const scoped = await readFile(new URL('../../supabase/migrations/20261022050000_tripbook_journey_scoped_invites.sql',import.meta.url),'utf8')
  for (const name of ['tripbook_can_read','tripbook_can_edit']) {
   const sql=membership.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$\\$;`))?.[0]
   assert.ok(sql); await db.exec(sql)
  }
  const admin=scoped.match(/CREATE FUNCTION public\.tripbook_is_admin\([\s\S]*?\$\$;/)?.[0]
  assert.ok(admin); await db.exec(admin)
  await db.exec(await readFile(new URL('../../supabase/migrations/20261022060000_tripbook_shared_ledger.sql',import.meta.url),'utf8'))
  await db.query('INSERT INTO auth.users(id) VALUES ($1),($2),($3),($4)',[owner,author,peer,outsider])
  const journey={members:[{id:'m1',displayName:'A'},{id:'m2',displayName:'B'},{id:'m3',displayName:'C'}]}
  await db.query('INSERT INTO public.tripbook_journeys VALUES ($1,$2,$3),($4,$5,$3)',[trip,owner,journey,otherTrip,outsider])
  await db.query('INSERT INTO public.tripbook_fixed_journey VALUES ($1),($2)',[trip,otherTrip])
  await db.query("INSERT INTO public.tripbook_member_claims VALUES ($1,'m1',$2),($1,'m2',$3),($1,'m3',$4)",[trip,owner,author,peer])
  const login=async user=>{await db.exec('SET ROLE authenticated');await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,role:'authenticated'})])}
  const fail=async (sql,args,codeOrMessage)=>assert.rejects(db.query(sql,args),error=>error.code===codeOrMessage||error.message===codeOrMessage)
  const saveSql='SELECT public.tripbook_save_ledger_entry($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS ledger'
  const args=[trip,entry,0,'expense','Dinner','GBP',100,'m1',['m1','m2','m3'],'2026-10-24']
  await login(author)
  const saved=(await db.query(saveSql,args)).rows[0].ledger.entries[0]
  assert.deepEqual(saved.allocations,[{memberId:'m1',amountMinor:34},{memberId:'m2',amountMinor:33},{memberId:'m3',amountMinor:33}])
  assert.equal(saved.canManage,true)
  assert.equal((await db.query(saveSql,args)).rows[0].ledger.entries.length,1,'identical retry is idempotent')
  await fail(saveSql,[trip,'30000000-0000-0000-0000-000000000002',0,'expense','Bad','GBP',100,'m1',['m1','m1'],'2026-10-24'],'invalid_ledger_members')
  await fail(saveSql,[trip,'30000000-0000-0000-0000-000000000002',0,'repayment','Bad','GBP',100,'m1',['m1'],'2026-10-24'],'invalid_ledger_members')
  await fail(saveSql,[trip,'30000000-0000-0000-0000-000000000002',0,'expense','Bad','GBP',100,'m1',['foreign-member'],'2026-10-24'],'invalid_ledger_members')
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.tripbook_ledger_entries')).rows[0].n,1)
  await fail("UPDATE public.tripbook_ledger_entries SET amount_minor=1 WHERE id=$1",[entry],'42501')
  await login(peer)
  assert.equal((await db.query('SELECT public.tripbook_ledger($1) AS ledger',[trip])).rows[0].ledger.entries[0].canManage,false)
  await fail(saveSql,[...args.slice(0,2),1,...args.slice(3)],'42501')
  await fail('SELECT public.tripbook_void_ledger_entry($1,$2,1)',[trip,entry],'42501')
  await login(outsider)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.tripbook_ledger_entries')).rows[0].n,0,'RLS hides another journey')
  await fail('SELECT public.tripbook_ledger($1)',[trip],'42501')
  await fail(saveSql,args,'42501')
  await fail(saveSql,[otherTrip,...args.slice(1)],'42501')
  await login(owner)
  const updated=(await db.query(saveSql,[trip,entry,1,'expense','Updated','GBP',101,'m1',['m1','m2'],'2026-10-24'])).rows[0].ledger.entries[0]
  assert.equal(updated.revision,2)
  assert.deepEqual(updated.allocations,[{memberId:'m1',amountMinor:51},{memberId:'m2',amountMinor:50}])
  await fail(saveSql,[...args.slice(0,2),1,...args.slice(3)],'ledger_conflict')
  const repayment=(await db.query(saveSql,[trip,'30000000-0000-0000-0000-000000000003',0,'repayment','Repayment','GBP',50,'m2',['m1'],'2026-10-25'])).rows[0].ledger.entries
  assert.equal(repayment.length,2)
  await db.exec('RESET ROLE')
  await db.query('DELETE FROM public.tripbook_member_claims WHERE trip_id=$1 AND user_id=$2',[trip,author])
  await login(author)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.tripbook_ledger_entries')).rows[0].n,0,'unclaim immediately removes read access')
  await fail('SELECT public.tripbook_ledger($1)',[trip],'42501')
  await fail(saveSql,args,'42501')
  await login(owner)
  assert.equal((await db.query('SELECT public.tripbook_void_ledger_entry($1,$2,2) AS ledger',[trip,entry])).rows[0].ledger.entries.length,1)
  await fail('SELECT public.tripbook_void_ledger_entry($1,$2,2)',[trip,entry],'ledger_conflict')
  await db.exec('RESET ROLE')
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.tripbook_ledger_entries WHERE voided_at IS NOT NULL')).rows[0].n,1,'void retains the original record')
  await db.exec('SET ROLE anon')
  await fail('SELECT * FROM public.tripbook_ledger_entries',[],'42501')
  await fail('SELECT public.tripbook_ledger($1)',[trip],'42501')
 } finally { await db.close() }
})
