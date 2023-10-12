import child_process from "node:child_process"

export class Util {
  constructor(conf) {
    this.conf = conf
  }

  tagify(tags) {
    return tags.map(t => ["--tag", t]).flat()
  }

  spawn(...args) {
    return child_process.spawnSync("restic", args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      encoding: 'utf-8',
    })
  }

  perform(name, ...args) {
    const repo = this.conf.rc.repos[name].path
    args = [
      "--verbose",
      "-r", repo,
      "--password-file", this.conf.rc.keyfile,
      ...args,
    ]
    const str = (["restic", ...args]).join(" ")
    this.conf.logger.log(str)
    console.log(`>>> SCROLL: Repository "${name}"`)
    console.log(`>>> ${repo}`)
    console.log(`>>> ${str}`)
    if (this.conf.rc.dry) {
      console.log(`>>> DRY RUN`)
    } else {
      console.log(`>>> BEGIN ...`)
      this.spawn(...args)
    }
  }

  iswild(name) {
    return !name || name == this.conf.wild
  }

  blankwild(name) {
    if (this.iswild(name)) return []
    else return name.split(",")
  }

  resolve(prop, name) {
    if (this.iswild(name)) {
      return Object.keys(this.conf.rc[prop])
    } else return name.split(",")
  }

  eachrepo(name, ...args) {
    const names = this.resolve("repos", name)
    names.forEach(n => {
      this.perform(n, ...args)
    })
  }

  consume(tname) {
    const tags = this.blankwild(tname)
    const out = []
    tags.forEach(tag => {
      tag = `${tag}-backup`
      if (!this.iswild(this.conf.rc.subhost)) tag = `${tag},${this.conf.rc.subhost}`
      out.push(`--tag=${tag}`)
    })
    if (!this.iswild(this.conf.rc.subhost) && !out.length) {
      return [`--tag=${this.conf.rc.subhost}`]
    } else return out
  }

  getSize(...dirs) {
    let total = 0
    dirs.forEach(dir => {
      if (process.platform == "linux") {
        let out = child_process.spawnSync("du", ["-sbxc", ...dir], { encoding: "utf-8" }).stdout
        out = out.trim().split("\n")
        out = out[out.length - 1].match(/^\S+/)[0]
        total += parseInt(out)
      } else if (process.platform == "win32") {
        console.log("unimplemented")
        process.exit(1)
      } else {
        console.log("unsupported platform")
        process.exit(1)
      }
    })
    return total
  }
}