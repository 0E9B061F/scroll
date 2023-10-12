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

const host = os.hostname()

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
}

const rc = {
  rcfile: "/etc/scroll/scroll.yaml",
  keyfile: "/etc/scroll/key",
  logfile: "/var/log/scroll/scroll.log",
  host,
  subhost: defaults.wild,
  dry: false,
  tags: {
    global: [],
    targets: {},
  },
}

const validURL =(url)=> {
  try {
    new URL(url)
    return true
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
    if (!this.remote) this.path = path.resolve(rcbase, this.path)
  }
}

export const mkconf = (...args)=> {
  const line = new CommandLine(...args)
  console.log(line)
  const rcb = { ...rc, ...line.rc}
  const rcdata = fs.readFileSync(rcb.rcfile, { encoding: "utf-8" })
  const rcobj = YAML.parse(rcdata)
  const rcn = {...rc, ...rcobj}
  const conf = {...defaults,
    line,
    rc: { ...rc, ...rcobj, ...line.rc },
  }
  conf.rc.rcbase = path.dirname(conf.rc.rcfile)
  conf.subhost = rcn.subhost
  Object.entries(conf.rc.repos).forEach(repo => {
    conf.rc.repos[repo[0]] = new Repo(conf.rc.rcbase, repo[0], repo[1])
  })
  Object.entries(conf.rc.targets).forEach(target => {
    conf.rc.targets[target[0]] = new Target(conf.rc.rcbase, target[0], target[1])
  })
  conf.logger = new Logger(conf.rc.logfile, conf)
  conf.util = new Util(conf)
  conf.cmds = new CommandSet(conf)
  mkcmds(conf)
  return conf
}
