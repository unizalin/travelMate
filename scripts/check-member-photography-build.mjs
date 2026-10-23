import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve(process.argv[2] || 'dist', 'assets')
const files = await readdir(root)
const planners = files.filter(name => /^IcelandPlanner-.*\.js$/.test(name))
assert.equal(planners.length, 1, 'Expected one member planner entry')
const member = await readFile(path.join(root, planners[0]), 'utf8')
assert.ok((member.match(/photography:/g) || []).length >= 2, 'Member activities must render photography slots')
assert.ok(member.includes('photoTip:') && member.includes('photoSpots:'), 'Member planner must select photography fields from its document')
const pending = [planners[0]], visited = new Set(), photography = []
while (pending.length) {
  const file = pending.pop()
  if (visited.has(file)) continue
  visited.add(file)
  const source = await readFile(path.join(root, file), 'utf8')
  if (source.includes('photography-spots') && source.includes('拍攝建議') && source.includes('photoSpots')) photography.push(file)
  for (const match of source.matchAll(/(?:from|import\()\s*["']\.\/([^/"']+\.js)["']/g)) pending.push(match[1])
}
assert.ok(photography.length, 'Member import graph must contain the actual photography renderer')
console.log(`Member photography build passed: ${planners[0]} -> ${photography.join(', ')}`)
