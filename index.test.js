'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Module = require('module')
const spawnSync = require('child_process').spawnSync

// The parser is real. The scanner and formatting providers are guarded so these
// tests cannot scan the checkout, open a service, or load the legacy toolchain.
function runChild () {
  const fixture = JSON.parse(process.env.TODOBRU_TEST_CASE)
  const target = process.env.TODOBRU_TEST_TARGET
  const parser = require('get-them-args')
  const gitignore = path.join(fixture.cwd, '.gitignore')
  const output = []
  let config
  let error
  const log = console.log
  const cwd = process.cwd
  const argv = process.argv
  const entry = new Module(target, module)
  entry.filename = target
  entry.require = function (name) {
    if (name === 'path') return path
    if (name === 'fs') {
      return {
        existsSync: filename => {
          assert.strictEqual(filename, gitignore)
          return fs.existsSync(filename)
        },
        readFileSync: (filename, encoding) => {
          assert.strictEqual(filename, gitignore)
          assert.strictEqual(encoding, 'utf-8')
          return fs.readFileSync(filename, encoding)
        }
      }
    }
    if (name === 'get-them-args') return parser
    if (name === 'todobru') {
      return options => {
        config = options
        return fixture.todos || []
      }
    }
    if (name === 'cli-table2') {
      return class Table {
        constructor (options) {
          assert.deepStrictEqual(options, { head: ['Key', 'Value'] })
        }
        push () {}
        toString () { return 'fixture table' }
      }
    }
    if (name === 'chalk') {
      return function (strings) {
        const values = Array.prototype.slice.call(arguments, 1)
        return strings.reduce((result, part, index) => result + part + (index < values.length ? values[index] : ''), '')
      }
    }
    throw new Error('Unexpected dependency: ' + name)
  }
  try {
    process.cwd = () => fixture.cwd
    process.argv = [process.execPath, target].concat(fixture.argv)
    console.log = value => output.push(value)
    entry._compile(fs.readFileSync(target, 'utf8'), target)
  } catch (caught) {
    error = { name: caught.name, message: caught.message }
  } finally {
    process.cwd = cwd
    process.argv = argv
    console.log = log
  }
  process.stdout.write(JSON.stringify({ config, output, error }))
}

function runTests () {
  const target = path.resolve(process.env.TODOBRU_TEST_TARGET || path.join(__dirname, 'index.js'))
  const cases = [
    { name: 'no arguments', argv: [], ignore: [] },
    { name: 'single glob', argv: ['--ignore', '*.js'], ignore: ['*.js'] },
    { name: 'equals glob', argv: ['--ignore=*.md'], ignore: ['*.md'] },
    { name: 'single filename', argv: ['--ignore', 'example.js'], ignore: ['example.js'] },
    { name: 'spaces remain in one pattern', argv: ['--ignore', 'my file.js'], ignore: ['my file.js'] },
    { name: 'unicode remains in one pattern', argv: ['--ignore', 'café.js'], ignore: ['café.js'] },
    { name: 'escaped pattern stays intact', argv: ['--ignore', '\\*.js'], ignore: ['\\*.js'] },
    { name: 'one character', argv: ['--ignore', '*'], ignore: ['*'] },
    { name: 'JSON string', argv: ['--ignore', '"*.js"'], ignore: ['*.js'] },
    { name: 'array', argv: ['--ignore', '["*.js","*.md"]'], ignore: ['*.js', '*.md'] },
    { name: 'empty array', argv: ['--ignore', '[]'], ignore: [] },
    { name: 'empty string', argv: ['--ignore='], ignore: [] },
    { name: 'bare boolean', argv: ['--ignore'], ignore: [] },
    { name: 'true boolean', argv: ['--ignore=true'], ignore: [] },
    { name: 'negated boolean', argv: ['--no-ignore'], ignore: [] },
    { name: 'false boolean', argv: ['--ignore=false'], ignore: [] },
    { name: 'null', argv: ['--ignore=null'], ignore: [] },
    { name: 'number', argv: ['--ignore=42'], ignore: [] },
    { name: 'plain object', argv: ['--ignore={}'], ignore: [] },
    { name: 'malformed list object still fails', argv: ['--ignore={"length":1}'], error: 'TypeError' },
    { name: 'repeated flag remains last wins', argv: ['--ignore=first.js', '--ignore=second.js'], ignore: ['second.js'] },
    { name: 'array member types unchanged', argv: ['--ignore=["*.js",null,false,3,["nested"]]'], ignore: ['*.js', null, false, 3, ['nested']] },
    { name: 'gitignore only', argv: [], gitignore: ' *.map \r\n # comment \n\n', ignore: ['*.map', '# comment', '', ''] },
    { name: 'gitignore before scalar', argv: ['--ignore=*.js'], gitignore: ' *.map \r\nREADME.md', ignore: ['*.map', 'README.md', '*.js'] },
    { name: 'gitignore before array', argv: ['--ignore=["*.js","*.md"]'], gitignore: '*.map\n', ignore: ['*.map', '', '*.js', '*.md'] },
    { name: 'empty gitignore kept', argv: ['--ignore=*.js'], gitignore: '', ignore: ['', '*.js'] },
    { name: 'other options forwarded', argv: ['--ignore=*.js', '--pattern=*.txt', '--base=fixture', '--flags=["TODO","FIXME"]', 'extra'], ignore: ['*.js'], other: { pattern: '*.txt', base: 'fixture', flags: ['TODO', 'FIXME'], unknown: ['extra'] } },
    { name: 'formatted result preserved', argv: ['--ignore=*.js'], ignore: ['*.js'], todos: [[{ flag: 'TODO', desc: 'owned fixture', base: 'src', name: 'example.txt', tags: ['one', 'two'], pairs: {} }]], output: '\n\n{red TODO} {bold (' + path.join('src', 'example.txt') + ')}\n\nDescription:\towned fixture\nTags:\t\tone, two\nPairs:\nNone\n    ' },
    { name: 'table result preserved', argv: ['--ignore=["*.js"]'], ignore: ['*.js'], todos: [[{ flag: 'FIXME', desc: 'table fixture', base: 'src', name: 'example.txt', tags: [], pairs: { owner: 'fixture' } }]], output: '\n\n{red FIXME} {bold (' + path.join('src', 'example.txt') + ')}\n\nDescription:\ttable fixture\nTags:\t\t\nPairs:\nfixture table\n    ' }
  ]
  let failures = 0
  cases.forEach(testCase => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'todobru-cli-test-'))
    const gitignore = path.join(directory, '.gitignore')
    try {
      if (Object.prototype.hasOwnProperty.call(testCase, 'gitignore')) fs.writeFileSync(gitignore, testCase.gitignore)
      const fixture = Object.assign({}, testCase, { cwd: directory })
      const result = spawnSync(process.execPath, [__filename], {
        env: Object.assign({}, process.env, { TODOBRU_TEST_TARGET: target, TODOBRU_TEST_CASE: JSON.stringify(fixture) }),
        encoding: 'utf8',
        timeout: 5000
      })
      assert.ifError(result.error)
      assert.strictEqual(result.status, 0, result.stderr)
      const actual = JSON.parse(result.stdout)
      if (testCase.error) {
        assert.strictEqual(actual.error.name, testCase.error)
        assert.strictEqual(actual.config, undefined)
        assert.deepStrictEqual(actual.output, [])
      } else {
        assert.strictEqual(actual.error, undefined, JSON.stringify(actual.error))
        assert.deepStrictEqual(actual.config.ignore, testCase.ignore)
        Object.keys(testCase.other || {}).forEach(key => assert.deepStrictEqual(actual.config[key], testCase.other[key]))
        assert.deepStrictEqual(actual.output, [testCase.output || ''])
      }
      console.log('PASS ' + testCase.name)
    } catch (error) {
      failures++
      console.error('FAIL ' + testCase.name + ': ' + error.message)
    } finally {
      if (Object.prototype.hasOwnProperty.call(testCase, 'gitignore')) fs.unlinkSync(gitignore)
      fs.rmdirSync(directory)
    }
  })
  console.log((cases.length - failures) + ' passed; ' + failures + ' failed')
  if (failures) process.exitCode = 1
}

if (process.env.TODOBRU_TEST_CASE) runChild()
else runTests()
