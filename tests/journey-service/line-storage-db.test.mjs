import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const user = '10000000-0000-0000-0000-000000000001'
const outsider = '10000000-0000-0000-0000-000000000002'
const trip = '20000000-0000-0000-0000-000000000001'
const line = `U${'a'.repeat(32)}`
const otherLine = `U${'b'.repeat(32)}`
const hash = 'a'.repeat(64)
const nonce = 'b'.repeat(64)

test('LINE storage requires membership, protects challenges and isolates browser roles', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.tripbook_journeys(trip_id uuid PRIMARY KEY, owner_id uuid);
      CREATE TABLE public.tripbook_fixed_journey(trip_id uuid PRIMARY KEY);
      CREATE TABLE public.tripbook_member_claims(trip_id uuid, user_id uuid);`)
    await db.query('INSERT INTO auth.users VALUES ($1),($2)', [user, outsider])
    await db.query('INSERT INTO tripbook_journeys VALUES ($1,$2)', [trip, user])
    await db.query('INSERT INTO tripbook_fixed_journey VALUES ($1)', [trip])
    await db.exec(await readFile(new URL('../../supabase/migrations/20261023040000_tripbook_line.sql', import.meta.url), 'utf8'))
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`)
      await assert.rejects(db.query('SELECT * FROM tripbook_line_bindings'), error => error.code === '42501')
      await assert.rejects(db.query('SELECT tripbook_line_is_member($1)', [user]), error => error.code === '42501')
      await db.exec('RESET ROLE')
    }
    await db.exec('SET ROLE service_role')
    await db.query('SELECT tripbook_line_create_ticket($1,$2,$3)', [hash, line, 'test-link-token'])
    await assert.rejects(db.query('SELECT tripbook_line_prepare_link($1,$2,$3)', [hash, outsider, nonce]), /membership_required/)
    const prepared = await db.query('SELECT tripbook_line_prepare_link($1,$2,$3) AS token', [hash, user, nonce])
    assert.equal(prepared.rows[0].token, 'test-link-token')
    const finish = async (id, ok = true) => (await db.query('SELECT tripbook_line_finish_link($1,$2,$3) AS linked', [nonce, id, ok])).rows[0].linked
    assert.equal(await finish(otherLine), false)
    assert.equal(await finish(line), true)
    assert.equal(await finish(line), false)
    let binding = (await db.query('SELECT * FROM tripbook_line_bindings')).rows[0]
    assert.equal(binding.aurora_enabled, false)
    assert.equal(binding.user_id, user)
    await db.query('SELECT tripbook_line_set_preference($1,$2)', [user, true])
    assert.equal((await db.query('SELECT aurora_enabled FROM tripbook_line_bindings')).rows[0].aurora_enabled, true)
    await db.query('SELECT tripbook_line_block($1,$2,$3)', [line, true, 2000])
    await db.query('SELECT tripbook_line_block($1,$2,$3)', [line, false, 1000])
    binding = (await db.query('SELECT * FROM tripbook_line_bindings')).rows[0]
    assert.equal(binding.blocked, true, 'out-of-order follow must not undo a newer block')
    assert.equal(binding.aurora_enabled, false)
    await db.query('SELECT tripbook_line_unlink($1)', [user])
    assert.equal((await db.query('SELECT * FROM tripbook_line_bindings')).rows.length, 0)
    const owner = '30000000-0000-0000-0000-000000000001'
    const otherOwner = '30000000-0000-0000-0000-000000000002'
    const event = async (id, worker, complete = false) => (await db.query('SELECT tripbook_line_event($1,$2,$3) AS state', [id, worker, complete])).rows[0].state
    assert.equal(await event('event', owner), 'claimed')
    assert.equal(await event('event', otherOwner), 'busy')
    assert.equal(await event('event', owner, true), 'completed')
    assert.equal(await event('event', otherOwner), 'completed')
    await db.query('SELECT tripbook_line_create_ticket($1,$2,$3)', [hash, line, 'expired-token'])
    await db.query('SELECT tripbook_line_prepare_link($1,$2,$3)', [hash, user, nonce])
    await db.query("UPDATE tripbook_line_tickets SET expires_at=now()-interval '1 second'")
    assert.equal(await finish(line), false)
    assert.equal((await db.query('SELECT * FROM tripbook_line_bindings')).rows.length, 0)
    await db.query('SELECT tripbook_line_create_ticket($1,$2,$3)', [hash, line, 'new-token'])
    await db.query('SELECT tripbook_line_prepare_link($1,$2,$3)', [hash, user, nonce])
    assert.equal(await finish(line), true)
    assert.equal((await db.query('SELECT blocked FROM tripbook_line_bindings')).rows[0].blocked, true, 'a block before re-link must not be forgotten')
    await db.query('SELECT tripbook_line_block($1,$2,$3)', [line, false, 3000])
    await db.query('SELECT tripbook_line_set_preference($1,$2)', [user, true])
    const linkId = (await db.query('SELECT link_id FROM tripbook_line_bindings')).rows[0].link_id
    const claim = async night => (await db.query('SELECT tripbook_line_claim_delivery($1,$2,$3) AS delivery', [user, linkId, night])).rows[0].delivery
    const first = await claim('2026-10-30')
    const retry = await claim('2026-10-30')
    assert.equal(first.retryKey, retry.retryKey, 'unknown results retry with a stable LINE request key')
    await db.query("UPDATE tripbook_line_deliveries SET sent=true WHERE user_id=$1", [user])
    assert.equal(await claim('2026-10-30'), null, 'successful nights are not sent again')
    await db.query('SELECT tripbook_line_set_preference($1,$2)', [user, false])
    assert.equal(await claim('2026-10-31'), null, 'cancelled subscriptions cannot claim new work')
    await db.query('SELECT tripbook_line_set_preference($1,$2)', [user, true])
    await db.exec('RESET ROLE')
    await db.query('UPDATE tripbook_journeys SET owner_id=$1', [outsider])
    await db.exec('SET ROLE service_role')
    assert.equal(await claim('2026-10-31'), null, 'membership is checked again immediately before delivery')
    const lease = async (worker, release) => (await db.query('SELECT tripbook_line_lease($1,$2) AS locked', [worker, release])).rows[0].locked
    assert.equal(await lease(owner, false), true)
    assert.equal(await lease(otherOwner, false), false)
    assert.equal(await lease(otherOwner, true), false)
    assert.equal(await lease(owner, true), true)
    await db.exec('RESET ROLE')
    await db.query('UPDATE tripbook_journeys SET owner_id=$1', [user])
    await db.query('INSERT INTO tripbook_member_claims VALUES ($1,$2)', [trip, outsider])
    await db.exec('SET ROLE service_role')
    assert.equal((await db.query('SELECT tripbook_line_is_member($1) AS joined', [outsider])).rows[0].joined, true, 'a claimed ordinary member can link too')
  } finally { await db.close() }
})
