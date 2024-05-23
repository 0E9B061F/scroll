#!/usr/bin/env node

import { dirname, join } from "node:path"
import { readFile, writeFile } from "node:fs/promises"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const readmePath = join(__dirname, "../README.md")
const packagePath = join(__dirname, "../package.json")
const seriesPath = join(__dirname, "../series.json")

const pkg = JSON.parse(await readFile(packagePath))
const series = JSON.parse(await readFile(seriesPath))

const ver = process.argv[2]
if (!ver || !ver.match(/^v\d+\.\d+\.\d+$/)) {
  console.log(`ERROR: '${ver}' is not a valid version`)
  process.exit(1)
}

const vinfo = execSync(`git --git-dir=${__dirname}/../.git tag -l "v*"`, {
  encoding: 'utf-8'
})
let vers = [...vinfo.split("\n").filter(v=> !!v), ver]
vers = [...new Set(vers.map(v=> v.split('.').slice(0,-1).join('.')))]
console.log(vers)
const name = series[vers.length-1]

const code = `${ver} '${name}'`
const line = `# 📜 **scroll** backup system ${code}`

let readme = await readFile(readmePath, {encoding: 'UTF-8'})
readme = readme.split('\n').slice(1)
readme = [line, ...readme]
await writeFile(readmePath, readme.join('\n'))
console.log(`updated README.md`)

pkg.version = ver.slice(1)
pkg.series = name

await writeFile(packagePath, JSON.stringify(pkg, null, 2))
console.log(`updated package.json`)

console.log(`updated to ${code}`)
console.log(`remember to \`git tag ${ver}\` after committing`)
