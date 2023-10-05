'use strict'

const fs = require("fs")
const process = require("process")
const child_process = require("child_process")
const os = require("os")
const YAML = require("yaml")
const Logger = require("./logger.js")


const rcfile = "/etc/scroll/scroll.yaml"
const keyfile = "/etc/scroll/key"
const logfile = "/var/log/scroll/scroll.log"
const wild = "."
const version = "0.2.0"
const apptags = ["scroll", `sv${version}`]

const conf = {
  host: os.hostname(),
  user: {
    name: process.env["SUDO_USER"] || os.userInfo().username,
    alt: process.env["SUDO_USER"] ? os.userInfo().username : null
  },
  aliases: {
    h: "host",
    s: "subhost",
  }
}
const rcdata = fs.readFileSync(rcfile, { encoding: "utf-8" })
conf.rc = {
  host: conf.host,
  subhost: wild,
  ...YAML.parse(rcdata),
}
conf.subhost = conf.rc.subhost

const logger = new Logger("/tmp/foo", conf)


const tagify =(tags)=> {
  return tags.map(t=> `--tag ${t}`).join(" ")
}

const spawn =(...args)=> {
  return child_process.spawnSync("restic", args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    encoding: 'utf-8'
  })
}

const perform =(name, ...args)=> {
  const repo = conf.rc.repos[name]
  const ex = `--verbose -r "${repo}" --password-file "${keyfile}" ${args}`
  args = [
    "--verbose",
    "-r", repo,
    "--password-file", keyfile,
    ...args,
  ]
  const str = (["restic", ...args]).join(" ")
  logger.log(str)
  console.log(`>>> SCROLL: Repository "${name}"`)
  console.log(`>>> ${repo}`)
  console.log(`>>> ${str}`)
  console.log(`>>> BEGIN ...`)
  spawn(...args)
}

const iswild =(name)=> {
  return !name || name == wild
}

const blankwild =(name)=> {
  if (iswild(name)) return []
  else return name.split(",")
}

const resolve =(prop, name)=> {
  if (iswild(name)) {
    return Object.keys(conf.rc[prop])
  } else return name.split(",")
}

const eachrepo =(name, ...args)=> {
  const names = resolve("repos", name)
  names.forEach(n=> {
    perform(n, ...args)
  })
}

class Command {
  static index = {}
  static all = []
  static register(cmd) {
    cmd.names.forEach(name=> {
      if (this.index[name]) {
        throw new Error(`command already exists: ${name}`)
      } else {
        this.index[name] = cmd
      }
    })
    this.all.push(cmd)
  }
  static resolve(name) {
    if (this.index[name]) return this.index[name]
    else {
      console.log(`ERROR: No such command: ${name}`)
      console.log()
      this.help()
      process.exit(1)
    }
  }
  static run(name, ...args) {
    const cmd = this.resolve(name)
    cmd.block(...args)
  }
  static help(cmd) {
    if (iswild(cmd)) {
      console.log(`scroll [OPTIONS] COMMAND [OPTIONS] [ARG...]`)
      console.log()
      console.log("COMMANDS:")
      this.all.forEach(cmd=> cmd.print_help())
    } else {
      const cmd = this.resolve(name)
      cmd.print_help()
    }
  }
  constructor(name, help, block) {
    this.names = name.split(":")
    this.name = this.names[0]
    this.aliases = this.names.slice(1)
    this.block = block
    this.help = help
    this.constructor.register(this)
  }
  print_help() {
    console.log(`${this.names.join(" / ")} ${this.help.sig}`)
    console.log(`  ${this.help.info}`)
  }
}
new Command("help:h", {
  sig: "[COMMAND]",
  info: "Print help information. If no COMMAND is given, print all help information.",
}, (cmd) => {
  Command.help(cmd)
})

new Command("backup:b", {
  sig: "[TARGET] [REPO] [TAG...]",
  info: "Backup TARGET to REPO, with optional TAGs.",
}, (tname, rname, ...tags)=> {
  console.log("backup!")
  console.log(conf.rc)
})

const cli =(args)=> {
  let acceptopt = true
  let cmd = null
  const re = /^([^:]+):(.*?)$/
  const out = []
  args.forEach(arg=> {
    if (acceptopt) {
      const match = arg.match(re)
      if (match) {
        let key = match[1]
        const val = match[2]
        if (conf.aliases[key]) key = conf.aliases[key]
        conf.rc[key] = val
      } else if (!cmd) {
        cmd = arg
      } else {
        out.push(arg)
        acceptopt = false
      }
    } else {
      out.push(arg)
    }
  })
  Command.run(cmd, ...out)
}

//perform("local", "snapshots")

cli(process.argv.slice(2))
