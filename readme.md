# Math Toolkit Generator

A code generator built on [Jostraca](https://github.com/jostraca/jostraca) that turns a small config object into a Math Toolkit project, and shows how Jostraca behaves when you **generate again over files a user has edited**.

The generator contains no `fs.writeFile`, `mkdir`, `copyFile`, or hand-written overwrite/merge logic. File creation, directory creation, regeneration policy, merging, backups and diff markers are all done by Jostraca.

## Quick start

```bash
npm install
npm run gen          # Run #1: config.mjs (v1.0.0, 4 functions)
npm run gen:run2     # Run #2: config.run2.mjs (v1.1.0, adds `power`, median on)
```

Requires Node 20+ (Jostraca's declared minimum; developed on Node 22). Output goes to `out/math-toolkit/`.

You can also pass any config file: `node gen/generate.mjs path/to/config.mjs [--dry]`.

## Configuration

```js
// gen/config.mjs
export default {
  projectName: 'Math Toolkit',
  version: '1.0.0',
  functions: ['add', 'subtract', 'multiply', 'divide'],
  generateAverage: true,
  generateMedian: false,
  generateUI: true,
}
```

| Key | Effect |
|---|---|
| `projectName` | Output folder name (kebab-cased, e.g. `math-toolkit`), README title, HTML title, `package.json` name |
| `version` | Written into `package.json`, README, `latest-updates.txt`, the HTML page and file banners |
| `functions` | Which functions appear in `src/basicFunctions.js`, README, the HTML buttons and ops table, and the examples block. Must be names from `gen/registry.mjs` (`add`, `subtract`, `multiply`, `divide`, `power`); an unknown name stops the run with a clear error |
| `generateAverage` / `generateMedian` | Listed in `derived.statistics` inside `config-summary.json` (nothing else reads them) |
| `generateUI` | `false` skips the HTML pass and the `serve` script in `package.json` |

## Project layout

```
gen/
  generate.mjs        entry point: loads config, builds the model, runs each pass
  model.mjs           config -> Jostraca model (validates function names, derives slug, timestamps)
  registry.mjs        the functions the generator knows (summary, body lines, README example)
  components.mjs      reusable cmp() components (Banner, FunctionDef, ButtonEntry, OpEntry)
  passes.mjs          the file trees, grouped by regeneration policy
  templates/index.html  HTML template with named <[SLOT:...]> regions
  config.mjs          Run #1 input
  config.run2.mjs     Run #2 input
```

## What gets generated

```
out/
  math-toolkit/
    README.md
    package.json
    config-summary.json
    docs/
      userNotes.md
      latest-updates.txt
    public/
      index.html
    src/
      basicFunctions.js
      customFunctions.js
  .jostraca/             Jostraca's bookkeeping (see below)
```

## Regeneration policy per file

Each generated file demonstrates one Jostraca behaviour when it already exists on disk.

| File | Policy | What happens on the next run |
|---|---|---|
| `src/basicFunctions.js` | **write** (overwrite) | Always regenerated from config. Hand edits are lost. |
| `README.md`, `package.json` | **write** | Same: pure derived output. |
| `src/customFunctions.js` | **create once + `Inject`** | Created with `// User Functions` and a marked block. Later runs replace *only* the text between `// --START generated examples--` and `// --END generated examples--`; everything the user wrote outside the markers is kept. |
| `docs/userNotes.md` | **create once + `JOSTRACA_PROTECT`** | Never overwritten. The literal string `JOSTRACA_PROTECT` in the existing file blocks every policy. |
| `public/index.html` | **merge** (three-way) | Generated sections update; hand edits that don't touch the same lines survive. Overlapping edits become `<<<<<<< GENERATED ... ======= ... >>>>>>> EXISTING` conflict markers. |
| `docs/latest-updates.txt` | **preserve** | Overwritten, but the previous bytes are kept in `latest-updates.old.txt` (one generation deep). |
| `config-summary.json` | **diff** | Differences are written as `<<<<<<< EXISTING ... >>>>>>> EXISTING` followed by `<<<<<<< GENERATED ... >>>>>>> GENERATED` blocks (two-way, no `=======`). |

Jostraca produces all of the markers; the generator never writes one.

## How it works

1. **Model.** `model.mjs` turns the config into a plain object, passed to `Jostraca({ model })`. Content uses `$$projectName$$`-style substitution, and components read the model via `props.ctx$.model`.
2. **Components.** Reusable pieces built with `cmp()` emit content only. The caller's `File` decides where it lands.
3. **Passes.** Jostraca applies its existing-file policy (`write`, `preserve`, `present`, `diff`, `merge`) **per extension class** (`txt` or `bin`) on `Jostraca()`, not per `File`. Every generated file here is text, so `generate.mjs` groups files by policy and runs one `generate()` per group over the same output folder. The groups are defined in `PASSES` in `passes.mjs`.
4. **Template.** `public/index.html` comes from `templates/index.html` through `Fragment` and `Slot` (`head`, `buttons`, `ops`). The template path is absolute because a relative `Fragment` `from` resolves against the output folder.
5. **Bookkeeping.** Jostraca writes `out/.jostraca/jostraca.meta.log` and keeps a copy of each generated file under `out/.jostraca/generated/`. That copy is the merge baseline (common ancestor). Do not delete it if you rely on merge.

## Trying the regeneration behaviour

1. `npm run gen` to create the project.
2. Edit some generated files by hand: add a line to `basicFunctions.js`, a function above the markers in `customFunctions.js`, text in `userNotes.md`, and a `<footer>` in `index.html`.
3. `npm run gen:run2`.

Expected result:

- The `basicFunctions.js` edit is gone and `power` appears.
- Your function in `customFunctions.js` survives, and the examples block gains `power`.
- `userNotes.md` is untouched.
- `index.html` gains the Power button and keeps your footer.
- `latest-updates.old.txt` holds the Run #1 version.
- `config-summary.json` contains EXISTING/GENERATED diff blocks.

## Things to know

- **Diff and conflict markers leave files invalid** (`config-summary.json` is no longer valid JSON until you resolve the blocks). Resolve them before generating again, because a later run diffs against the marked-up file.
- **Jostraca never deletes files.** If you remove a function or turn something off, files from earlier runs stay until you delete them.
- **`present`-style sidecars are not used here.** Only `preserve` creates a sibling file (`.old`).
- **`Inject` needs the target to exist**, so injection runs in its own pass after the file is created. Injecting into a file created in the same run logs a "duplicate save" warning.
- **Slot replacements start at column zero** and keep the marker's trailing newline, so generated HTML has an extra blank line inside the button list and the ops table. Indentation is applied per `Line` with `indent`.
- **Timestamps.** `latest-updates.txt` uses the run's start time. Set `GEN_NOW=<epoch ms>` for reproducible output.

## Jostraca features demonstrated

| Feature | Where |
|---|---|
| `Project`, `Folder`, `File`, `Content`, `Line` | `passes.mjs` |
| Model substitution (`$$path$$`) and `raw` content | `components.mjs`, `passes.mjs` |
| `cmp()` components | `components.mjs`, `Readme` in `passes.mjs` |
| `each`, `List` | `components.mjs`, `Readme` in `passes.mjs` |
| `Fragment` + `Slot` | `mergeTree` in `passes.mjs`, `templates/index.html` |
| `Inject` | `injectTree` in `passes.mjs` |
| `existing`: `write`, `write:false`, `preserve`, `diff`, `merge` | `PASSES` in `passes.mjs` |
| `JOSTRACA_PROTECT` | `createOnceTree` in `passes.mjs` |
| `control.dryrun` | `--dry` flag in `generate.mjs` |

## Dependencies

- `jostraca` - the generator engine.

## References

- [Jostraca tutorial](https://github.com/jostraca/jostraca/blob/main/docs/tutorial.md)
- [Options reference](https://github.com/jostraca/jostraca/blob/main/docs/reference-options.md) (existing-file modes, `.jostraca` folder, `control`)
- [Components reference](https://github.com/jostraca/jostraca/blob/main/docs/reference-components.md)