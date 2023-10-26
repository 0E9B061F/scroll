import byteSize from "byte-size"
import os from "node:os"

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
    await conf.util.eachrepo(rname, "snapshots", `--host=${conf.rc.host}`, ...tags, ...args)
  })

  conf.cmds.make("backup:b", {
    sig: "[TARGET] [REPO] [TAG...]",
    info: "Backup TARGET to REPO, with optional TAGs.",
  }, async (conf, tname, rname, ...tags) => {
    const tnames = conf.util.resolve("targets", tname)
    const rnames = conf.util.resolve("repos", rname)
    const gtags = [...conf.apptags, ...conf.rc.tags.global, ...tags]
    if (!conf.util.iswild(conf.rc.subhost)) gtags.push(conf.rc.subhost)
    if (!gtags.includes("AUTO")) gtags.push("USER")
    let target, repo
    for (let tn = 0; tn < tnames.length; tn++) {
      target = tnames[tn]
      const utags = conf.rc.tags.targets[target] || []
      const ttags = [
        ...gtags,
        `${target}-backup`,
        ...utags,
      ]
      const tags = conf.util.tagify(ttags)
      const path = conf.rc.targets[target].path
      const exclude = conf.rc.targets[target].exclude.map(e => `--exclude=${e}`)
      for (let rn = 0; rn < rnames.length; rn++) {
        repo = rnames[rn]
        await conf.util.perform(repo, "backup", "--one-file-system", "--no-scan", ...tags, ...path, ...exclude)
      }
    }
  })

  conf.cmds.make("trim:t", {
    sig: "[TARGET] [REPO]",
    info: "Forget and prune snapshots for TARGET in REPO.",
  }, async (conf, tname, rname, ...args) => {
    const tnames = conf.util.resolve("targets", tname)
    const policies = {}
    tnames.forEach(target => {
      const policy = conf.rc.targets[target].policy
      if (!policies[policy]) policies[policy] = []
      policies[policy].push({ ...conf.rc.targets[target], name: target })
    })
    let policy
    const keys = Object.keys(policies)
    for (let p = 0; p < keys.length; p++) {
      policy = keys[p]
      const targets = policies[policy]
      let tags = targets.map(t => `--tag=${t.name}-backup`)
      if (!conf.util.iswild(conf.subhost)) tags = tags.map(t => `${t},${conf.subhost}`)
      policy = policy.split(" ")
      await conf.util.eachrepo(rname, "forget", "--prune", `--host=${conf.host}`, ...tags, ...policy, ...args)
    }
  })

  conf.cmds.make("find:f", {
    sig: "TARGET REPO [PATH...]",
    info: "Search for snapshots containing one or more PATHs in the given TARGET and REPO.",
  }, async (conf, tname, rname, ...paths) => {
    const tags = conf.util.consume(tname)
    await conf.util.eachrepo(rname, "find", `--host=${conf.rc.host}`, ...tags, ...paths)
  })

  conf.cmds.make("restore:r", {
    sig: "TARGET REPO PATH",
    info: "Restore the given TARGET from REPO to PATH.",
  }, async (conf, tname, rname, path, ...args) => {
    if (!tname) {
      conf.logger.err("must specify a TARGET to restore", {indent: 1})
      conf.cmds.help("restore")
    } else if (conf.util.iswild(rname)) {
      conf.logger.err("must specify a REPO to restore from", {indent: 1})
      conf.cmds.help("restore")
    } else if (!path) {
      conf.logger.err("must specify a PATH to restore to", {indent: 1})
      conf.cmds.help("restore")
    } else {
      const tags = conf.util.consume(tname)
      await conf.util.perform(rname, "restore", `--host=${conf.rc.host}`, `--target=${path}`, ...tags, "latest", ...args)
    }
  })

  conf.cmds.make("unlock:u", {
    sig: "[REPO]",
    info: "Unlock REPO, or all repos.",
  }, async (conf, rname, ...args) => {
    await conf.util.eachrepo(rname, "unlock", ...args)
  })

  conf.cmds.make("check:c", {
    sig: "[REPO] [ARG...]",
    info: "Check the integrity of REPO, or all repos.",
  }, async (conf, rname, ...args) => {
    await conf.util.eachrepo(rname, "check", ...args)
  })

  conf.cmds.make("size:s", {
    sig: "[TARGET] [REPO]",
    info: "Calculate the total size of TARGET.",
  }, async (conf, tname, rname) => {
    const tnames = conf.util.resolve("targets", tname)
    const paths = tnames.map(t => conf.rc.targets[t].path)
    const ts = conf.util.getSize(...paths)
    console.log(`Targets: ${byteSize(ts)}`)
    const rnames = conf.util.resolve("repos", rname)
    const repos = rnames.map(r => conf.rc.repos[r])
    const rs = conf.util.repoSize(...repos)
    console.log(`Repos: ${byteSize(rs)}`)
  })

  conf.cmds.make("x", {
    sig: "[REPO] [ARG...]",
    info: "Execute arbitrary restic commands for the given REPO.",
  }, async (conf, rname, ...args) => {
    await conf.util.eachrepo(rname, ...args)
  })

  conf.cmds.make("repos", {
    sig: "",
    info: "List all configured repos.",
  }, (conf) => {
    const str = Object.entries(conf.rc.repos).map(repo => {
      return `${repo[0]}: ${repo[1].path}\n`
    }).join("")
    console.log(str)
  })

  conf.cmds.make("targets", {
    sig: "",
    info: "List all configured targets.",
  }, (conf) => {
    const str = Object.entries(conf.rc.targets).map(repo => {
      const paths = repo[1].path.map(p => `  ${p}`).join("\n")
      return `${repo[0]}:\n${paths}\n`
    }).join("")
    console.log(str)
  })

  conf.cmds.make("show", {
    sig: "",
    info: "Show configuration details.",
  }, async (conf) => {
    console.log("REPOS:")
    await conf.cmds.run("repos")
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
        await conf.util.email(`[${os.hostname()}/scroll] Long Report ${date}`, `Scroll backup system long-report for ${date} on host ${os.hostname()}. See attached data.`, [
          {path: conf.paths.longbuf},
          {filename: "snapshots.txt", content: list},
          {filename: "check.txt", content: check},
        ])
        await conf.logger.dump("longbuf")
      } else {
        await conf.util.email(`[${os.hostname()}/scroll] Short Report ${date}`, `Scroll backup system short-report for ${date} on host ${os.hostname()}. See attached data.`, [
          {path: conf.paths.shortbuf},
          {filename: "snapshots.txt", content: list},
        ])
        await conf.logger.dump("shortbuf")
      }
    }
  })

  return conf
}
