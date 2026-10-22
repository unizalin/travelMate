import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const trip = '20000000-0000-0000-0000-000000000001'
const owner = '10000000-0000-0000-0000-000000000001'
const member = '10000000-0000-0000-0000-000000000002'
const legacy = '10000000-0000-0000-0000-000000000003'

test('fixed membership uses owner or claims; legacy grants cannot admit an unclaimed account', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      CREATE ROLE authenticated; CREATE ROLE anon;
      CREATE SCHEMA auth; CREATE SCHEMA extensions;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      CREATE TABLE public.tripbook_journeys(trip_id uuid PRIMARY KEY, owner_id uuid, journey jsonb);
      CREATE TABLE public.tripbook_fixed_journey(trip_id uuid PRIMARY KEY);
      CREATE TABLE public.tripbook_member_claims(trip_id uuid, member_id text, user_id uuid);
      CREATE TABLE public.tripbook_journey_access(trip_id uuid, user_id uuid, role text);
      CREATE TABLE public.profiles(id uuid);
      CREATE TABLE public.tripbook_flight_choices(trip_id uuid, member_id text, flight_id text);
    `)
    const migration = await readFile(new URL('../../supabase/migrations/20261022010000_tripbook_invite_membership.sql', import.meta.url), 'utf8')
    const canRead = migration.match(/CREATE OR REPLACE FUNCTION public\.tripbook_can_read\([\s\S]*?\$\$;/)?.[0]
    assert.ok(canRead)
    await db.exec(canRead)
    const scoped = await readFile(new URL('../../supabase/migrations/20261022050000_tripbook_journey_scoped_invites.sql', import.meta.url), 'utf8')
    const admin = scoped.match(/CREATE FUNCTION public\.tripbook_is_admin\([\s\S]*?\$\$;/)?.[0]
    assert.ok(admin)
    await db.exec(admin)
    await db.exec(await readFile(new URL('../../supabase/migrations/20261022020000_tripbook_private_data_boundary.sql', import.meta.url), 'utf8'))
    await db.exec(`
      REVOKE ALL ON FUNCTION public.tripbook_can_read(uuid), public.tripbook_is_admin(uuid), public.tripbook_roster(uuid) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.tripbook_can_read(uuid), public.tripbook_is_admin(uuid), public.tripbook_roster(uuid) TO authenticated;
    `)
    await db.query('INSERT INTO public.tripbook_journeys VALUES ($1,$2,$3)', [trip, owner, { members: [{ id: 'member-2', displayName: 'Fixture member' }] }])
    await db.query('INSERT INTO public.tripbook_fixed_journey VALUES ($1)', [trip])
    await db.query("INSERT INTO public.tripbook_journey_access VALUES ($1,$2,'editor')", [trip, legacy])
    const login = async user => {
      await db.exec('SET ROLE authenticated')
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user])
    }
    const access = async () => (await db.query('SELECT public.tripbook_can_read($1) AS joined, public.tripbook_is_admin($1) AS admin', [trip])).rows[0]
    await login(owner)
    assert.deepEqual(await access(), { joined: true, admin: true }, 'owner needs no legacy access or claim row')
    await login(member)
    assert.deepEqual(await access(), { joined: false, admin: false })
    await login(legacy)
    assert.deepEqual(await access(), { joined: false, admin: false }, 'legacy grant is insufficient for a fixed journey')
    await db.exec('RESET ROLE')
    await db.query("INSERT INTO public.tripbook_member_claims VALUES ($1,'member-2',$2)", [trip, member])
    await login(member)
    assert.deepEqual(await access(), { joined: true, admin: false }, 'claim alone admits a member')
    const roster = (await db.query('SELECT public.tripbook_roster($1) AS roster', [trip])).rows[0].roster
    assert.deepEqual(roster.claims, [{ memberId: 'member-2', name: 'Fixture member', isSelf: true }])
    await db.exec('RESET ROLE')
    await db.query('DELETE FROM public.tripbook_member_claims WHERE trip_id=$1 AND user_id=$2', [trip, member])
    await login(member)
    assert.deepEqual(await access(), { joined: false, admin: false }, 'removing a claim revokes access')
    await assert.rejects(db.query('SELECT public.tripbook_roster($1)', [trip]), /journey_access_required/)
    await db.exec('RESET ROLE; SET ROLE anon')
    await assert.rejects(db.query('SELECT public.tripbook_can_read($1)', [trip]), error => error.code === '42501')
  } finally { await db.close() }
})
