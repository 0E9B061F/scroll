"use strict"

import fs from "node:fs"


export default class Logger {
  constructor(path, conf) {
    this.path = path
    this.user = conf.user
    this.userstr = `~${this.user.name}`
    if (this.user.alt) this.userstr = `${this.userstr}:${this.user.alt}`
    this.file = fs.createWriteStream(this.path, {flags: "a"})
  }
  log(msg) {
    const date = new Date().toISOString()
    this.file.write(`${date}${this.userstr}> ${msg}\n`)
  }
}
