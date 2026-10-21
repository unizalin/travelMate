# Iceland Photography Spots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將現有九天冰島行程中的 PDF 拍攝建議整理為私人共用 Photo Spot，並提供每位已認領旅伴獨立的攝影區塊開關與手機／相機收藏，同時維持舊 `photoTip` 與公開分享隔離。

**Architecture:** `JourneyItem.photoSpots` 承載與活動綁定的可選共用資料，沿用既有 journey JSON 驗證與 CAS 儲存；`tripbook_member_photo_preferences` 以 trip/member 為範圍保存個人設定，透過 auth.uid 綁定的 RPC 和 RLS 讀寫。私人 TripReader 讀取共用 spot 與偏好，公開 seed/manifest 不匯入任何攝影模組。

**Tech Stack:** Vue 3、TypeScript、Pinia、Supabase/Postgres RPC + RLS、Vitest、Vite share build。

## Global Constraints

- 只映射最新確認 itinerary 既有 Place，不新增日期、活動、住宿或交通。
- `photoTip` 必須向後相容；舊 JSON 載入與保存不得遺失文字或新欄位。
- Photo Spot 僅登入且已授權 Trip 成員可見；公開 reader/build 不得含攝影資料或個人偏好。
- 個人開關與收藏不得寫回 shared journey；未認領／離線狀態先存在同一 member scope 本機，雲端合併必須明確。
- 不執行正式 Supabase migration、部署、資料重設或覆蓋既有草稿。

### Task 1: Domain schema and PDF-backed private seed

**Files:**
- Modify: `src/domain/tripJourney.ts`
- Modify: `src/data/icelandJourney.ts`
- Create: `src/data/icelandPhotography.ts`
- Test: `tests/domain/tripJourney.test.ts`, `tests/data/icelandPhotography.test.ts`

**Interfaces:**
- `PhotoSpot` fields: `id`, `title`, `device: 'phone'|'camera'|'both'`, `composition`, optional `suggestedTime`, optional `latitude/longitude`, optional `safetyNote`, `sourceLabel`.
- `JourneyItem.photoSpots?: PhotoSpot[]` remains optional.
- `photoSpotsForItem(item)` returns a stable cloned list and never mutates the item.

- [ ] Add strict validation for optional photo spots, stable IDs, valid device labels, finite coordinates and non-empty source labels while accepting old items without the field.
- [ ] Extract the PDF text with the configured Python/pypdf runtime, map only matching current item names, and create deterministic IDs; do not add non-itinerary places.
- [ ] Merge the seed into private `icelandItems` after legacy `photoTip`, preserving every existing item/date/order/time and leaving `publicIcelandItems` untouched.
- [ ] Add tests proving multiple spots per place, phone/camera distinctions, missing coordinates, old `photoTip` compatibility, and no extra itinerary items.

### Task 2: Member preference domain, local persistence, and cloud RPC service

**Files:**
- Create: `src/domain/photoPreferences.ts`
- Create: `src/services/photoPreferenceService.ts`
- Test: `tests/domain/photoPreferences.test.ts`, `tests/services/photoPreferenceService.test.ts`

**Interfaces:**
- `MemberPhotoPreferences = { tripId: string; memberId: string; showPhotography: boolean; phoneSpotIds: string[]; cameraSpotIds: string[]; updatedAt?: string|null }`.
- `loadLocalPhotoPreferences(accountId, tripId, memberId)` / `saveLocalPhotoPreferences(...)` use a versioned `tripbook:photo-preferences` key and return null on malformed data.
- Service methods `loadPreferences(tripId, memberId)` and `savePreferences(preferences, expectedUpdatedAt?)` call `tripbook_load_photo_preferences` and `tripbook_save_photo_preferences`.

- [ ] Normalize duplicate/unknown collection IDs without silently changing shared spots; keep phone and camera collections independent.
- [ ] Implement explicit merge helper returning `{ merged, conflicts }`, where cloud values win only after caller displays conflict state; no silent overwrite.
- [ ] Parse RPC errors into authentication, membership, conflict, and invalid-response errors consistent with `journeyService`.
- [ ] Test local round trips, malformed values, independent member scopes, offline fallback, explicit merge conflicts, and RPC payload validation.

### Task 3: Additive Supabase migration, RLS, and SQL contract

**Files:**
- Create: `supabase/migrations/20261015050000_tripbook_photo_preferences.sql`
- Modify: `tests/journey-service/migration-contract.test.mjs`
- Modify: `tests/journey-service/journey-rpc.sql`

**Interfaces:**
- Table `public.tripbook_member_photo_preferences(trip_id uuid, member_id uuid, show_photography boolean, phone_spot_ids jsonb, camera_spot_ids jsonb, updated_at timestamptz, primary key(trip_id, member_id))`.
- RPCs `tripbook_load_photo_preferences(p_trip_id uuid, p_member_id uuid)` and `tripbook_save_photo_preferences(p_trip_id uuid, p_member_id uuid, p_show_photography boolean, p_phone_spot_ids jsonb, p_camera_spot_ids jsonb, p_expected_updated_at timestamptz)` return the normalized preference object.

- [ ] Add RLS policies that require authenticated trip access and require `member.account_id = auth.uid()` for writes; owner/editor may read but cannot write another member's preference.
- [ ] Validate member belongs to trip, arrays contain strings, and expected timestamp matches for compare-and-set; revoke public/anon and grant authenticated execute only.
- [ ] Add migration contract regex checks and executable fixture cases for member isolation, read-only editor access, stale timestamp conflict, anonymous rejection, and rollback.

### Task 4: Private UI integration and offline sync affordance

**Files:**
- Create: `src/components/trip/PhotographySpots.vue`
- Modify: `src/components/trip/TripReader.vue`
- Modify: `src/views/IcelandPlanner.vue`
- Test: `tests/component/photographySpots.test.ts`, `tests/component/tripReader.test.ts`, `tests/component/icelandPlanner.test.ts`

**Interfaces:**
- `PhotographySpots` props: `item: JourneyItem`, `preferences: MemberPhotoPreferences|null`, `canEditShared: boolean`, `syncState: 'local'|'synced'|'pending'|'conflict'`; emits `toggle-show`, `toggle-phone`, `toggle-camera`, `retry-sync`.

- [ ] Render private spot cards inside each item detail only when `publicOnly === false` and the member preference allows display; show device labels, composition, suggested time, source, optional safety text and map link without requiring coordinates.
- [ ] Add per-member settings control for show/hide and separate phone/camera favorite buttons; use stable IDs and accessible labels sized for 390px layouts.
- [ ] Load preference for the claimed member on cloud journey mount, fall back to local storage while offline, and display an explicit unsynced/conflict state with a merge/retry action.
- [ ] Keep shared spot editing behind existing `canEdit`/CAS flow; do not add photo data to public components or share route.
- [ ] Add component tests for independent member state, non-member read-only state, map link/coordinate omission, and public absence.

### Task 5: Public-build sentinel isolation, full validation, and shared memory

**Files:**
- Modify: `tests/public-build/check-public-build.test.mjs`
- Modify: `tests/component/publicData.test.ts`
- Modify: `CONTEXT.md`
- Modify: `docs/development-status.md`

- [ ] Add a unique private sentinel to the photo seed and assert it is absent from public source graph, built assets, public journey JSON, and `/share/iceland` output.
- [ ] Run `npm run test:all`, `npm run build`, `npm run build:share`, `npm run check:share`, and `git diff --check`; if Docker is available run the photo SQL/RLS fixture without reset.
- [ ] Record exact changed files, branch/worktree, test outcomes, unverified browser/DB limits, and next steps in the two shared memory files.

## Self-review

- Shared spots, member preferences, legacy `photoTip`, PDF mapping, RLS, explicit offline merge, private UI, public isolation, responsive acceptance, and validation are covered by Tasks 1–5.
- No itinerary dates, order, activities, lodging, transport, or existing drafts are changed by the plan.
- Names and signatures used by later tasks are defined in the task interfaces above; no placeholder step is required.
