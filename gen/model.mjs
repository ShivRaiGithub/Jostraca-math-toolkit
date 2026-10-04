// Turns the raw config into the model Jostraca receives (Jostraca({ model })).
// Everything components and `$$path$$` substitutions read comes from here.
import { kebabify } from 'jostraca'
import { FUNCTION_REGISTRY } from './registry.mjs'

export function buildModel(config, generatedAtMs) {
  const functions = config.functions.map((name) => {
    const def = FUNCTION_REGISTRY[name]
    if (!def) {
      const known = Object.keys(FUNCTION_REGISTRY).join(', ')
      throw new Error('Unknown function "' + name + '" in config.functions. Known: ' + known)
    }
    const [x, y] = def.example
    const result = new Function('a', 'b', def.lines.join('\n'))(x, y)
    return {
      name,
      ...def,
      label: name[0].toUpperCase() + name.slice(1),
      exampleCall: name + '(' + x + ', ' + y + ') // ' + result,
    }
  })

  const statistics = []
  if (config.generateAverage) statistics.push('average')
  if (config.generateMedian) statistics.push('median')

  return {
    projectName: config.projectName,
    version: config.version,
    slug: kebabify(config.projectName),
    generatedAt: new Date(generatedAtMs).toISOString(),
    functions,
    statistics,
    ui: !!config.generateUI,
    config,
  }
}
