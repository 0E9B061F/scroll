#!/usr/bin/env node
/* scroll backup system
   by 0E9B061F <0E9B061F@protonmail.com> 2020-2024
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

import process from "node:process"
import { mkconf } from "../lib/conf.mjs"

const conf = mkconf(...process.argv.slice(2))
console.log(`>>> SCROLL: ${conf.version}`)
await conf.cmds.exec()
