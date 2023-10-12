import byteSize from "byte-size"

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
  }, (conf, tname, rname, ...args) => {
    const tags = conf.util.consume(tname)
    conf.util.eachrepo(rname, "snapshots", `--host=${conf.rc.host}`, ...tags, ...args)
  })

  conf.cmds.make("backup:b", {
    sig: "[TARGET] [REPO] [TAG...]",
    info: "Backup TARGET to REPO, with optional TAGs.",
  }, (conf, tname, rname, ...tags) => {
    const tnames = conf.util.resolve("targets", tname)
    const rnames = conf.util.resolve("repos", rname)
    const gtags = [...conf.apptags, ...conf.rc.tags.global, ...tags]
    if (!conf.util.iswild(conf.rc.subhost)) gtags.push(conf.rc.subhost)
    if (!gtags.includes("AUTO")) gtags.push("USER")
    tnames.forEach(target => {
      const utags = conf.rc.tags.targets[target] || []
      const ttags = [
        ...gtags,
        `${target}-backup`,
        ...utags,
      ]
      const tags = conf.util.tagify(ttags)
      const path = conf.rc.targets[target].path
      const exclude = conf.rc.targets[target].exclude.map(e => `--exclude=${e}`)
      rnames.forEach(repo => {
        conf.util.perform(repo, "backup", "--one-file-system", ...tags, ...path, ...exclude)
      })
    })
  })

  conf.cmds.make("trim:t", {
    sig: "[TARGET] [REPO]",
    info: "Forget and prune snapshots for TARGET in REPO.",
  }, (conf, tname, rname, ...args) => {
    const tnames = conf.util.resolve("targets", tname)
    const policies = {}
    tnames.forEach(target => {
      const policy = conf.rc.targets[target].policy
      if (!policies[policy]) policies[policy] = []
      policies[policy].push({ ...conf.rc.targets[target], name: target })
    })
    Object.keys(policies).forEach(policy => {
      const targets = policies[policy]
      let tags = targets.map(t => `--tag=${t.name}-backup`)
      if (!conf.util.iswild(conf.subhost)) tags = tags.map(t => `${t},${conf.subhost}`)
      policy = policy.split(" ")
      conf.util.eachrepo(rname, "forget", "--prune", `--host=${conf.host}`, ...tags, ...policy, ...args)
    })
  })

  conf.cmds.make("find:f", {
    sig: "TARGET REPO [PATH...]",
    info: "Search for snapshots containing one or more PATHs in the given TARGET and REPO.",
  }, (conf, tname, rname, ...paths) => {
    const tags = conf.util.consume(tname)
    conf.util.eachrepo(rname, "find", `--host=${conf.rc.host}`, ...tags, ...paths)
  })

  conf.cmds.make("restore:r", {
    sig: "TARGET REPO PATH",
    info: "Restore the given TARGET from REPO to PATH.",
  }, (conf, tname, rname, path, ...args) => {
    if (!tname) {
      console.log("ERROR: must specify a TARGET to restore")
      conf.cmds.help("restore")
      process.exit(1)
    }
    if (conf.util.iswild(rname)) {
      console.log("ERROR: must specify a REPO to restore from")
      conf.cmds.help("restore")
      process.exit(1)
    }
    if (!path) {
      console.log("ERROR: must specify a PATH to restore to")
      conf.cmds.help("restore")
      process.exit(1)
    }
    const tags = conf.util.consume(tname)
    conf.util.perform(rname, "restore", `--host=${conf.rc.host}`, `--target=${path}`, ...tags, "latest", ...args)
  })

  conf.cmds.make("unlock:u", {
    sig: "[REPO]",
    info: "Unlock REPO, or all repos.",
  }, (conf, rname, ...args) => {
    conf.util.eachrepo(rname, "unlock", ...args)
  })

  conf.cmds.make("check:c", {
    sig: "[REPO] [ARG...]",
    info: "Check the integrity of REPO, or all repos.",
  }, (conf, rname, ...args) => {
    conf.util.eachrepo(rname, "check", ...args)
  })

  conf.cmds.make("size:s", {
    sig: "[TARGET]",
    info: "Calculate the total size of TARGET.",
  }, async (conf, tname) => {
    const tnames = conf.util.resolve("targets", tname)
    const paths = tnames.map(t => conf.rc.targets[t].path)
    const s = conf.util.getSize(...paths)
    console.log(`${byteSize(s)}`)
  })

  conf.cmds.make("x", {
    sig: "[REPO] [ARG...]",
    info: "Execute arbitrary restic commands for the given REPO.",
  }, (conf, rname, ...args) => {
    conf.util.eachrepo(rname, ...args)
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

  return conf
}