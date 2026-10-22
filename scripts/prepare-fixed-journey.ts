import { writeFileSync } from 'node:fs'
import { icelandJourney } from '../src/data/icelandJourney'
const memberNames = ['U','jinyo','Kevin Ho か','Rosanne 🌹','YU','思辰']
import { PACKING_TEMPLATE } from '../src/domain/packingChecklist'
const seed = { ...icelandJourney, members: icelandJourney.members.map((m,index) => ({ ...m, displayName: memberNames[index] })) }
const packing = PACKING_TEMPLATE.flatMap((g,i) => g.items.map((title,j) => ({ category:g.category,title,orderIndex:i*100+j })))
const literal = (value: unknown) => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb"
const sql = `SELECT public.tripbook_initialize_fixed(public.tripbook_with_london(${literal(seed)}),${literal(packing)});\n`
if (!process.argv[2]) throw new Error('Provide an output path outside the repository')
writeFileSync(process.argv[2],sql,{mode:0o600})
console.log('Prepared fixed journey SQL; contains private itinerary, no credentials or invitation token.')
