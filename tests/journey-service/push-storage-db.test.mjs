import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
test('production push tables are backend-only and lease serializes all workers',async()=>{
 const db=new PGlite()
 try{
  await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);')
  await db.exec(await readFile(new URL('../../supabase/migrations/20261022070000_tripbook_push_storage.sql',import.meta.url),'utf8'))
  for(const role of ['anon','authenticated']){
   await db.exec(`SET ROLE ${role}`)
   await assert.rejects(db.query('SELECT * FROM public.tripbook_push_subscriptions'),error=>error.code==='42501')
   await assert.rejects(db.query("SELECT public.tripbook_push_lease('10000000-0000-0000-0000-000000000001',false)"),error=>error.code==='42501')
   await db.exec('RESET ROLE')
  }
  await db.exec('SET ROLE service_role')
  const lease=async(id,release)=>(await db.query('SELECT public.tripbook_push_lease($1,$2) AS locked',[id,release])).rows[0].locked
  const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002'
  assert.equal(await lease(a,false),true);assert.equal(await lease(b,false),false);assert.equal(await lease(b,true),false);assert.equal(await lease(a,true),true);assert.equal(await lease(b,false),true)
 }finally{await db.close()}
})
