#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const Table = require('cli-table2')
const chalk = require('chalk')
const args = require('get-them-args')()
const todobru = require('todobru')

let ignore = []

const gitignore = path.join(process.cwd(), '.gitignore')

if (fs.existsSync(gitignore)) {
  const file = fs.readFileSync(gitignore, 'utf-8')
  ignore = file.split('\n').map(item => item.trim())
}

if (args.ignore && args.ignore.length) {
  ignore = [...ignore, ...args.ignore]
}

const config = Object.assign(args, { ignore })

const flatten = (acc, c) => acc.concat(c)

const formatTODO = ({ flag, desc, base, name, tags, pairs }) => ({ file: path.join(base, name), flag, desc, tags, pairs })

const createString = (acc, { flag, file, desc, tags, pairs }) => {
  const table = new Table({
    head: ['Key', 'Value']
  })

  const entries = Object.keys(pairs).map(key => [key, pairs[key]])
  table.push(
    ...entries
  )

  return chalk`
${acc}
{red ${flag}} {bold (${file})}

Description:\t${desc}
Tags:\t\t${tags.join(', ')}
Pairs:
${entries.length ? table.toString() : 'None'}
    `
}

const todos = todobru(config)
  .reduce(flatten, [])
  .map(formatTODO)
  .reduce(createString, '')

console.log(todos)
