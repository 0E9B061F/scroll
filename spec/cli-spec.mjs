import { prep } from "./prep.mjs"
import { mkconf } from "../lib/conf.mjs"
import path from "node:path"
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "data")
const restore = path.join(root, "restore")

describe("cli", ()=> {
  it("backup and restore with exclusions", async ()=> {
    const conf = mkconf("rcfile:./spec/scroll.yaml", "keyfile:./spec/password", "logdir:./spec")
    const t = await prep()

    await conf.cmds.run("backup")
    await conf.cmds.run("restore", "test1", "local", restore)

    const m = await t.match(path.join(restore, "home/nn/code/scroll2/spec/data/target"), {
      dir1: {
        exc: false,
      },
      dir3: false,
    })

    expect(m).toEqual([])
  })
})

