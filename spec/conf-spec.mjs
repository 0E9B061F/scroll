import { defaults } from "../lib/conf.mjs"
import { Backend } from "../lib/conf.mjs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const bename = "test"

const expectBackend =async(conf)=> {
  conf = {
    mode: defaults.mode,
    name: bename,
    ...conf,
  }
  expect(conf.be.remote).toBe(conf.remote)
  expect(conf.be.mode).toBe(conf.mode)
  expect(conf.be.name).toBe(conf.name)
  expect(conf.be.path).toBe(conf.path)
}
const expectRemote =async(conf)=> {
  conf.remote = true
  expectBackend(conf)
}
const expectLocal =async(conf)=> {
  conf.remote = false
  expectBackend(conf)
}

describe("Backend", ()=> {
  it("should parse absolute and relative local paths", async()=> {
    const abs = "/tmp/repo"
    const rel = "./foo/repo"
    const rab = join(__dirname, rel)
    let be = new Backend(__dirname, bename, abs)
    expectLocal({be, path: abs})
    be = new Backend(__dirname, "test", rel)
    expectLocal({be, path: rab})
  })
  it("should parse remote paths for restic", async()=> {
    const rp = "rest:http://kingno3:noble%20axiom@example.com:33333/example/scroll"
    let be = new Backend(__dirname, bename, rp)
    expectRemote({be, path: rp})
    const sp1 = "sftp:foo:/srv/restic-repo"
    const sp2 = "sftp:user@host:/srv/restic-repo"
    const sp3 = "sftp://user@example.com:2222//srv/restic-repo"
    be = new Backend(__dirname, "test", sp1)
    expectRemote({be, path: sp1})
    be = new Backend(__dirname, "test", sp2)
    expectRemote({be, path: sp2})
    be = new Backend(__dirname, "test", sp3)
    expectRemote({be, path: sp3})
    const ap1 = "s3:s3.amazonaws.com/bucket_name"
    const ap2 = "s3:http://localhost:9000/restic"
    be = new Backend(__dirname, "test", ap1)
    expectRemote({be, path: ap1})
    be = new Backend(__dirname, "test", ap2)
    expectRemote({be, path: ap2})
  })
  it("should parse remote paths for rsync", async()=> {
    // rsync://[USER@]HOST[:PORT]/SRC
    const rpr = "rsync://qibly@example.com:3333/tmp/foo"
    const rp = `sync::${rpr}`
    let be = new Backend(__dirname, bename, rp)
    expectRemote({be, mode: "sync", path: rpr})
    const spr = "ssh://qibly@example.com:3333/tmp/foo"
    const sp = `sync::${spr}`
    be = new Backend(__dirname, bename, sp)
    expectRemote({be, mode: "sync", path: spr})
  })
  it("should parse modes from all urls", async()=> {
    const abs = "/tmp/repo"
    const rel = "./foo/repo"
    const rab = join(__dirname, rel)
    let be = new Backend(__dirname, bename, `snap::${abs}`)
    expectLocal({be, path: abs})
    be = new Backend(__dirname, bename, `sync::${abs}`)
    expectLocal({be, mode: "sync", path: abs})
    be = new Backend(__dirname, bename, `snap::${rel}`)
    expectLocal({be, path: rab})
    be = new Backend(__dirname, bename, `sync::${rel}`)
    expectLocal({be, mode: "sync", path: rab})

    const rp = "rest:http://kingno3:noble%20axiom@example.com:33333/example/scroll"
    be = new Backend(__dirname, bename, `snap::${rp}`)
    expectRemote({be, path: rp})
    be = new Backend(__dirname, bename, `sync::${rp}`)
    expectRemote({be, mode: "sync", path: rp})
    const sp = "sftp://user@example.com:2222//srv/restic-repo"
    be = new Backend(__dirname, "test", `snap::${sp}`)
    expectRemote({be, path: sp})
    be = new Backend(__dirname, "test", `sync::${sp}`)
    expectRemote({be, mode: "sync", path: sp})
    const ap = "s3:http://localhost:9000/restic"
    be = new Backend(__dirname, "test", `snap::${ap}`)
    expectRemote({be, path: ap})
    be = new Backend(__dirname, "test", `sync::${ap}`)
    expectRemote({be, mode: "sync", path: ap})
  })
})
