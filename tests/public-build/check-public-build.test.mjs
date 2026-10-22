import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { checkPublicBuild } from '../../scripts/check-public-build.mjs'

async function fixture(manifest, files = ['assets/index.js'], modules = Object.keys(manifest)) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'travelmate-public-build-'))
  await mkdir(path.join(root, 'assets'), { recursive: true })
  await writeFile(path.join(root, '.vite-manifest.json'), JSON.stringify(manifest), 'utf8')
  await writeFile(path.join(root, 'public-module-graph.json'), JSON.stringify({ version: 1, modules }), 'utf8')
  for (const file of files) {
    const destination = path.join(root, file)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, 'export const publicReader = true\n', 'utf8')
  }
  return root
}

test('accepts a public artifact whose manifest graph contains only public sources', async () => {
  const root = await fixture({
    'src/share.ts': {
      file: 'assets/index.js',
      src: 'src/share.ts',
      isEntry: true,
      imports: ['assets/chunk.js'],
    },
    'src/components/trip/TripReader.vue': { file: 'assets/chunk.js', src: 'src/components/trip/TripReader.vue' },
  }, ['assets/index.js', 'assets/chunk.js'])

  try {
    assert.deepEqual(await checkPublicBuild(root), { manifest: '.vite-manifest.json', entries: 2, modules: 2 })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('accepts London itinerary data, shared read-only presentation and accommodation without people', async () => {
  const modules = ['src/share.ts', 'src/data/londonItinerary.ts', 'src/data/londonPublic.ts', 'src/components/trip/LondonItinerary.vue', 'src/components/trip/ItineraryActivity.vue']
  const root = await fixture({ 'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true } }, ['assets/index.js'], modules)
  await writeFile(path.join(root, 'assets/index.js'), 'export const london = { date: "2026-10-24", name: "Hammersmith", accommodation: "London fixture hotel" }\n')
  try { assert.equal((await checkPublicBuild(root)).modules, modules.length) }
  finally { await rm(root, { recursive: true, force: true }) }
})

for (const privateContent of ['jinyo', 'Kevin Ho', 'Rosanne', 'YU', 'YU 的私人備註', 'member-2', 'tripbook_list_activity_comments']) {
  test(`rejects private content in an otherwise allowed London bundle: ${privateContent}`, async () => {
    const root = await fixture({ 'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true } }, ['assets/index.js'], ['src/share.ts', 'src/data/londonItinerary.ts'])
    await writeFile(path.join(root, 'assets/index.js'), `export const leaked = ${JSON.stringify(privateContent)}\n`)
    try { await assert.rejects(() => checkPublicBuild(root), /private identity or comment content/i) }
    finally { await rm(root, { recursive: true, force: true }) }
  })
}

test('rejects a manifest graph that includes a private planner or seed module', async () => {
  const root = await fixture({
    'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true },
    'src/data/icelandJourney.ts': { file: 'assets/private.js', src: 'src/data/icelandJourney.ts' },
  }, ['assets/index.js', 'assets/private.js'])

  try {
    await assert.rejects(() => checkPublicBuild(root), /private module/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects a private journey memo service from the public graph', async () => {
  const root = await fixture({
    'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true },
  }, ['assets/index.js'], ['src/share.ts', 'src/services/journeyService.ts'])

  try {
    await assert.rejects(() => checkPublicBuild(root), /private module/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects a private module even when a Vue query is attached', async () => {
  const root = await fixture({
    'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true },
  }, ['assets/index.js'], ['src/share.ts', 'src/data/icelandJourney.ts?vue&type=script&lang.ts'])

  try {
    await assert.rejects(() => checkPublicBuild(root), /private module/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('fails when the source graph is missing', async () => {
  const root = await fixture({
    'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true },
  })
  await rm(path.join(root, 'public-module-graph.json'))

  try {
    await assert.rejects(() => checkPublicBuild(root), /source graph is missing/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('fails when no Vite manifest is present', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'travelmate-public-build-'))
  try {
    await assert.rejects(() => checkPublicBuild(root), /manifest/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects traversal in manifest paths', async () => {
  const root = await fixture({
    'src/share.ts': { file: 'assets/../private.js', src: 'src/share.ts', isEntry: true },
  })

  try {
    await assert.rejects(() => checkPublicBuild(root), /traversal/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

for (const privateModule of ['src/data/icelandMemberNames.ts',
  'src/data/londonPrelude.ts',
  'src/domain/londonJourney.ts',
  'src/services/londonJourneyService.ts',
  'src/components/trip/LondonPrelude.vue',
  'src/components/trip/ItineraryActivities.vue',
  'src/services/activityCommentService.ts',
  'src/components/trip/ActivityComments.vue', 'src/services/auroraPushService.ts', 'src/components/trip/AuroraReminderSettings.vue', 'src/services/journeyRosterService.ts', 'src/components/trip/JourneyRoster.vue', 'src/services/googleLoginAvailability.ts', 'src/services/photoPreferenceService.ts', 'src/domain/photoPreferences.ts']) {
  test(`rejects private identity/auth module ${privateModule}`, async () => {
    const root = await fixture({ 'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true } }, ['assets/index.js'], ['src/share.ts', privateModule])
    try { await assert.rejects(() => checkPublicBuild(root), /private module/i) }
    finally { await rm(root, { recursive: true, force: true }) }
  })
}

 test('allows public shooting guidance while rejecting account preference loaders', async () => {
 const modules=['src/share.ts','src/components/trip/PhotographySpots.vue','src/data/icelandPhotography.ts','src/domain/journeyPhotoContext.ts']
 const root=await fixture({'src/share.ts':{file:'assets/index.js',src:'src/share.ts',isEntry:true}},['assets/index.js'],modules)
 try { assert.equal((await checkPublicBuild(root)).modules,4) }
 finally { await rm(root,{recursive:true,force:true}) }
 })

for (const moduleId of ['src/components/trip/JourneyLedger.vue', 'src/services/journeyLedgerService.ts', 'src/domain/journeyLedger.ts']) {
 test(`rejects private ledger module ${moduleId}`, async () => {
  const root = await fixture({ 'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true } }, ['assets/index.js'], ['src/share.ts', moduleId])
  try { await assert.rejects(() => checkPublicBuild(root), /private module/i) }
  finally { await rm(root, { recursive: true, force: true }) }
 })
}
test('rejects ledger RPC content in an otherwise public bundle', async () => {
 const root = await fixture({ 'src/share.ts': { file: 'assets/index.js', src: 'src/share.ts', isEntry: true } }, ['assets/index.js'], ['src/share.ts'])
 await writeFile(path.join(root, 'assets/index.js'), 'export const leaked = "tripbook_save_ledger_entry"\n')
 try { await assert.rejects(() => checkPublicBuild(root), /private identity or comment content/i) }
 finally { await rm(root, { recursive: true, force: true }) }
})
