#!/usr/bin/env node

import * as program from 'commander'
import * as chalk from 'chalk'
import { genCode } from './index'

const args: any = program
  .version(require('../package.json').version)
  .option('-s, --src <url|path>', 'The url or path to the Open API spec file', String, process.env.OPEN_API_SRC)
  .option('-o, --outDir <dir>', 'The path to the directory where files should be generated', process.env.OPEN_API_OUT)
  .option('-l, --language <js|ts>', 'The language of code to generate', process.env.OPEN_API_LANG)
  .option('-k, --authKey <key>', 'Auth Key passed in Open-Api-Spec-Auth-Key header', process.env.OPEN_API_AUTHKEY)
  .option('--redux', 'True if wanting to generate redux action creators', process.env.OPEN_API_REDUX)
  .option('--semicolon', 'True if wanting to use a semicolon statement terminator', process.env.OPEN_API_SEMICOLON)
  .option('--indent <2|4|tab>', 'Indentation to use, defaults to 2 spaces', process.env.OPEN_API_INDENT)
  .parse(process.argv)

genCode(args).then(complete, error)

function complete(spec: ApiSpec) {
  console.info(chalk.bold.cyan(`Api ${args.src} code generated into ${args.outDir}`))
  process.exit(0)
}

function error(e) {
  if (e instanceof Error) {
    console.error(chalk.red(e.message), e.stack)
  } else {
    console.error(chalk.red(e))
  }
  process.exit(1)
}
