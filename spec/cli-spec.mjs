/* scroll backup system                                     ____  __ ____  __  
   by 0E9B061F <0E9B061F@protonmail.com>                   |    \|  |    \|  | 
This Source Code Form  is subject to  the terms of        ====\  \=====\  \====
the  Mozilla Public License,  v. 2.0. If a copy of         |__|\____|__|\____| 
the MPL  was not distributed  with this  file, You             2020 - 2024
can obtain one at https://mozilla.org/MPL/2.0/.                
*/

import { prep } from "./prep.mjs"
import { mkconf } from "../lib/conf.mjs"
import { dirname, join } from "node:path"
import { fileURLToPath } from 'node:url'
import { hostname, platform } from "node:os";

const plat = platform()

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "data")
const target = join(root, "target")
const restorea = join(root, "restore-a")
const restoreb = join(root, "restore-b")
const synca = join(root, "sync-a")
const syncaRoot = join(synca, hostname(), "test2")
const syncb = join(root, "sync-b")
const syncbRoot = join(syncb, hostname(), "test3")

let t = target
if (plat == "win32") {
  t = t.replace(/^([a-zA-Z]):\\/, "$1\\")
}

const ra = join(restorea, t)
const rb = join(restoreb, t)
const sa = join(syncaRoot, t)


let rcopt, keyopt, logopt
if (plat == "win32") {
  rcopt = "rcfile:.\\spec\\scroll.win.yaml"
  keyopt = "keyfile:.\\spec\\password"
  logopt = "logdir:.\\spec"
} else {
  rcopt = "rcfile:./spec/scroll.yaml"
  keyopt = "keyfile:./spec/password"
  logopt = "logdir:./spec"
}

describe("cli", ()=> {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000
  it("backup and restore from restic repos with exclusions", async ()=> {
    const conf = mkconf(rcopt, keyopt, logopt)
    const t = await prep({repos: true})

    await conf.cmds.run("backup", "test1", "repo-a,repo-b")
    await conf.cmds.run("restore", "test1", "repo-a", restorea)
    await conf.cmds.run("restore", "test1", "repo-b", restoreb)

    const md = {
      dir1: {
        exc: false,
      },
      dir5: false,
      dir8: false,
    }

    const m1 = await t.match(ra, md)
    const m2 = await t.match(rb, md)

    expect(m1).toEqual([])
    expect(m2).toEqual([])
  })
  it("can backup and restore from rsync backends", async()=> {
    const conf = mkconf(rcopt, keyopt, logopt)
    const t = await prep()

    const md = {
      dir1: false,
      dir2: false,
      dir8: false,
    }

    await conf.cmds.run("backup", "test2", "sync-a")

    const m1 = await t.match(sa, md)
    expect(m1).toEqual([])
    
    await conf.cmds.run("restore", "test2", "sync-a", restorea)
    
    const m2 = await t.match(ra, md)
    expect(m2).toEqual([])
  })
})

