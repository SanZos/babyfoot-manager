const fs = require('fs').promises

const testRoot = './tests/'
const testFiles = []

async function findTests () {
  const dirEnts = await fs.readdir(testRoot, { withFileTypes: true })
  await readDir(dirEnts)
}

async function readDir (dirents, parent = '') {
  for (const dirent of dirents) {
    if (dirent.isFile() && dirent.name.match(/\.test\.js$/)) {
      testFiles.push(`${testRoot}${parent}${dirent.name}`)
    } else if (dirent.isDirectory()) {
      await readDir(await fs.readdir(`${testRoot}${parent}${dirent.name}`, { withFileTypes: true }), `${dirent.name}/`)
    }
  }
}

async function runTests () {
  for (const testFile of testFiles) {
    try {
      const module = require(testFile)
      console.log(`Running test file : ${testFile}`)
      run(module)
    } catch (error) {
      console.error(error)
      process.exit('-1')
    }
  }
  const { ko, ok } = require('./tests/testUtils')
  console.log(`Nb tests\tok\t\tko\t\ttotal\r\n        \t${ok}\t\t${ko}\t\t${ko + ok}`)
}

function run (module) {
  const methods = Object.getOwnPropertyNames(module).filter(name => name.match(/Test$/) !== null)
  for (const method of methods) {
    console.log(`Running test : ${method}`)
    module[method]()
    process.stdout.write('\r\n')
  }
}

findTests()
  .then(runTests)
