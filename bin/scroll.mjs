#!/usr/bin/env node

import process from "node:process"
import { mkconf } from "../lib/conf.mjs"

const conf = mkconf(...process.argv.slice(2))
console.log(`>>> SCROLL: ${conf.version}`)
await conf.cmds.exec()
