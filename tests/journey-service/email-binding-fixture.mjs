import { readFile } from 'node:fs/promises'
export const trip = '20000000-0000-0000-0000-000000000001'
export const users = [1, 2, 3, 4].map(n => `10000000-0000-0000-0000-00000000000${n}`)
export async function fixtureSql() {
  const base = await readFile(new URL('../../supabase/migrations/20261022010000_tripbook_invite_membership.sql', import.meta.url), 'utf8')
  const scoped = await readFile(new URL('../../supabase/migrations/20261022050000_tripbook_journey_scoped_invites.sql', import.meta.url), 'utf8')
  const functions = [
    base.match(/CREATE FUNCTION public\.tripbook_is_admin\(\)[\s\S]*?\$\$;/)[0],
    base.match(/CREATE FUNCTION public\.tripbook_invite_preview\([\s\S]*?\$\$;/)[0],
    scoped.match(/CREATE FUNCTION public\.tripbook_is_admin\([\s\S]*?\$\$;/)[0],
    scoped.match(/CREATE OR REPLACE FUNCTION public\.tripbook_join_invite\([\s\S]*?\$\$;/)[0],
  ].join('\n')
  return `
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
    CREATE TABLE public.tripbook_journeys(trip_id uuid PRIMARY KEY, owner_id uuid, journey jsonb);
    CREATE TABLE public.tripbook_fixed_journey(trip_id uuid PRIMARY KEY, owner_id uuid);
    CREATE TABLE public.tripbook_member_claims(trip_id uuid REFERENCES public.tripbook_journeys, member_id text, user_id uuid REFERENCES auth.users, claimed_at timestamptz DEFAULT now(), PRIMARY KEY(trip_id,member_id), UNIQUE(trip_id,user_id));
    CREATE TABLE public.tripbook_invitations(trip_id uuid PRIMARY KEY, token_hash text, revoked_at timestamptz);
    CREATE FUNCTION extensions.digest(text,text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT decode(md5($1),'hex') $$;
    INSERT INTO auth.users VALUES ${users.map((id, n) => `('${id}','${n === 0 ? 'unizalin@gmail.com' : `person${n}@example.test`}',now())`).join(',')};
    INSERT INTO public.tripbook_journeys VALUES('${trip}','${users[0]}','{"members":[{"id":"member-1","displayName":"Owner"},{"id":"member-2","displayName":"Two"},{"id":"member-3","displayName":"Three"},{"id":"member-4","displayName":"Four"}]}');
    INSERT INTO public.tripbook_fixed_journey VALUES('${trip}','${users[0]}');
    INSERT INTO public.tripbook_member_claims VALUES('${trip}','member-1','${users[0]}',now());
    INSERT INTO public.tripbook_invitations VALUES('${trip}',encode(extensions.digest(repeat('a',64),'sha256'),'hex'),NULL);
    ${functions}
    REVOKE ALL ON FUNCTION public.tripbook_is_admin(), public.tripbook_is_admin(uuid), public.tripbook_invite_preview(text), public.tripbook_join_invite(text,text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.tripbook_invite_preview(text), public.tripbook_join_invite(text,text) TO authenticated;
    ${await readFile(new URL('../../supabase/migrations/20261023030000_tripbook_email_reservations.sql', import.meta.url), 'utf8')}
  `
}
