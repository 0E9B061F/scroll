/* scroll backup system
   by 0E9B061F <0E9B061F@protonmail.com> 2020-2024
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

import { createWriteStream } from "node:fs"
import { readFile, rm } from "node:fs/promises"

class Level {
  static levels = {}
  static get(level) {
    const len = Object.keys(this.levels).length
    level = Math.max(0, Math.min(len, level))
    return this.levels[level]
  }
  constructor(id, symbol, label) {
    this.id = id
    this.symbol = symbol
    this.label = label
    this.pretty = this.label ? `${this.label}: ` : ""
    this.sig = `@${this.id}`
    if (this.constructor.levels[this.id]) throw new Error("level already exists")
    this.constructor.levels[this.id] = this
  }
}
new Level(0, "O", "")
new Level(1, "W", "WARNING")
new Level(2, "E", "ERROR")

export default class Logger {
  constructor(conf) {
    this.conf = conf
    this.user = conf.user
    this.userstr = `~${this.user.name}`
    if (this.user.alt) this.userstr = `${this.userstr}:${this.user.alt}`
    this.files = {
      log: createWriteStream(conf.paths.log, { flags: "a" }),
      shortbuf: createWriteStream(conf.paths.shortbuf, { flags: "a" }),
      longbuf: createWriteStream(conf.paths.longbuf, { flags: "a" }),
    }
  }
  write(level, msg) {
    this.files.log.write(msg)
    this.files.shortbuf.write(msg)
    this.files.longbuf.write(msg)
    if (this.conf.rc.level <= level.id) {
      console.log(msg)
    }
  }
  async dump(name) {
    this.files[name].close()
    const data = await readFile(this.conf.paths[name], {encoding: "utf-8"})
    await rm(this.conf.paths[name])
    this.files[name] = createWriteStream(this.conf.paths[name], { flags: "a" })
    return data
  }
  log(...msg) {
    let conf = {
      level: 0,
      file: "log",
      indent: 0,
    }
    if (typeof(msg[msg.length-1]) == "object") {
      conf = { ...conf, ...msg.pop() }
    }
    const date = new Date().toISOString()
    const level = Level.get(conf.level)
    msg.forEach(m => {
      if (!conf.indent) {
        this.write(level, `${level.symbol} ${date}${this.userstr}> ${level.pretty}${m}\n`)
      } else {
        let line = `${level.symbol} ${m}\n`
        line = line.padStart(line.length+(conf.indent*2))
        this.write(level, line)
      }
    })
  }
  msg(...msg) {
    let conf = {
      level: 0,
    }
    if (typeof (msg[msg.length - 1]) == "object") {
      conf = { ...msg.pop(), ...conf }
    }
    this.log(...msg, conf)
  }
  wrn(...msg) {
    let conf = {
      level: 1,
    }
    if (typeof (msg[msg.length - 1]) == "object") {
      conf = { ...msg.pop(), ...conf }
    }
    this.log(...msg, conf)
  }
  err(...msg) {
    let conf = {
      level: 2,
    }
    if (typeof (msg[msg.length - 1]) == "object") {
      conf = { ...msg.pop(), ...conf }
    }
    this.log(...msg, conf)
  }
}
