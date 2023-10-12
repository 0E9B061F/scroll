#!/usr/bin/env node

import process from "node:process"
import { mkconf } from "../lib/conf.mjs"

const conf = mkconf(...process.argv.slice(2))
console.log(`scroll ${conf.version}\n`)
await conf.cmds.exec()
