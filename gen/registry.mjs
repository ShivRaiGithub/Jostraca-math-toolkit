// What the generator knows how to emit. `lines` is the single source of truth for a
// function body: it feeds src/basicFunctions.js, the inline ops table in the UI, and
// the example results in the README.
export const FUNCTION_REGISTRY = {
  add: {
    summary: 'Sum of a and b',
    lines: ['return a + b'],
    example: [3, 4],
  },
  subtract: {
    summary: 'a minus b',
    lines: ['return a - b'],
    example: [10, 4],
  },
  multiply: {
    summary: 'Product of a and b',
    lines: ['return a * b'],
    example: [6, 7],
  },
  divide: {
    summary: 'a divided by b (throws on division by zero)',
    lines: [
      "if (b === 0) throw new Error('Division by zero')",
      'return a / b',
    ],
    example: [20, 5],
  },
  power: {
    summary: 'a raised to the power b',
    lines: ['return a ** b'],
    example: [2, 10],
  },
}
