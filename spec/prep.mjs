/* scroll backup system
   by 0E9B061F <0E9B061F@protonmail.com> 2020-2024
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

import child_process from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, cp, rm, lstat, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import process from "node:process"
import { v4 } from "uuid"

import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const pwfile = join(__dirname, "password")
const root = join(__dirname, "data")
const repoa = join(root, "repo-a")
const repob = join(root, "repo-b")
const synca = join(root, "sync-a")
const syncb = join(root, "sync-b")
const target = join(root, "target")
const restorea = join(root, "restore-a")
const restoreb = join(root, "restore-b")

const spawn =(cmd, ...args)=> {
  return child_process.spawnSync(cmd, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    encoding: 'utf-8',
  })
}

class Target {
  static async make(name, conf) {
    const t = new this(name, conf)
    await mkdir(t.path, {recursive: true})
    await t.create(t.conf)
    return t
  }
  constructor(name, conf) {
    this.name = name
    this.path = join(root, this.name)
    this.conf = conf
  }
  async create(dir, base=null) {
    if (!base) base = this.path
    const pairs = Object.entries(dir)
    let pair
    for (let n = 0; n < pairs.length; n++) {
      pair = pairs[n]
      const root = join(base, pair[0])
      if (typeof(pair[1]) === "object") {
        await mkdir(root, {recursive: true})
        await this.create(pair[1], root)
      } else {
        await writeFile(root, pair[1])
      }
    }
  }
  async match(root, exclude={}, dir=null, base=null) {
    if (!dir) dir = this.conf
    if (!base) base = this.path
    let failed = []
    const pairs = Object.entries(dir)
    let pair
    for (let n = 0; n < pairs.length; n++) {
      pair = pairs[n]
      const orig = join(base, pair[0])
      const other = join(root, pair[0])
      if (exclude[pair[0]] === false) {
        if (existsSync(other)) failed.push(other)
      } else if (typeof(pair[1]) === "object") {
        if (existsSync(other) && (await lstat(other)).isDirectory()) {
          const out = await this.match(other, exclude[pair[0]] || {}, pair[1], orig)
          failed = [...failed, ...out]
        } else {
          failed.push(other)
        }
      } else {
        if (existsSync(other) && (await lstat(other)).isFile()) {
          const a = await readFile(orig, {encoding: "utf-8"})
          const b = await readFile(other, { encoding: "utf-8" })
          if (a != b) failed.push(other)
        } else failed.push(other)
      }
    }
    return failed
  }
}

const skel = {
  dir1: {
    file1: v4(),
    file2: v4(),
    file3: v4(),
    exc: {
      file4: v4(),
    },
  },
  dir2: {
    fileA: v4(),
    fileB: v4(),
    fileC: v4(),
    dir3: {
      filedD: v4(),
    },
    dir4: {
      filedE: v4(),
    },
  },
  dir5: {
    fileF: v4(),
    dir6: {
      filedG: v4(),
    },
    dir7: {
      filedH: v4(),
    },
  },
  dir8: {
    fileI: v4(),
    dir9: {
      filedJ: v4(),
      filedK: v4(),
    },
  },
}

export const prep = async(conf={})=> {
  conf = {
    repos: false,
    ...conf
  }
  console.log(root)
  await rm(root, {recursive: true})
  await mkdir(root, {recursive: true})
  await mkdir(target, {recursive: true})
  await mkdir(restorea, {recursive: true})
  await mkdir(restoreb, {recursive: true})
  await mkdir(synca, {recursive: true})
  await mkdir(syncb, {recursive: true})
  if (conf.repos) {
    spawn("restic", "init", "-r", repoa, `--password-file=${pwfile}`)
    await cp(repoa, repob, {recursive: true})
  }
  return await Target.make("target", skel)
}
