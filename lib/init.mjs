import { platform } from "node:os"
import { dirname, join } from "node:path"
import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const plat = platform()

const copy =async(a, b)=> {
  if (existsSync(b)) {
    await copyFile(a, `${b}.new`)
  } else {
    await copyFile(a, b)
  }
}

if (plat == "win32") {
  const root = process.env.ALLUSERSPROFILE
  const base = join(root, "scroll")
  const skel = join(__dirname, "..", "skel")
  const conf = "scroll.yaml"
  const keyf = "key"
  await mkdir(base, {recursive: true})
  await copy(join(skel, conf), join(base, conf))
  await copy(join(skel, keyf), join(base, keyf))
}
