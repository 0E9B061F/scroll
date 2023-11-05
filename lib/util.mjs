import child_process from "node:child_process"

const body = (host, text)=> {
return `<!doctype html>
<html>
<head>
  <style type="text/css">
    .meta {
      background-color: #efefef;
      color: #252525;
      border: 4px solid #252525;
      display: inline-block;
      padding-left: 1em;
      padding-right: 1em;
      padding-top: 0.5em;
      padding-bottom: 0.5em;
      font-weight: bold;
      font-size: 1.4em;
    }    
  </style>
</head>
<body>
  <pre>${text}</pre>
  <pre class="meta">
LOGMAILER 0.1.6
LM_HOST ${host}
LM_SOURCE scroll
LM_STATUS (0:OK)</pre>
</body>
</html>`
}

export class Util {
  constructor(conf) {
    this.conf = conf
  }

  tagify(tags) {
    return tags.map(t => ["--tag", t]).flat()
  }

  async spawn(...args) {
    const child = child_process.spawn("restic", args, {
      cwd: process.cwd(),
      env: process.env,
    })
    let out = ""
    child.stdout.on('data', data => {
      data = data.toString()
      process.stdout.write(data)
      out += data
    })
    child.stderr.on('data', data => {
      data = data.toString()
      process.stdout.write(data)
      out += data
    })
    const status = await new Promise((resolve, reject) => {
      child.on('close', resolve)
    })
    return {status, out}
  }

  async perform(name, ...args) {
    const repo = this.conf.rc.repos[name].path
    args = [
      "--verbose",
      "-r", repo,
      "--password-file", this.conf.rc.keyfile,
      ...args,
    ]
    const str = (["restic", ...args]).join(" ")
    const head = `>>> ${name}: ${repo}`
    console.log(head)
    console.log(`>>> ${str}`)
    if (this.conf.rc.dry) {
      console.log(`>>> DRY RUN`)
    } else {
      console.log(`>>> BEGIN ...`)
      try {
        const res = await this.spawn(...args)
        res.head = head
        res.full = `${res.head}\n${res.out}`
        if (res.status != 0) {
          this.conf.logger.err(str, {indent: 1})
          this.conf.logger.err(`Exit code ${res.status}`, res.out.trim(), {indent: 2})
        } else {
          this.conf.logger.msg(str, {indent: 1})
        }
        return res
      } catch (e) {
        this.conf.logger.err(str, {indent: 1})
        this.conf.logger.err(e, {indent: 2})
        return { status: 999, out: "Internal error.", head, full: `${head}\nInternal error.` }
      }
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

  async eachrepo(name, ...args) {
    const names = this.resolve("repos", name)
    const outs = []
    for (let n = 0; n < names.length; n++) {
      outs.push(await this.perform(names[n], ...args))
    }
    return outs
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
  repoSize(...repos) {
    let total = 0
    repos.forEach(repo => {
      if (process.platform == "linux") {
        if (repo.remote) {
          let out = child_process.spawnSync("ssh", ["-p", repo.port, repo.ssh, "du", "-sbxc", repo.sshpath], { encoding: "utf-8" }).stdout
          out = out.trim().split("\n")
          out = out[out.length - 1].match(/^\S+/)[0]
          total += parseInt(out)
        } else {
          let out = child_process.spawnSync("du", ["-sbxc", repo.path], { encoding: "utf-8" }).stdout
          out = out.trim().split("\n")
          out = out[out.length - 1].match(/^\S+/)[0]
          total += parseInt(out)
        }
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

  async email(subject, text, attachments=[]) {
    if (this.conf.mailer) {
      try {
        const out = await this.conf.mailer.sendMail({
          from: `"${this.conf.host} scroll" <${this.conf.rc.mail.user}>`,
          to: `${this.conf.rc.mail.to}`,
          subject,
          text,
          html: body(this.conf.host, text),
          attachments,
        })
        this.conf.logger.log(`Sent mail: ${this.conf.rc.mail.user} -> ${this.conf.rc.mail.to} "${subject}"`, {indent: 1})
      } catch (e) {
        this.conf.logger.err(`Sending email failed`, {indent: 1})
      }
    } else {
      this.conf.logger.err(`Email not confgured`, {indent: 1})
    }
  }
}
