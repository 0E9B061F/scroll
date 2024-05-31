/* scroll backup system                                     ____  __ ____  __  
   by 0E9B061F <0E9B061F@protonmail.com>                   |    \|  |    \|  | 
This Source Code Form  is subject to  the terms of        ====\  \=====\  \====
the  Mozilla Public License,  v. 2.0. If a copy of         |__|\____|__|\____| 
the MPL  was not distributed  with this  file, You             2020 - 2024
can obtain one at https://mozilla.org/MPL/2.0/.                
*/

import { CommandLine } from "./cli.mjs"
import os from "node:os"
import YAML from "yaml"
import path from "node:path"
import { readFile } from "node:fs/promises"
import { readFileSync } from "node:fs"
import { Util } from "./util.mjs"
import Logger from "./logger.mjs"
import { mkcmds } from "./cmds.mjs"
import { CommandSet } from "./cli.mjs"
import { URL } from "node:url"
import nodemailer from "nodemailer"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(await readFile(path.join(__dirname, "../package.json")))

const host = os.hostname()
const plat = os.platform()

let defconf, deflog

if (plat == "win32") {
  defconf = path.join(process.env.ALLUSERSPROFILE, "scroll")
  deflog = defconf
} else {
  defconf = "/etc/scroll"
  deflog = "/var/log/scroll"
}

export const defaults = {
  wild: ".",
  snapword: "FROZEN",
  snapabbr: "freeze",
  mode: "snap",
  plan: "main",
  autoword: "AUTO",
  userword: "USER",
  version: pkg.version,
  host, plat,
  iswin: plat == "win32",
  user: {
    name: process.env["SUDO_USER"] || os.userInfo().username,
    alt: process.env["SUDO_USER"] ? os.userInfo().username : null
  },
  policies: {},
  apptags: ["scroll", `sv${pkg.version}`],
  mailer: null,
  filenames: {
    log: "scroll.log",
    shortbuf: "short-buffer.log",
    longbuf: "long-buffer.log",
  },
  paths: {},
  registry: {
    targets: {},
    backends: {},
  },
  plans: {},
}

const rc = {
  rcfile: path.join(defconf, "scroll.yaml"),
  keyfile: path.join(defconf, "key"),
  logdir: deflog,
  host,
  level: 0,
  subhost: defaults.wild,
  dry: false,
  tags: {
    global: [],
    targets: {},
  },
  mail: false,
  backends: [],
  plan: {},
  auto: false,
}
rc.plan[defaults.plan] = [
  "backup . .",
]

class Target {
  constructor(rcbase, name, conf) {
    conf = {
      exclude: [],
      ...conf,
    }
    this.name = name
    this.path = conf.path
    if (typeof (this.path) === "string") {
      this.path = [this.path]
    }
    this.path = this.path.map(p => path.resolve(rcbase, p))
    this.exclude = conf.exclude
    if (typeof (this.exclude) === "string") {
      this.exclude = [this.exclude]
    }
    this.exclude = this.exclude.map(p => path.resolve(rcbase, p))
    this.policy = conf.policy
  }
}

export class Backend {
  // XXX This regex mess is here because the URL library can't parse certain
  // URLs used by rest. for example, it can't handle multiple protocols, so a
  // URL like `rest:http://host.com` isn't handled correctly. It also handles
  // scroll's mode syntax. Nonetheless, this needs work or an alternate solution
  // should be found.
  static windowsRe = /(?:(?<mode>[a-zA-Z]+)::)?(?<raw>(?:[A-Z]:|\.)(?:\\[^\\\n\r]*)+)/
  static linuxRe = /(?:(?<mode>[a-zA-Z]+)::)?(?<raw>\.?(?:\/[^\/\n\r]*)+)/
  static localRe = plat == "win32" ? this.windowsRe : this.linuxRe
  static modeRe = "(?:(?<mode>[a-zA-Z]+)::)?"
  static urlRe = "(?<proto>(?:[a-zA-Z0-9]+:)+?)(?:\\/\\/)?(?:(?<user>[-a-zA-Z0-9%._\\+#=]+?)(?:\\:(?<pass>[-a-zA-Z0-9%._\\+~#=]+))?@)?(?<host>[-a-zA-Z0-9%._\\+~#=]+)(?:\\:(?<port>\\d*))?(?<tail>[-a-zA-Z0-9@:%_\\+.~#?&//=]*)"
  static finalRe = `${this.modeRe}(?<raw>${this.urlRe})`
  static re = new RegExp(this.finalRe)
  constructor(rcbase, name, p) {
    this.name = name
    let m 
    if (m = Backend.localRe.exec(p)) {
      this.remote = false
      this.mode = m.groups.mode || defaults.mode
      this.path = m.groups.raw
    } else if (m = Backend.re.exec(p)) {
      this.remote = true
      this.path = m.groups.raw
      this.mode = m.groups.mode || defaults.mode
      this.proto = m.groups.proto
      this.protos = []
      this.user = m.groups.user
      this.pass = m.groups.pass
      this.host = m.groups.host
      this.port = m.groups.port
      this.tail = m.groups.tail
    } else {
      throw new Error("invalid location")
    }
    if (this.proto) {
      this.protos = this.proto.slice(0,-1).split(":")
    }
    if (!this.remote) this.path = path.resolve(rcbase, this.path)
  }
  syncpath(conf, target) {
    return path.join(this.path, conf.rc.host, target.name, "/")
  }
  sshline() {
    const port = this.port ? ` -p ${this.port}` : ""
    return `ssh${port}`
  }
  sshhost(conf, target) {
    const tail = path.join(this.tail || "/", conf.rc.host, target.name, "/")
    const user = this.user ? `${this.user}@` : ""
    return `${user}${this.host}:${tail}`
  }
}

class Plan {
  constructor(conf, name, lines) {
    this.conf = conf
    this.name = name
    this.lines = lines
  }
}

export const mkconf = (...args)=> {
  const line = new CommandLine(...args)
  const rcb = { ...rc, ...line.rc}
  const rcdata = readFileSync(rcb.rcfile, { encoding: "utf-8" })
  const rcobj = YAML.parse(rcdata)
  const rcn = {...rc, ...rcobj}
  const conf = {...defaults,
    line,
    rc: { ...rc, ...rcobj, ...line.rc },
  }
  conf.paths = {
    log: path.join(conf.rc.logdir, conf.filenames.log),
    shortbuf: path.join(conf.rc.logdir, conf.filenames.shortbuf),
    longbuf: path.join(conf.rc.logdir, conf.filenames.longbuf),
  }
  conf.rc.rcbase = path.dirname(conf.rc.rcfile)
  conf.subhost = rcn.subhost
  Object.entries(conf.rc.backends).forEach(be => {
    const beo = new Backend(conf.rc.rcbase, be[0], be[1])
    conf.registry.backends[beo.name] = beo
    conf.registry[beo.mode] ||= {}
    conf.registry[beo.mode][beo.name] = beo
  })
  Object.entries(conf.rc.targets).forEach(target => {
    conf.registry.targets[target[0]] = new Target(conf.rc.rcbase, target[0], target[1])
  })
  if (Array.isArray(conf.rc.plan)) {
    const obj = {}
    obj[conf.plan] = conf.rc.plan
    conf.rc.plan = obj
  }
  Object.entries(conf.rc.plan).forEach(plan=> {
    conf.plans[plan[0]] = new Plan(this, plan[0], plan[1])
  })
  conf.logger = new Logger(conf)
  conf.util = new Util(conf)
  conf.cmds = new CommandSet(conf)
  if (conf.rc.mail) {
    conf.mailer = nodemailer.createTransport({
      host: conf.rc.mail.host,
      port: conf.rc.mail.port,
      secure: conf.rc.mail.secure,
      auth: {
        user: conf.rc.mail.user,
        pass: conf.rc.mail.pass,
      }
    })
  }
  mkcmds(conf)
  return conf
}
