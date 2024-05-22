/* scroll backup system
   by 0E9B061F <0E9B061F@protonmail.com> 2020-2024
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

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

export default async()=> {
  if (plat == "win32") {
    const root = process.env.ALLUSERSPROFILE
    const base = join(root, "scroll")
    const skel = join(__dirname, "..", "skel")
    const conf = "scroll.yaml"
    const keyf = "key"
    const confabs = join(base, conf)
    if (!existsSync(confabs)) {
      console.log("Initializing ...")
      await mkdir(base, {recursive: true})
      await copy(join(skel, conf), confabs)
      await copy(join(skel, keyf), join(base, keyf))
    }
  }
}
