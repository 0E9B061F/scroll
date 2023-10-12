const aliases = {
  h: "host",
  s: "subhost",
  rc: "rcfile",
  key: "keyfile",
  log: "logfile",
}

export class CommandLine {
  constructor(...args) {
    let acceptopt = true
    this.cmd = null
    const re = /^([^:]+):(.*?)$/
    this.out = []
    this.rc = {}
    args.forEach(arg => {
      if (acceptopt) {
        const match = arg.match(re)
        if (match) {
          let key = match[1]
          const val = match[2]
          if (aliases[key]) key = aliases[key]
          this.rc[key] = val
        } else if (!this.cmd) {
          this.cmd = arg
        } else {
          this.out.push(arg)
          acceptopt = false
        }
      } else {
        this.out.push(arg)
      }
    })
  }
}

export class CommandSet {
  constructor(conf) {
    this.conf = conf
    this.index = {}
    this.all = []
  }
  make(...args) {
    const cmd = new Command(...args)
    cmd.names.forEach(name => {
      if (this.index[name]) {
        throw new Error(`command already exists: ${name}`)
      } else {
        this.index[name] = cmd
      }
    })
    this.all.push(cmd)
  }
  resolve(name) {
    if (this.index[name]) return this.index[name]
    else {
      console.log(`ERROR: No such command: ${name}`)
      console.log()
      this.help()
      process.exit(1)
    }
  }
  async run(name, ...args) {
    const cmd = this.resolve(name)
    await cmd.block(this.conf, ...args)
  }
  async exec() {
    return await this.run(this.conf.line.cmd, ...this.conf.line.out)
  }
  help(cmd) {
    if (this.conf.util.iswild(cmd)) {
      console.log(`scroll [OPTIONS] COMMAND [OPTIONS] [ARG...]`)
      console.log()
      console.log("COMMANDS:")
      this.all.forEach(cmd => cmd.print_help())
    } else {
      cmd = this.resolve(cmd)
      cmd.print_help()
    }
  }
}

export class Command {
  constructor(name, help, block) {
    this.names = name.split(":")
    this.name = this.names[0]
    this.aliases = this.names.slice(1)
    this.block = block
    this.help = help
  }
  print_help() {
    console.log(`${this.names.join(" / ")} ${this.help.sig}`)
    console.log(`  ${this.help.info}`)
  }
}
