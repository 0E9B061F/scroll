/* scroll backup system                                     ____  __ ____  __  
   by 0E9B061F <0E9B061F@protonmail.com>                   |    \|  |    \|  | 
This Source Code Form  is subject to  the terms of        ====\  \=====\  \====
the  Mozilla Public License,  v. 2.0. If a copy of         |__|\____|__|\____| 
the MPL  was not distributed  with this  file, You             2020 - 2024
can obtain one at https://mozilla.org/MPL/2.0/.                
*/

import { logmailer } from "@0e9b061f/logmailer"
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

export class BackendError extends Error {}

export class Util {
  constructor(conf) {
    this.conf = conf
  }

  tagify(tags) {
    return tags.map(t => ["--tag", t]).flat()
  }

  async spawn(cmd, ...args) {
    const child = child_process.spawn(cmd, args, {
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

  async restic(...args) {
    return await this.spawn("restic", ...args)
  }

  async rsync(...args) {
    return await this.spawn("rsync", ...args)
  }

  async robo(repo, target, ...args) {
    let arg, cmdargs
    for (let n = 0; n < args.length; n++) {
      arg = args[n]
      cmdargs = ["robocopy", arg, repo.robopath(this.conf, target, arg), "/mir"];
      const str = cmdargs.join(" ");
      const head = `>>> ${repo.name}: ${repo.path}`;
      console.log(head);
      console.log(`>>> ${str}`);
      if (this.conf.rc.dry) {
        console.log(`>>> DRY RUN`);
      } else {
        console.log(`>>> BEGIN ...`);
        try {
          const res = await this.spawn(...cmdargs);
          res.head = head;
          res.full = `${res.head}\n${res.out}`;
          if (res.status != 0) {
            this.conf.logger.err(str, { indent: 1 });
            this.conf.logger.err(`Exit code ${res.status}`, res.out.trim(), {
              indent: 2,
            });
          } else {
            this.conf.logger.msg(str, { indent: 1 });
          }
          return res;
        } catch (e) {
          this.conf.logger.err(str, { indent: 1 });
          this.conf.logger.err(e, { indent: 2 });
          return {
            status: 999,
            out: "Internal error.",
            head,
            full: `${head}\nInternal error.`,
          };
        }
      }
    }
  }

  async roborestore(repo, p, ...args) {
    let arg, cmdargs
    for (let n = 0; n < args.length; n++) {
      arg = args[n];
      cmdargs = [
        "robocopy",
        arg,
        p,
        "/e",
      ];
      const str = cmdargs.join(" ");
      const head = `>>> ${repo.name}: ${repo.path}`;
      console.log(head);
      console.log(`>>> ${str}`);
      if (this.conf.rc.dry) {
        console.log(`>>> DRY RUN`);
      } else {
        console.log(`>>> BEGIN ...`);
        try {
          const res = await this.spawn(...cmdargs);
          res.head = head;
          res.full = `${res.head}\n${res.out}`;
          if (res.status != 0) {
            this.conf.logger.err(str, { indent: 1 });
            this.conf.logger.err(`Exit code ${res.status}`, res.out.trim(), {
              indent: 2,
            });
          } else {
            this.conf.logger.msg(str, { indent: 1 });
          }
          return res;
        } catch (e) {
          this.conf.logger.err(str, { indent: 1 });
          this.conf.logger.err(e, { indent: 2 });
          return {
            status: 999,
            out: "Internal error.",
            head,
            full: `${head}\nInternal error.`,
          };
        }
      }
    }
  }

  async sync(repo, target, ...args) {
    args = [
      "--verbose",
      "--archive",
      "--delete",
      "--mkpath",
      "--relative",
      ...args,
    ]
    if (repo.proto == "ssh:") {
      args = [
        "-e", repo.sshline(),
        ...args,
        repo.sshhost(this.conf, target),
      ]
    } else {
      args = [
        ...args,
        repo.syncpath(this.conf, target),
      ]
    }
    const str = (["rsync", ...args]).join(" ")
    const head = `>>> ${repo.name}: ${repo.path}`
    console.log(head)
    console.log(`>>> ${str}`)
    if (this.conf.rc.dry) {
      console.log(`>>> DRY RUN`)
    } else {
      console.log(`>>> BEGIN ...`)
      try {
        const res = await this.rsync(...args)
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

  async syncrestore(be, path, ...args) {
    let rsh = []
    if (be.proto == "ssh:") {
      rsh = ["-e", be.sshline()]
    }
    args = [
      "--verbose",
      "--archive",
      ...rsh,
      ...args,
      path,
    ]
    const str = (["rsync", ...args]).join(" ")
    console.log(`>>> ${str}`)
    if (this.conf.rc.dry) {
      console.log(`>>> DRY RUN`)
    } else {
      console.log(`>>> BEGIN ...`)
      try {
        const res = await this.rsync(...args)
        res.head = str
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
        return { status: 999, out: "Internal error.", str, full: `${str}\nInternal error.` }
      }
    }
  }

  async snap(repo, ...args) {
    args = [
      "--verbose",
      "-r", repo.path,
      "--password-file", this.conf.rc.keyfile,
      ...args,
    ]
    const str = (["restic", ...args]).join(" ")
    const head = `>>> ${repo.name}: ${repo.path}`
    console.log(head)
    console.log(`>>> ${str}`)
    if (this.conf.rc.dry) {
      console.log(`>>> DRY RUN`)
    } else {
      console.log(`>>> BEGIN ...`)
      try {
        const res = await this.restic(...args)
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

  ismulti(name) {
    return this.iswild(name) || name.includes(",")
  }

  blankwild(name) {
    if (this.iswild(name)) return []
    else return name.split(",")
  }

  resolve(prop, name) {
    if (this.iswild(name)) {
      return Object.keys(this.conf.registry[prop])
    } else return name.split(",")
  }

  forcebackend(mode, name) {
    const bens = this.resolve(mode, name)
    const beos = bens.map(n=> this.conf.registry.backends[n])
    for (let n = 0; n < beos.length; n++) {
      const beo = beos[n]
      if (beo.mode != mode) return false
    }
    return bens
  }

  async eachrepo(name, ...args) {
    const names = this.forcebackend("snap", name)
    if (!names) throw new BackendError()
    const backends = names.map(n=> this.conf.registry.backends[n])
    const outs = []
    for (let n = 0; n < backends.length; n++) {
      outs.push(await this.snap(backends[n], ...args))
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

  async email(conf, ...args) {
    conf = {
      ...conf,
      port: this.conf.rc.mail.port,
      server: this.conf.rc.mail.server,
      user: this.conf.rc.mail.user,
      pass: this.conf.rc.mail.pass,
      secure: this.conf.rc.mail.secure,
      from: this.conf.rc.mail.from,
      to: this.conf.rc.mail.to,
      plus: this.conf.rc.mail.plus,
      source: "scroll",
    }
    return await logmailer(conf, ...args)
  }
}
