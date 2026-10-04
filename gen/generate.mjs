// Math Toolkit Generator: entry point.
//   node gen/generate.mjs [config-file] [--dry]
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Jostraca, Project } from 'jostraca'
import { buildModel } from './model.mjs'
import { PASSES } from './passes.mjs'

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const configArg = args.find((a) => !a.startsWith('--')) ?? new URL('./config.mjs', import.meta.url).pathname
const config = (await import(pathToFileURL(path.resolve(configArg)).href)).default

const OUT = path.resolve('out')
const startedAt = process.env.GEN_NOW ? Number(process.env.GEN_NOW) : Date.now()
const model = buildModel(config, startedAt)

console.log('Math Toolkit Generator -> ' + path.relative('.', OUT) + '/' + model.slug +
  ' (v' + model.version + (dry ? ', DRY RUN' : '') + ')')

for (const pass of PASSES) {
  if (pass.enabled && !pass.enabled(model)) {
    console.log('\n[' + pass.id + '] skipped (disabled by config)')
    continue
  }

  // One Jostraca instance per policy group: `existing` is the per-pass knob.
  const jostraca = Jostraca({
    model,
    now: () => startedAt,
    existing: pass.existing,
    control: { dryrun: dry },
  })

  const res = await jostraca.generate({ folder: OUT }, () => {
    Project({ folder: model.slug }, () => pass.tree(model))
  })

  console.log('\n[' + pass.id + '] policy: ' + pass.policy)
  let any = false
  for (const [kind, paths] of Object.entries(res.files)) {
    for (const p of paths) {
      any = true
      console.log('  ' + kind.padEnd(11) + path.relative(OUT, p))
    }
  }
  if (!any) console.log('  (no file changes reported)')
}
