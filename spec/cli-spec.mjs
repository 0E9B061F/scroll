import { prep } from "./prep.mjs"
import { mkconf } from "../lib/conf.mjs"
import { dirname, join } from "node:path"
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "data")
const restorea = join(root, "restore-a")
const restoreb = join(root, "restore-b")

describe("cli", ()=> {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
  it("backup and restore with exclusions", async ()=> {
    const conf = mkconf("rcfile:./spec/scroll.yaml", "keyfile:./spec/password", "logdir:./spec")
    const t = await prep()

    await conf.cmds.run("backup", "test1", "repo-a,repo-b")
    await conf.cmds.run("restore", "test1", "repo-a", restorea)
    await conf.cmds.run("restore", "test1", "repo-b", restoreb)

    const ra = join(restorea, "home/nn/code/scroll2/spec/data/target")
    const rb = join(restoreb, "home/nn/code/scroll2/spec/data/target")
    const md = {
      dir1: {
        exc: false,
      },
      dir5: false,
      dir8: false,
    }

    const m1 = await t.match(ra, md)
    const m2 = await t.match(rb, md)

    expect(m1).toEqual([])
    expect(m2).toEqual([])
  })
})

