/* scroll backup system
   by 0E9B061F <0E9B061F@protonmail.com> 2020-2024
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

import os from "node:os"
import init from "./init.mjs"
import { BackendError } from "./util.mjs"

export const mkcmds =(conf)=> {
  conf.cmds.make("help:h", {
    sig: "[COMMAND]",
    info: "Print help information. If no COMMAND is given, print all help information.",
  }, (conf, cmd) => {
    conf.cmds.help(cmd)
  })

  conf.cmds.make("list:ls", {
    sig: "[TARGET] [REPO]",
    info: "List snapshots for the given target and repo, or all repos and targets if these are not given.",
  }, async (conf, tname, rname, ...args) => {
    const tags = conf.util.consume(tname)
    try {
      await conf.util.eachrepo(rname, "snapshots", `--host=${conf.rc.host}`, ...tags, ...args)
    } catch(e) {
      if (e instanceof BackendError) {
        conf.logger.err("Invalid backend given. This command only works with repos.", { indent: 1 })
        conf.cmds.help("list")
        process.exit(1)
      } else throw e
    }
  })

  conf.cmds.make("plan:p", {
    sig: "[NAME]",
    info: "Run a plan by NAME. If no name is given, run the default plan.",
  }, async (conf, name) => {
    name ||= conf.plan
    const plan = conf.plans[name]
    for (let n = 0; n < plan.lines.length; n++) {
      const line = plan.lines[n].split(" ")
      await conf.cmds.run(...line)
    }
  })

  conf.cmds.make("backup:b", {
    sig: "[TARGET] [REPO] [TAG...]",
    info: "Backup TARGET to REPO, with optional TAGs.",
  }, async (conf, tname, rname, ...tags) => {
    const tnames = conf.util.resolve("targets", tname)
    const rnames = conf.util.resolve("backends", rname)
    const gtags = [...conf.apptags, ...conf.rc.tags.global, ...tags]
    if (!conf.util.iswild(conf.rc.subhost)) gtags.push(conf.rc.subhost)
    if (!gtags.includes(conf.autoword)) {
      if (conf.rc.auto) {
        gtags.push(conf.autoword)
      } else {
        gtags.push(conf.userword)
      }
    }
    let targn, target, repo, name
    for (let tn = 0; tn < tnames.length; tn++) {
      targn = tnames[tn]
      target = conf.registry.targets[targn]
      const utags = conf.rc.tags.targets[targn] || []
      const ttags = [
        ...gtags,
        `${targn}-backup`,
        ...utags,
      ]
      const tags = conf.util.tagify(ttags)
      const path = target.path
      const exclude = target.exclude.map(e => `--exclude=${e}`)
      const opts = ["--no-scan"]
      if (conf.iswin) opts.push("--use-fs-snapshot")
      else opts.push("--one-file-system")
      for (let rn = 0; rn < rnames.length; rn++) {
        name = rnames[rn]
        repo = conf.registry.backends[name]
        if (repo.mode == "snap") {
          await conf.util.snap(repo, "backup", ...opts, ...tags, ...path, ...exclude)
        }
        else if (repo.mode == "sync") {
          await conf.util.sync(repo, target, ...path)
        }
        else throw new Error(`Unknown mode: ${repo.mode}`)
      }
    }
  })

  conf.cmds.make("freeze", {
    sig: "TARGET REPO TITLE [TAG...]",
    info: "Take frozen snapshot of TARGET to REPO, with a TITLE and optional TAGs. Frozen snapshots are ignored by the trim command.",
  }, async (conf, tname, rname, title, ...tags) => {
    if (!tname) {
      conf.logger.err("must specify a TARGET to freeze", { indent: 1 })
      conf.cmds.help("freeze")
    } else if (!rname) {
      conf.logger.err("must specify a REPO to freeze to", { indent: 1 })
      conf.cmds.help("freeze")
    } else if (!title) {
      conf.logger.err("must specify a TITLE for the frozen snapshot", { indent: 1 })
      conf.cmds.help("freeze")
    } else {
      rname = conf.util.forcebackend("snap", rname)
      if (rname) {
        rname = rname.join(",")
        await conf.cmds.run("backup", tname, rname, conf.snapword, `${conf.snapabbr}-${title}`, ...tags)
      } else {
        conf.logger.err("can only freeze to repo backends", { indent: 1 })
        conf.cmds.help("freeze")
        process.exit(1)
      }
    }
  })

  conf.cmds.make("frozen", {
    sig: "[TARGET] [REPO]",
    info: "List frozen snapshots for the given target and repo.",
  }, async (conf, tname, rname, ...args) => {
    const tags = conf.util.consume(tname)
    try {
      await conf.util.eachrepo(rname, "snapshots", `--host=${conf.rc.host}`, ...tags, `--tag=${conf.snapword}`, ...args)
    } catch(e) {
      if (e instanceof BackendError) {
        conf.logger.err("Invalid backend given. This command only works with repos.", { indent: 1 })
        conf.cmds.help("frozen")
        process.exit(1)
      } else throw e
    }
  })

  conf.cmds.make("init", {
    sig: "",
    info: "Perform initial setup.",
  }, async (conf, tname, rname, ...args) => {
    await init()
  })

  conf.cmds.make("trim:t", {
    sig: "[TARGET] [REPO]",
    info: "Forget and prune snapshots for TARGET in REPO.",
  }, async (conf, tname, rname, ...args) => {
    const tnames = conf.util.resolve("targets", tname)
    const targets = tnames.map(n=> conf.registry.targets[n]).filter(t=> t.policy)
    const policies = {}
    targets.forEach(target => {
      const policy = target.policy
      if (!policies[policy]) policies[policy] = []
      policies[policy].push(target)
    })
    let policy
    const keys = Object.keys(policies)
    for (let p = 0; p < keys.length; p++) {
      policy = keys[p]
      const subtargets = policies[policy]
      let tags = subtargets.map(t => `--tag=${t.name}-backup`)
      if (!conf.util.iswild(conf.subhost)) tags = tags.map(t => `${t},${conf.subhost}`)
      policy = policy.split(" ")
      try {
        await conf.util.eachrepo(rname, "forget", "--prune", `--host=${conf.host}`, ...tags, ...policy, "--keep-tag", conf.snapword, ...args)
      } catch(e) {
      if (e instanceof BackendError) {
        conf.logger.err("Invalid backend given. This command only works with repos.", { indent: 1 })
        conf.cmds.help("trim")
        process.exit(1)
      } else throw e
    }
    }
  })

  conf.cmds.make("find:f", {
    sig: "TARGET REPO [PATH...]",
    info: "Search for snapshots containing one or more PATHs in the given TARGET and REPO.",
  }, async (conf, tname, rname, ...paths) => {
    const tags = conf.util.consume(tname)
    try {
      await conf.util.eachrepo(rname, "find", `--host=${conf.rc.host}`, ...tags, ...paths)
    } catch(e) {
      if (e instanceof BackendError) {
        conf.logger.err("Invalid backend given. This command only works with repos.", { indent: 1 })
        conf.cmds.help("find")
        process.exit(1)
      } else throw e
    }
  })

  conf.cmds.make("restore:r", {
    sig: "TARGET REPO PATH",
    info: "Restore the given TARGET from REPO to PATH.",
  }, async (conf, tname, rname, path, ...args) => {
    if (!tname) {
      conf.logger.err("must specify a TARGET to restore", {indent: 1})
      conf.cmds.help("restore")
    } else if (conf.util.ismulti(rname)) {
      conf.logger.err("must specify a single REPO to restore from", {indent: 1})
      conf.cmds.help("restore")
    } else if (!conf.registry.backends[rname]) {
      conf.logger.err("backend doesn't exist", {indent: 1})
      conf.cmds.help("restore")
    } else if (!path) {
      conf.logger.err("must specify a PATH to restore to", {indent: 1})
      conf.cmds.help("restore")
    } else {
      const be = conf.registry.backends[rname]
      if (be.mode == "snap") {
        const tags = conf.util.consume(tname)
        await conf.util.snap(be, "restore", `--host=${conf.rc.host}`, `--target=${path}`, ...tags, "latest", ...args)
      } else if (be.mode == "sync") {
        const tnames = conf.util.resolve("targets", tname)
        const targets = tnames.map(tn=> conf.registry.targets[tn])
        let paths
        if (be.proto == "ssh:") {
          paths = targets.map(t=> be.sshhost(conf, t))
        } else {
          paths = targets.map(t=> be.syncpath(conf, t))
        }
        await conf.util.syncrestore(be, path, ...paths)
      }
    }
  })

  conf.cmds.make("unlock:u", {
    sig: "[REPO]",
    info: "Unlock REPO, or all repos.",
  }, async (conf, rname, ...args) => {
    try {
      await conf.util.eachrepo(rname, "unlock", ...args)
    } catch(e) {
      if (e instanceof BackendError) {
        conf.logger.err("Invalid backend given. This command only works with repos.", { indent: 1 })
        conf.cmds.help("unlock")
        process.exit(1)
      } else throw e
    }
  })

  conf.cmds.make("check:c", {
    sig: "[REPO] [ARG...]",
    info: "Check the integrity of REPO, or all repos.",
  }, async (conf, rname, ...args) => {
    try {
      await conf.util.eachrepo(rname, "check", ...args)
    } catch(e) {
      if (e instanceof BackendError) {
        conf.logger.err("Invalid backend given. This command only works with repos.", { indent: 1 })
        conf.cmds.help("check")
        process.exit(1)
      } else throw e
    }
  })

  conf.cmds.make("x", {
    sig: "[REPO] [ARG...]",
    info: "Execute arbitrary restic commands for the given REPO.",
  }, async (conf, rname, ...args) => {
    try {
      await conf.util.eachrepo(rname, ...args)
    } catch(e) {
      if (e instanceof BackendError) {
        conf.logger.err("Invalid backend given. This command only works with repos.", { indent: 1 })
        conf.cmds.help("x")
        process.exit(1)
      } else throw e
    }
  })

  conf.cmds.make("backends", {
    sig: "",
    info: "List all configured backends.",
  }, (conf) => {
    const str = Object.entries(conf.registry.backends).map(be=> {
      return `${be[0]}: ${be[1].path}\n`
    }).join("")
    console.log(str)
  })

  conf.cmds.make("targets", {
    sig: "",
    info: "List all configured targets.",
  }, (conf) => {
    const str = Object.entries(conf.registry.targets).map(trgt=> {
      const paths = trgt[1].path.map(p=> `  ${p}`).join("\n")
      return `${trgt[0]}:\n${paths}\n`
    }).join("")
    console.log(str)
  })

  conf.cmds.make("show", {
    sig: "",
    info: "Show configuration details.",
  }, async (conf) => {
    console.log("BACKENDS:")
    await conf.cmds.run("backends")
    console.log("TARGETS:")
    await conf.cmds.run("targets")
  })

  conf.cmds.make("report", {
    sig: "[LONG]",
    info: "Send a report if mailing is configured.",
  }, async (conf, long) => {
    if (!conf.mailer) {
      conf.logger.err("email is not configured", {indent: 1})
      console.log("ERROR: email is not configured")
    } else {
      const tags = conf.util.consume(conf.wild)
      let list = await conf.util.eachrepo(conf.wild, "snapshots", `--host=${conf.rc.host}`, ...tags)
      list = list.map(i => i.full).join("\n")
      const date = new Date().toISOString()
      if (long) {
        let check = await conf.util.eachrepo(conf.wild, "check")
        check = check.map(i=> i.full).join("\n")
        const buffer = await conf.logger.dump("longbuf")
        await conf.util.email(`${os.hostname()} scroll: Weekly Report`, 
          `Scroll backup system long-report for ${date} on host ${os.hostname()}.\nSee attached data.\n\n${check}\n\n${buffer}\n\n${list}`,
        [ {filename: "long-buffer.log", content: buffer},
        {filename: "snapshots.txt", content: list},
        {filename: "check.txt", content: check},
      ],
      )
    } else {
      const buffer = await conf.logger.dump("shortbuf")
      await conf.util.email(`${os.hostname()} scroll: Daily Report`, 
          `Scroll backup system short-report for ${date} on host ${os.hostname()}.\nSee attached data.\n\n${buffer}\n\n${list}`,
          [{ filename: "short-buffer.log", content: buffer},
            {filename: "snapshots.txt", content: list},
          ],
        )
      }
    }
  })

  return conf
}
