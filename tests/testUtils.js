const assert = require('assert').strict

exports.ok = 0
exports.ko = 0

exports.out = process.stdout
exports.error = process.error

exports.runner = (type, actual, except) => {
  const test = assert[type]
  try {
    test(actual, except)
    process.stdout.write('.')
    exports.ok++
  } catch (error) {
    process.stdout.write('E')
    console.error(error)
    exports.ko++
  }
}
