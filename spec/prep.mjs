import child_process from "node:child_process"
import fs from "fs-extra"
import fsp from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { v4 } from "uuid"

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pwfile = path.join(__dirname, "password")
const root = path.join(__dirname, "data")
const repo = path.join(root, "repo")
const target = path.join(root, "target")
const restore = path.join(root, "restore")

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
    await fs.mkdirp(t.path)
    await t.create(t.conf)
    return t
  }
  constructor(name, conf) {
    this.name = name
    this.path = path.join(root, this.name)
    this.conf = conf
  }
  async create(dir, base=null) {
    if (!base) base = this.path
    const pairs = Object.entries(dir)
    let pair
    for (let n = 0; n < pairs.length; n++) {
      pair = pairs[n]
      const root = path.join(base, pair[0])
      if (typeof(pair[1]) === "object") {
        await fs.mkdirp(root)
        await this.create(pair[1], root)
      } else {
        await fsp.writeFile(root, pair[1])
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
      const orig = path.join(base, pair[0])
      const other = path.join(root, pair[0])
      if (exclude[pair[0]] === false) {
        if (fs.existsSync(other)) failed.push(other)
      } else if (typeof(pair[1]) === "object") {
        if (fs.existsSync(other) && (await fsp.lstat(other)).isDirectory()) {
          const out = await this.match(other, exclude[pair[0]] || {}, pair[1], orig)
          failed = [...failed, ...out]
        } else {
          failed.push(other)
        }
      } else {
        if (fs.existsSync(other) && (await fsp.lstat(other)).isFile()) {
          const a = await fsp.readFile(orig, {encoding: "utf-8"})
          const b = await fsp.readFile(other, { encoding: "utf-8" })
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
      file1: v4(),
    },
  },
  dir2: {
    fileA: v4(),
    fileB: v4(),
    fileC: v4(),
    d3: {
      filed1: v4(),
    },
    d4: {
      filed2: v4(),
    },
  },
  dir3: {
    fileZ: v4(),
    d5: {
      filed1: v4(),
    },
    d6: {
      filed2: v4(),
    },
  },
}

export const prep = async ()=> {
  await fs.remove(root)
  await fs.mkdirp(root)
  await fs.mkdirp(target)
  await fs.mkdirp(restore)
  spawn("restic", "init", "-r", repo, `--password-file=${pwfile}`)
  return await Target.make("target", skel)
}
