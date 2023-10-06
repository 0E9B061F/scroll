'use strict'

const fs = require("fs")
const process = require("process")
const child_process = require("child_process")
const os = require("os")
const YAML = require("yaml")
const Logger = require("./logger.js")
const path = require("path")


const rcfile = "/etc/scroll/scroll.yaml"
const keyfile = "/etc/scroll/key"
const logfile = "/var/log/scroll/scroll.log"
const wild = "."
const version = "0.2.0"

const conf = {
  host: os.hostname(),
  user: {
    name: process.env["SUDO_USER"] || os.userInfo().username,
    alt: process.env["SUDO_USER"] ? os.userInfo().username : null
  },
  aliases: {
    h: "host",
    s: "subhost",
  },
  policies: {},
  apptags: ["scroll", `sv${version}`]
}
const rcdata = fs.readFileSync(rcfile, { encoding: "utf-8" })
conf.rc = {
  host: conf.host,
  subhost: wild,
  dry: false,
  tags: {
    global: [],
    targets: {},
  },
  ...YAML.parse(rcdata),
}
conf.subhost = conf.rc.subhost
Object.keys(conf.rc.targets).forEach(name=> {
  const target = conf.rc.targets[name]
  if (conf.policies[target.policy]) conf.policies[target.policy].push({...target, name})
  else conf.policies[target.policy] = [{...target, name}]
})

const logger = new Logger("/tmp/foo", conf)

const tagify =(tags)=> {
  return tags.map(t=> ["--tag", t]).flat()
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
  if (conf.rc.dry) {
    console.log(`>>> DRY RUN`)
  } else {
    console.log(`>>> BEGIN ...`)
    spawn(...args)
  }
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

const consume =(tname)=> {
  const tags = blankwild(tname)
  const out = []
  tags.forEach(tag=> {
    tag = `${tag}-backup`
    if (!iswild(conf.rc.subhost)) tag=`${tag},${conf.rc.subhost}`
    out.push(`--tag=${tag}`)
  })
  if (!iswild(conf.rc.subhost) && !out.length) {
    return [`--tag=${conf.rc.subhost}`]
  } else return out
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

new Command("list:ls", {
  sig: "[TARGET] [REPO]",
  info: "List snapshots for the given target and repo, or all repos and targets if these are not given.",
}, (tname, rname, ...args) => {
  const tags = consume(tname)
  eachrepo(rname, "snapshots", `--host=${conf.rc.host}`, ...tags, ...args)
})

new Command("backup:b", {
  sig: "[TARGET] [REPO] [TAG...]",
  info: "Backup TARGET to REPO, with optional TAGs.",
}, (tname, rname, ...tags)=> {
  const tnames = resolve("targets", tname)
  const rnames = resolve("repos", rname)
  const gtags = [...conf.apptags, ...conf.rc.tags.global, ...tags]
  if (!iswild(conf.rc.subhost)) gtags.push(conf.rc.subhost)
  if (!gtags.includes("AUTO")) gtags.push("USER")
  tnames.forEach(target=> {
    const utags = conf.rc.tags.targets[target] || []
    const ttags = [
      ...gtags,
      `${target}-backup`,
      ...utags,
    ]
    const tags = tagify(ttags)
    const path = conf.rc.targets[target].path
    rnames.forEach(repo=> {
      perform(repo, "backup", "--one-file-system", ...tags, path)
    })
  })
})

new Command("trim:t", {
  sig: "[TARGET] [REPO]",
  info: "Forget and prune snapshots for TARGET in REPO.",
}, (tname, rname, ...args) => {
  const tnames = resolve("targets", tname)
  const policies = {}
  tnames.forEach(target=> {
    const policy = conf.rc.targets[target].policy
    if (!policies[policy]) policies[policy] = []
    policies[policy].push({...conf.rc.targets[target], name: target})
  })
  Object.keys(policies).forEach(policy=> {
    const targets = policies[policy]
    let tags = targets.map(t=> `--tag=${t.name}-backup`)
    if (!iswild(conf.subhost)) tags = tags.map(t => `${t},${conf.subhost}`)
    policy = policy.split(" ")
    eachrepo(rname, "forget", "--prune", `--host=${conf.host}`, ...tags, ...policy, ...args)
  })
})

new Command("find:f", {
  sig: "TARGET REPO [PATH...]",
  info: "Search for snapshots containing one or more PATHs in the given TARGET and REPO.",
}, (tname, rname, ...paths) => {
  const tags = consume(tname)
  eachrepo(rname, "find", `--host=${conf.rc.host}`, ...tags, ...paths)
})

new Command("restore:r", {
  sig: "TARGET REPO PATH",
  info: "Restore the given TARGET from REPO to PATH.",
}, (tname, rname, path, ...args) => {
  if (!tname) {
    console.log("ERROR: must specify a TARGET to restore")
    Command.help("restore")
    process.exit(1)
  }
  if (iswild(rname)) {
    console.log("ERROR: must specify a REPO to restore from")
    Command.help("restore")
    process.exit(1)
  }
  if (!path) {
    console.log("ERROR: must specify a PATH to restore to")
    Command.help("restore")
    process.exit(1)
  }
  const tags = consume(tname)
  perform(rname, "restore", `--host=${conf.rc.host}`, `--target=${path}`, ...tags, "latest", ...args)
})

new Command("unlock:u", {
  sig: "[REPO]",
  info: "Unlock REPO, or all repos.",
}, (rname, ...args) => {
  eachrepo(rname, "unlock", ...args)
})

new Command("check:c", {
  sig: "[REPO] [ARG...]",
  info: "Check the integrity of REPO, or all repos.",
}, (rname, ...args) => {
  eachrepo(rname, "check", ...args)
})

const dirSize = (...dirs)=> {
  let total = 0
  dirs.forEach(dir=> {
    getFolderSize(dir, (err, size) => {
      if (err) throw err
      total += size=8 
    });
  })
  return total / 1024 / 1024 / 1024
}

new Command("size:s", {
  sig: "",
  info: "Calculate the total size of the configured targets.",
}, ()=> {
  // const paths = Object.entries(conf.rc.targets).map(e=> e[1].path)
  // console.log(paths)
  // const s = dirSize(...paths)
  // console.log(s)
  console.log("unimplemented")
})

new Command("x", {
  sig: "[REPO] [ARG...]",
  info: "Execute arbitrary restic commands for the given REPO.",
}, (rname, ...args) => {
  eachrepo(rname, ...args)
})

new Command("repos", {
  sig: "",
  info: "List all configured repos.",
}, () => {
  const str = Object.entries(conf.rc.repos).map(repo=> {
    return `${repo[0]}: ${repo[1]}\n`
  }).join("")
  console.log(str)
})

new Command("targets", {
  sig: "",
  info: "List all configured targets.",
}, () => {
  const str = Object.entries(conf.rc.targets).map(repo => {
    return `${repo[0]}: ${repo[1].path}\n`
  }).join("")
  console.log(str)
})

new Command("show", {
  sig: "",
  info: "Show configuration details.",
}, () => {
  console.log("REPOS:")
  Command.run("repos")
  console.log("TARGETS:")
  Command.run("targets")
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

console.log(`scroll ${version}\n`)
cli(process.argv.slice(2))
