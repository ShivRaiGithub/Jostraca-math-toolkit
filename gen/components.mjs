// Reusable components built with cmp(). They never mention a file or a path: they only
// emit content, and the caller decides which File that content lands in.
import { cmp, Line, each } from 'jostraca'

// Header shared by every generated JS file. `$$path$$` is Jostraca model substitution.
export const Banner = cmp(function Banner(props) {
  Line('// $$projectName$$ v$$version$$ - ' + props.title)
  Line('// ' + props.policy)
  Line('')
})

// One exported function, body taken from the registry. raw:true switches off `$$` substitution
// for text that is already final.
export const FunctionDef = cmp(function FunctionDef(props) {
  const fn = props.fn
  Line({ src: '/** ' + fn.summary + ' */', raw: true })
  Line({ src: 'export function ' + fn.name + '(a, b) {', raw: true })
  each(fn.lines, (l) => Line({ src: '  ' + l.val$, raw: true }))
  Line('}')
  Line('')
})

// The next two feed named Slots inside the HTML Fragment. `indent` is applied per Line
// because a Slot replacement does not inherit the marker's indentation.
export const ButtonEntry = cmp(function ButtonEntry(props) {
  const fn = props.fn
  Line({
    src: '<button type="button" data-op="' + fn.name + '">' + fn.label + '</button>',
    raw: true,
    indent: 2,
  })
})

export const OpEntry = cmp(function OpEntry(props) {
  const fn = props.fn
  Line({ src: fn.name + ': (a, b) => {', raw: true, indent: 2 })
  each(fn.lines, (l) => Line({ src: l.val$, raw: true, indent: 4 }))
  Line({ src: '},', raw: true, indent: 2 })
})