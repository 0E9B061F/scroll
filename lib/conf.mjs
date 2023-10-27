import pkg from "../package.json" assert { type: 'json' }
import { CommandLine } from "./cli.mjs"
import os from "node:os"
import YAML from "yaml"
import path from "node:path"
import fs from "node:fs"
import { Util } from "./util.mjs"
import Logger from "./logger.mjs"
import { mkcmds } from "./cmds.mjs"
import { CommandSet } from "./cli.mjs"
import { URL } from "node:url"
import nodemailer from "nodemailer"

const host = os.hostname()
const plat = os.platform()

if (plat == "win32") {
  const defconf = path.join(process.env.ALLUSERSPROFILE, "scroll")
  const deflog = defconf
} else {
  const defconf = "/etc/scroll"
  const deflog = "/var/log/scroll"
}

const defaults = {
  wild: ".",
  version: pkg.version,
  host,
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
}

const rc = {
  rcfile: path.join(defconf, "scroll.yaml"),
  keyfile: path.join(defconf, "key"),
  logdir: deflog,
  host,
  subhost: defaults.wild,
  dry: false,
  tags: {
    global: [],
    targets: {},
  },
  mail: false,
}

const validURL =(url)=> {
  try {
    return new URL(url)
  } catch (e) {
    return false
  }
}

class Target {
  constructor(rcbase, name, conf) {
    conf = {
      exclude: [],
      ...conf
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

class Repo {
  constructor(rcbase, name, p) {
    this.name = name
    this.path = p
    this.remote = validURL(this.path)
    if (this.remote) {
      const at = this.remote.username ? `${this.remote.username}@` : ""
      this.ssh = `${at}${this.remote.hostname}`
      this.sshpath = this.remote.pathname
      this.port = this.remote.port || 22
    } else {
      this.path = path.resolve(rcbase, this.path)
    }
  }
}

export const mkconf = (...args)=> {
  const line = new CommandLine(...args)
  const rcb = { ...rc, ...line.rc}
  const rcdata = fs.readFileSync(rcb.rcfile, { encoding: "utf-8" })
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
  Object.entries(conf.rc.repos).forEach(repo => {
    conf.rc.repos[repo[0]] = new Repo(conf.rc.rcbase, repo[0], repo[1])
  })
  Object.entries(conf.rc.targets).forEach(target => {
    conf.rc.targets[target[0]] = new Target(conf.rc.rcbase, target[0], target[1])
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
