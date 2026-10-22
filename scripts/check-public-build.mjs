import { access, lstat, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const PRIVATE_MODULE_PATTERNS = [
  /(?:^|\/)src\/components\/trip\/JourneyLedger\.vue$/i,
  /(?:^|\/)src\/services\/journeyLedgerService\.(?:ts|js)$/i,
  /(?:^|\/)src\/domain\/journeyLedger\.(?:ts|js)$/i,
  /(?:^|\/)src\/components\/trip\/PhotoPreferenceSettings\.vue$/i,
  /(?:^|\/)src\/domain\/londonJourney\.(?:ts|js)$/i,
  /(?:^|\/)src\/services\/londonJourneyService\.(?:ts|js)$/i,
  /(?:^|\/)src\/data\/londonPrelude\.(?:ts|js)$/i,
  /(?:^|\/)src\/components\/trip\/LondonPrelude\.vue$/i,
  /(?:^|\/)src\/components\/trip\/ItineraryActivities\.vue$/i,
  /(?:^|\/)src\/services\/activityCommentService\.(?:ts|js)$/i,
  /(?:^|\/)src\/components\/trip\/ActivityComments\.vue$/i,
  /(?:^|\/)src\/data\/icelandMemberNames\.(?:ts|js)$/i,
  /(?:^|\/)src\/services\/auroraPushService\.(?:ts|js)$/i,
  /(?:^|\/)src\/components\/trip\/AuroraReminderSettings\.vue$/i,
  /(?:^|\/)src\/services\/(?:journeyRosterService|googleLoginAvailability)\.(?:ts|js)$/i,
  /(?:^|\/)src\/services\/photoPreferenceService\.(?:ts|js)$/i,
  /(?:^|\/)src\/domain\/photoPreferences\.(?:ts|js)$/i,
  /(?:^|\/)src\/components\/trip\/JourneyRoster\.vue$/i,
  /(?:^|\/)src\/data\/icelandJourney\.(?:ts|js)$/i,
  /(?:^|\/)src\/services\/supabase\.(?:ts|js)$/i,
  /(?:^|\/)src\/services\/journeyService\.(?:ts|js)$/i,
  /(?:^|\/)src\/stores\/auth\.(?:ts|js)$/i,
  /(?:^|\/)src\/(?:views|components)\/(?:IcelandPlanner|AuthCallback|Login|Register)\.(?:vue|ts|js)$/i,
  /(?:^|\/)src\/components\/auth\//i,
  /(?:^|\/)node_modules\/@supabase\//i,
]

const PRIVATE_CONTENT_PATTERNS = [
  /tripbook_(?:ledger|save_ledger_entry|void_ledger_entry)/,
  /jinyo/i,
  /Kevin\s+Ho/i,
  /Rosanne/i,
  /\bYU\b/,
  /member-[1-6]\b/,
  /tripbook_(?:list|post)_activity_comments/,
]

function assertPublicContent(content, file) {
  if (PRIVATE_CONTENT_PATTERNS.some(pattern => pattern.test(content))) {
    throw new Error(`Public build contains private identity or comment content: ${file}`)
  }
}

function assertSafeRelativePath(value, label) {
  if (typeof value !== 'string' || value.length === 0 || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    throw new Error(`Public build manifest contains an invalid ${label} path: ${String(value)}`)
  }
  const normalized = value.replaceAll('\\', '/')
  if (normalized.split('/').includes('..')) {
    throw new Error(`Public build manifest contains path traversal in ${label}: ${value}`)
  }
}

function assertPublicModule(moduleId) {
  const normalized = moduleId.replace(/[?#].*$/, '').replaceAll('\\', '/')
  if (PRIVATE_MODULE_PATTERNS.some(pattern => pattern.test(normalized))) {
    throw new Error(`Public build contains private module: ${moduleId}`)
  }
  if (/(?:^|\/)(?:supabase|auth|private)[^/]*\.(?:js|ts|vue)$/i.test(normalized)) {
    throw new Error(`Public build contains private module: ${moduleId}`)
  }
}

async function readJsonIfPresent(file) {
  try {
    await access(file)
  } catch {
    return null
  }
  return JSON.parse(await readFile(file, 'utf8'))
}

export async function checkPublicBuild(artifactRoot) {
  if (typeof artifactRoot !== 'string' || !path.isAbsolute(artifactRoot)) {
    throw new Error('Public build artifact root must be an absolute path')
  }

  const manifestCandidates = [
    path.join(artifactRoot, '.vite', 'manifest.json'),
    path.join(artifactRoot, 'manifest.json'),
    path.join(artifactRoot, '.vite-manifest.json'),
  ]
  let manifest = null
  let manifestName = null
  for (const candidate of manifestCandidates) {
    manifest = await readJsonIfPresent(candidate)
    if (manifest) {
      manifestName = path.relative(artifactRoot, candidate)
      break
    }
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error(`Public build manifest is missing in ${artifactRoot}`)
  }

  const moduleIds = new Set()
  for (const [source, entry] of Object.entries(manifest)) {
    assertSafeRelativePath(source, 'source')
    assertPublicModule(source)
    if (!entry || typeof entry !== 'object') throw new Error(`Invalid manifest entry for ${source}`)
    for (const field of ['file', 'css', 'assets']) {
      const values = field === 'file' ? [entry[field]] : (Array.isArray(entry[field]) ? entry[field] : [])
      for (const value of values) assertSafeRelativePath(value, field)
    }
    if (entry.file) {
      const outputPath = path.join(artifactRoot, entry.file)
      const outputStat = await lstat(outputPath).catch(() => null)
      if (!outputStat || !outputStat.isFile() || outputStat.isSymbolicLink()) {
        throw new Error(`Public build artifact is missing or unsafe: ${entry.file}`)
      }
      if (/\.(?:js|css|html)$/i.test(entry.file)) assertPublicContent(await readFile(outputPath, 'utf8'), entry.file)
      moduleIds.add(source)
      for (const imported of entry.imports ?? []) assertSafeRelativePath(imported, 'import')
    }
  }

  const graphPath = path.join(artifactRoot, 'public-module-graph.json')
  const graph = await readJsonIfPresent(graphPath)
  if (!graph) throw new Error('Public build source graph is missing')
  if (!Array.isArray(graph.modules) || graph.modules.length === 0) {
    throw new Error('Public build source graph is empty')
  }
  if (graph) {
    for (const moduleId of graph.modules) {
      assertSafeRelativePath(moduleId, 'module')
      assertPublicModule(moduleId)
      moduleIds.add(moduleId)
    }
  }

  if (moduleIds.size === 0) throw new Error('Public build manifest contains no entry modules')
  return { manifest: manifestName, entries: Object.keys(manifest).length, modules: moduleIds.size }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const artifactRoot = path.resolve(process.argv[2] ?? 'dist-share')
  checkPublicBuild(artifactRoot)
    .then(result => {
      console.log(`Public build check passed (${result.entries} manifest entries, ${result.modules} source modules)`)
    })
    .catch(error => {
      console.error(`Public build check failed: ${error.message}`)
      process.exitCode = 1
    })
}
