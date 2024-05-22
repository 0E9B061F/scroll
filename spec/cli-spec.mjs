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
import { hostname } from "node:os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "data")
const restorea = join(root, "restore-a")
const restoreb = join(root, "restore-b")
const synca = join(root, "sync-a")
const syncaRoot = join(synca, hostname(), "test2")
const syncb = join(root, "sync-b")
const syncbRoot = join(syncb, hostname(), "test3")

describe("cli", ()=> {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
  it("backup and restore from restic repos with exclusions", async ()=> {
    const conf = mkconf("rcfile:./spec/scroll.yaml", "keyfile:./spec/password", "logdir:./spec")
    const t = await prep()

    await conf.cmds.run("backup", "test1", "repo-a,repo-b")
    await conf.cmds.run("restore", "test1", "repo-a", restorea)
    await conf.cmds.run("restore", "test1", "repo-b", restoreb)

    const ra = join(restorea, "home/nn/code/scroll2/spec/data/target")
    const rb = join(restoreb, "home/nn/code/scroll2/spec/data/target")
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
    const conf = mkconf("rcfile:./spec/scroll.yaml", "keyfile:./spec/password", "logdir:./spec")
    const t = await prep()

    await conf.cmds.run("backup", "test2", "sync-a")

    const m1 = await t.match(syncaRoot, {
      dir1: false,
      dir2: false,
      dir8: false,
    })

    expect(m1).toEqual([])
    
    await conf.cmds.run("restore", "test2", "sync-a", restorea)
    
    const md = {
      dir1: false,
      dir2: false,
      dir8: false,
    }
    
    const m2 = await t.match(restorea, md)
    expect(m2).toEqual([])
  })
})

