# TripBook Rebuild Implementation Plan

> For agentic workers: execute independent tasks with exclusive file ownership, tests before new domain/storage behavior, then read-only verification.

Goal: reconstruct the Iceland reader and six-member planning, and implement authenticated shared planning drafts with concurrency protection in local Supabase.

Architecture: retain Vue 3/Vite/Pinia and legacy Trip/itinerary/member/expense. A new TripJourney domain keeps one shared itinerary and participant-scoped transport/accommodation. A new private journey document table is a staging layer, not the final normalized P1b schema. No production migration or Site replacement is authorized by reconstruction alone.

Identity: TripBook / TRIPBOOK-REBUILD-20261013 / travelMate / codex/tripbook-rebuild-20261013 / IMPLEMENT.

## Constraints and confirmed data

- Original repository untouched. Preserve its UI changes in an initial local commit. All new files and checkpoints live under the project development directory, never /private/tmp.
- Six unnamed Member identities; accountId null; three ordinary unassigned groups, overlapping membership allowed. Never assume pairings or BA passengers.
- User itinerary: 2026-10-30..11-07, nine days; BA802 LHR 13:50→KEF17:15 Oct30; BA801 KEF11:55→LHR15:05 Nov7. Seven stays/eight nights and all supplied stops retained. All other scheduled times unknown. Blue Lagoon on Nov7 conflicts with unconfirmed airport timing and requires a visible planning reminder.
- Shared itinerary participation defaults all; exceptions explicit. Transport types flight/train/bus/car/ferry/transfer/other. Actual/planned times and planned/next/completed/skipped/cancelled/fallback states retained. IANA timezone conversion sorts by instants; invalid/nonexistent/ambiguous time rejected or explicitly pending.
- Accommodation includes members, rooms and included benefits. No fixed couple permissions or copied per-member itinerary.
- Account-device local draft survives reload and is isolated by user; cloud draft is explicitly distinct. Immutable document owner and a new private journey access table grant cloud read/edit. Anonymous/nonmembers cannot read cloud document. Shared member names are never sent to the public reader.
- Do not claim restored old 93 tests: new checks verify only reconstructed behavior. Other P1b/expense/claim/preparation slices remain separately tracked.

## Interface contract

Domain `src/domain/tripJourney.ts`: export TripJourney, validateJourney, buildDailyTimeline, accommodationFor, withTripId. Fields follow previous slice: tripId/timeZone, members{id,tripId,displayName,accountId}, groups{id,tripId,name,memberIds,membershipConfirmed}, items{id,date,name,location,order,plannedStart,plannedEnd,actualStart,actualEnd,status,participation}, transports{id,tripId,kind,name,departure/arrival{location,localDate,localTime,timeZone},participantIds,status,actualStart,actualEnd}, accommodations{id,tripId,name,checkIn,checkOut,participantIds,rooms,benefits}.

`src/data/icelandPublic.ts`: canonical public-safe shared stops and transport. `src/data/icelandJourney.ts`: imports shared source and adds six unbound slots, private groups/stays/notes. `src/data/icelandTrip.ts`: public-safe trip metadata and alerts. The public build never imports the private seed.

Service `src/services/journeyService.ts`: export JourneyEnvelope {tripId:string,revision:number,journey:TripJourney,canEdit:boolean,updatedAt:string}; createJourney(journey):Promise<JourneyEnvelope>; loadJourney(tripId):Promise<JourneyEnvelope>; saveJourney(tripId,expectedRevision,journey):Promise<JourneyEnvelope>. RPC names tripbook_create_journey(p_journey), tripbook_load_journey(p_trip_id), tripbook_save_journey(p_trip_id,p_expected_revision,p_journey). JSON response uses camelCase envelope fields. Saving is compare-and-swap, never blind upsert. Client validation is not the authorization boundary; RPC validates member IDs and scope independently. Binding user accounts is excluded from this staging layer; nonnull accountId is rejected until verified claim flow exists.

## Task 1 — domain/reader/planning, owner frontend worker

Files: src/domain/tripJourney.ts, src/data/*iceland*, src/components/trip/TripReader.vue, src/views/Iceland*.vue, src/router/index.ts, src/App.vue, src/components/common/MobileTabBar.vue, src/share.*, share.html, vite.share.config.ts, tests/domain and component files, package test config.

- [x] Write failing domain tests: six unknowns, shared event once + distinct subset flights, group overlaps, participant exceptions, overnight arrival, timezone sorting, rooms subset, checkout exclusion, invalid payloads.
- [x] Restore public reader and full user itinerary. PublicOnly hides planning link and private fields.
- [x] Restore account-scoped editable local planning: roster, groups, seven transport types with participants, accommodations/rooms/benefits, daily preview. Clear disclosures about local/cloud status and errors. Save accessible on mobile; no inappropriate old fixed-trip navigation.
- [x] Connect cloud create/load/CAS save controls to service contract. Read-only member cannot edit; dirty draft is preserved on failed/conflict load/save. Do not create fake accounts or send unknown names publicly.
- [x] Component tests for local persistence/account isolation/public exclusion/cloud failure behavior; app/share builds.

## Task 2 — storage/API, owner backend worker

Files: src/services/journeyService.ts, supabase/migrations/new journey-only expansion, tests/journey-service and SQL permissions/concurrency, supabase/config.toml as needed. Do not edit frontend worker files or existing migration/schema.

- [x] Add document and private access table/RPC definitions only. Security-definer helpers use fixed search_path, auth.uid, and new immutable document owner/access grants. Default PUBLIC execute revoked. Document table SELECT via private read policy; all writes through validated RPC only. No public sharing or caller-selected owner identity. Legacy membership is not trusted because its existing organizer insert policy has an ambiguous inner-table correlation; forged legacy membership must not grant new document access. Do not alter legacy role checks.
- [x] Create shared Trip atomically, using actual current account as creator, profile-safe initialization; keep legacy tables/contracts intact. No destructive schema reset in new migration.
- [x] Validate JSON shape, IDs/same Trip, participant references, transport enums, member account binding prohibition, room subset, dates/status/actual stamps. Only create RPC remaps provisional Trip ID to the newly generated real UUID.
- [x] CAS revision and update ownership enforced in SQL; stale revisions fail without mutation. load returns safe private envelope with canEdit computed, never caller-supplied.
- [x] Owner-only grantJourneyAccess / tripbook_grant_journey_access RPC assigns editor/member to an existing account. This grants planning-draft access, not a Member identity/account claim. Do not infer any of the six Member bindings from creator identity.
- [x] Tests exercise actual local SQL RLS: owner/editor write, member read only, outsider/anon no access, malformed/foreign participant rejection, stale revision rejection, and inability to bypass by direct table writes. Roll back fixture data.
- [x] Service tests preserve failed/conflicted drafts and propagate meaningful errors.

## Task 3 — root integration and persistence

- [x] Install dependencies in new checkout; start local Docker/Supabase if available. Never use original .env or production service-role credentials.
- [x] Run scoped tests, type-check, app/share builds; browser-check reader, six slots and local save/reload, cloud capability behavior.
- [x] Independent read-only verification of named permission/concurrency risk.
- [x] Commit reconstructed source/tests and checkpoints, record actual commands and limits. Existing public Site stays unchanged until access to its exact project can be recovered. No new duplicate Site.

## Verified reconstruction result — 2026-10-13

- Root fresh `npm run test:all`: 36 Vitest tests plus 1 database contract test passed. Three new persistence regression checks first failed, then passed after the bounded final fix.
- Root fresh `npm run build && npm run build:share`: both passed, including Vue type checking. Existing main-app large chunk and Browserslist warnings remain.
- Local actual `journey-rpc.sql` assertions passed and rolled back. Independent verification checked member read-only, editor/owner edits, outsider/anonymous denial, forged legacy memberships, immutable owner, cross-trip participants and stale revision protection.
- Local HTTP create/load/save and stale/anonymous denial verified. Browser exercised conflict choice, keeping local disables stale cloud save, adopting cloud and updating cloud both survive reload, six names/account bindings remain unknown, and 390px layout has no horizontal overflow.
- Public JS artifact scan excludes private member/group IDs, hotel seed, Supabase/Auth runtime and JWT strings. Generic optional reader field names are not private payloads.
- Cloud envelopes now persist the adopted account+trip local copy; equal cached/cloud content does not create a conflict. Failed local writes are reported separately from successful cloud adoption.
- Implementation workers: gpt-5.6-luna max. Read-only verification: gpt-5.6-sol high; reviewed known P1 races as closed before stopping for workspace credits. User explicitly authorized the root Codex fallback for the remaining persistence P2. Root verified this final bounded fix with tests and actual browser reloads.
- Original repository `/Users/unizalin/github/travelMate` was not changed. Production Supabase and existing public Site were not updated. The new migration was applied only to the dedicated local Supabase project.

## Follow-up scope, not part of reconstructed staging

- Restore access to the exact existing Sites project before updating its public deployment; no duplicate Site was created.
- Verify and back up production schema/RLS, then prepare a reviewable production rollout. Existing legacy RLS ambiguity is isolated by new private owner/access grants; it is not claimed repaired throughout legacy tables.
- Normalize Member/Account claim and invitation flow, expenses/settlement, Quick Add/Inbox, Place intelligence/Live freshness, PWA offline queue/sync, Travel Book and final five-tab IA remain future work.
- Empty transport/accommodation participant arrays mean unassigned/pending in this staging document, never all members. Shared itinerary defaults to all independently.
- No production API secrets were copied. The legacy frontend Gemini key architecture remains for a future server-side proxy; no AI provider key is configured in the rebuilt local environment.
