// A "pass" is one Jostraca instance whose `existing` policy applies to a group of files.
//
// Why passes: Jostraca's existing-file policy (write / preserve / present / diff / merge)
// is configured per file *extension class* (txt | bin) on Jostraca(), not per File. Our
// files are all text, so to give different files different regeneration behaviour we group
// them by policy and run one generate() per group over the same output folder.
import { fileURLToPath } from 'node:url'
import {
  Folder, File, Content, Line, Inject, Fragment, Slot, List, cmp, each,
} from 'jostraca'
import {
  Banner, FunctionDef, ButtonEntry, OpEntry,
} from './components.mjs'

// Fragment `from` is resolved against the *output* folder when relative, so use an absolute path.
const INDEX_TEMPLATE = fileURLToPath(new URL('./templates/index.html', import.meta.url))

// ---------------------------------------------------------------- pass: overwrite
const Readme = cmp(function Readme(props) {
  const model = props.ctx$.model // reachable from any component, no argument threading

  Line('# $$projectName$$')
  Line('')
  Line('Version: **$$version$$**')
  Line('')
  Line('## Functions')
  Line('')
  List({ item: model.functions, line: false }, ({ replace }) => {
    Content({ src: '- `{item.name}(a, b)` - {item.summary}\n', replace })
  })
  Line('')

  Line('## Usage')
  Line('')
  Line('```js')
  const names = model.functions.map((f) => f.name).join(', ')
  Line('import { ' + names + " } from './src/basicFunctions.js'")
  each(model.functions, (fn) => Line({ src: fn.exampleCall, raw: true }))
  Line('```')
  Line('')
  Line('Your own functions go in `src/customFunctions.js`; your notes go in `docs/userNotes.md`.')
  if (model.ui) {
    Line('')
    Line('Open `public/index.html` in a browser for the calculator UI.')
  }
})

function overwriteTree(model) {
  Folder({ name: 'src' }, () => {
    File({ name: 'basicFunctions.js' }, () => {
      Banner({ title: 'basic functions', policy: 'GENERATED: overwritten on every run.' })
      each(model.functions, (fn) => FunctionDef({ fn }))
    })
  })

  File({ name: 'README.md' }, () => Readme())

  File({ name: 'package.json' }, () => {
    const pkg = {
      name: model.slug,
      version: model.version,
      description: model.projectName + ' (generated)',
      type: 'module',
      main: 'src/basicFunctions.js',
      scripts: model.ui ? { serve: 'npx --yes http-server public' } : {},
    }
    Content({ src: JSON.stringify(pkg, null, 2) + '\n', raw: true })
  })
}

// ---------------------------------------------------------------- pass: create-once
// Inject delimiters for the generated region inside customFunctions.js.
const EXAMPLES_MARKERS = [
  '// --START generated examples--\n',
  '\n// --END generated examples--',
]

function createOnceTree(model) {
  Folder({ name: 'src' }, () => {
    // write:false => created when missing, never rewritten afterwards.
    File({ name: 'customFunctions.js' }, () => {
      Line('// User Functions')
      Line('')
      Line('// --START generated examples--')
      Line('// (placeholder: replaced by Inject)')
      Line('// --END generated examples--')
    })
  })

  Folder({ name: 'docs' }, () => {
    File({ name: 'userNotes.md' }, () => {
      Line('# User Notes')
      Line('')
      Line('Write your notes here.')
      Line('')
      // The existing file is scanned for this literal string: if present, no policy overwrites it.
      Line('<!-- JOSTRACA_PROTECT: owned by the user, never regenerated -->')
    })
  })
}

// ---------------------------------------------------------------- pass: inject
// Runs after create-once, so the target already exists. (Inject into a file created by a File
// in the *same* run works but logs a "duplicate save" warning, so a separate pass is cleaner.)
function injectTree(model) {
  Folder({ name: 'src' }, () => {
    // Inject edits only the bytes between the markers, in a file that already exists.
    // Everything the user wrote outside them survives every run.
    Inject({ name: 'customFunctions.js', markers: EXAMPLES_MARKERS }, () => {
      const calls = model.functions.map((f) => '    ' + f.name + ': basic.' + f.name + '(a, b),')
      Content({
        raw: true,
        src: [
          "import * as basic from './basicFunctions.js'",
          '',
          '// Generated example: every basic function applied to the same pair.',
          'export function exampleResults(a, b) {',
          '  return {',
          ...calls,
          '  }',
          '}',
        ].join('\n'),
      })
    })
  })
}

// ---------------------------------------------------------------- pass: merge
function mergeTree(model) {
  Folder({ name: 'public' }, () => {
    File({ name: 'index.html' }, () => {
      Fragment({ from: INDEX_TEMPLATE }, () => {
        Slot({ name: 'head' }, () => Line({ src: '<title>$$projectName$$</title>' }))
        Slot({ name: 'buttons' }, () => each(model.functions, (fn) => ButtonEntry({ fn })))
        Slot({ name: 'ops' }, () => each(model.functions, (fn) => OpEntry({ fn })))
      })
    })
  })
}

// ---------------------------------------------------------------- pass: preserve
function preserveTree() {
  Folder({ name: 'docs' }, () => {
    File({ name: 'latest-updates.txt' }, () => {
      Line('$$projectName$$ - latest update')
      Line('generated: $$generatedAt$$')
      Line('version: $$version$$')
    })
  })
}

// ---------------------------------------------------------------- pass: diff
// Differences between the file on disk and the new generate are written as marked
// EXISTING / GENERATED blocks instead of being applied silently.
function diffTree(model) {
  File({ name: 'config-summary.json' }, () => {
    const summary = {
      ...model.config,
      derived: {
        slug: model.slug,
        functionCount: model.functions.length,
        statistics: model.statistics,
      },
    }
    Content({ src: JSON.stringify(summary, null, 2) + '\n', raw: true })
  })
}

export const PASSES = [
  { id: 'overwrite',   policy: 'write (default)',            existing: { txt: { write: true } },                tree: overwriteTree },
  { id: 'create-once', policy: 'write:false + PROTECT marker', existing: { txt: { write: false } },             tree: createOnceTree },
  { id: 'inject',      policy: 'Inject between markers',     existing: { txt: { write: true } },                tree: injectTree },
  { id: 'merge',       policy: 'merge (3-way)',              existing: { txt: { write: true, merge: true } },   tree: mergeTree,    enabled: (m) => m.ui },
  { id: 'preserve',    policy: 'preserve (.old backup)',     existing: { txt: { write: true, preserve: true } }, tree: preserveTree },
  { id: 'diff',        policy: 'diff (annotated 2-way)',     existing: { txt: { diff: true } },                 tree: diffTree },
]