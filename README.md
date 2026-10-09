
<div align="center">
    <img width="80%" src="preview.png" alt="preview">
</div>

# todobru-cli
[![package version](https://img.shields.io/npm/v/todobru-cli.svg?style=flat-square)](https://npmjs.org/package/todobru-cli)
[![package downloads](https://img.shields.io/npm/dm/todobru-cli.svg?style=flat-square)](https://npmjs.org/package/todobru-cli)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/todobru-cli.svg?style=flat-square)](https://npmjs.org/package/todobru-cli)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Scan project for TODOs, FIXMEs, HACKs or whatever

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#License)

## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com). 

```sh
$ npm install -g todobru-cli
$ # OR
$ yarn global add todobru-cli
```

## Usage

```sh
$ todobru
```

Pass a single file pattern with `--ignore`, or a JSON array of patterns. Quote
patterns so your shell passes them to the CLI unchanged:

```sh
$ todobru --ignore '*.js'
$ todobru --ignore '["*.js", "*.md"]'
```

These patterns are appended to the entries read from `.gitignore` in the current
directory. Repeating `--ignore` uses the last value, as with the other options.

## Development

`npm test` checks CLI argument forwarding and output with the real argument
parser, owned temporary `.gitignore` files, and guarded scanner and formatting
providers. It does not scan the checkout or run the formatter dependencies.

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT
    
