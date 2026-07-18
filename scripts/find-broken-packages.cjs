#!/usr/bin/env node
/* Scan node_modules for packages that declare a "main"/"module" entry but
 * whose entry file is missing (network-drive corruption pattern: dir +
 * package.json present, source files absent). Prints name@version + path.
 */
const fs = require('fs')
const path = require('path')

const broken = []
const NM = path.join(process.cwd(), 'node_modules')

function isPackageRoot(dir) {
  const parent = path.dirname(dir)
  const parentName = path.basename(parent)
  if (parentName === 'node_modules') return true
  if (parentName.startsWith('@') && path.basename(path.dirname(parent)) === 'node_modules') return true
  return false
}

function walk(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const child = path.join(dir, e.name)
    if (e.name === 'node_modules') continue
    const pkj = path.join(child, 'package.json')
    if (fs.existsSync(pkj) && isPackageRoot(child)) {
      let meta
      try {
        meta = JSON.parse(fs.readFileSync(pkj, 'utf-8'))
      } catch {
        continue
      }
      const main = meta.main || meta.module
      const candidates = []
      if (meta.main) candidates.push(path.join(child, meta.main))
      if (meta.module) candidates.push(path.join(child, meta.module))
      for (const c of ['index.js', 'index.cjs', 'index.mjs', 'build/index.js', 'dist/index.js', 'lib/index.js', 'src/index.js']) {
        candidates.push(path.join(child, c))
      }
      const exists = candidates.some(c => {
        try { return fs.statSync(c).isFile() } catch { return false }
      })
      // Only flag if package declares an entry AND none of the plausible entries exist
      if (!exists && (meta.main || meta.module || meta.exports)) {
        broken.push(`${meta.name || path.basename(child)}@${meta.version || '?'}  main=${meta.main || meta.module || '(exports)'}  at ${path.relative(NM, child)}`)
      }
      // recurse into package (for scoped subpaths)
      walk(child)
    }
  }
}

walk(NM)
console.log(`Broken packages (declared entry missing): ${broken.length}`)
for (const b of broken) console.log('  ' + b)
