#!/usr/bin/env node
/**
 * restore-packages.cjs
 *
 * Restores packages that are missing/incomplete under node_modules on
 * network-mapped drives (e.g. Z:\ -> \\host\share) where `npm install`
 * frequently fails with ENOTEMPTY rename errors, leaving packages without
 * a package.json even though their directory exists.
 *
 * Run before `next build` / `next lint` / `jest` to ensure required
 * packages are present. Safe to run repeatedly (skips packages that resolve).
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const TEMP = 'C:/Users/alen_/AppData/Local/temp/openrelief-restore'

// Packages known to be required at build/test/lint time, with a known-good
// version. Only reinstalled if require.resolve() currently fails.
const REQUIRED = [
  ['tailwindcss', '3.3.6'],
  ['autoprefixer', '10.4.16'],
  ['eslint', '8.54.0'],
  ['typescript', '5.7.3'],
  ['@typescript-eslint/eslint-plugin', '6.21.0'],
  ['@typescript-eslint/parser', '6.21.0'],
  ['eslint-plugin-react', '7.33.2'],
  ['eslint-plugin-react-hooks', '4.6.0'],
  ['eslint-plugin-jsx-a11y', '6.10.0'],
  ['eslint-plugin-import', '2.29.0'],
  ['eslint-import-resolver-typescript', '3.6.1'],
  ['jsdom', '22.1.0'],
  ['aria-query', '5.3.0'],
  ['@testing-library/user-event', '14.5.1'],
  // sucrase is required by tailwindcss to load JS configs; its absence
  // (drive corruption) breaks the CSS pipeline at build time.
  ['sucrase', '3.35.0']
]

function resolves(name) {
  try {
    require.resolve(name)
    return true
  } catch (e) {
    return false
  }
}

function installOne(name, version) {
  const spec = `${name}@${version}`
  fs.rmSync(TEMP, { recursive: true, force: true })
  fs.mkdirSync(TEMP, { recursive: true })
  try {
    execSync(`npm pack ${spec} --pack-destination "${TEMP}"`, {
      stdio: 'pipe',
      timeout: 120000
    })
  } catch (e) {
    console.warn(`[restore] pack failed for ${spec}: ${e.message}`)
    return false
  }
  const tgz = fs.readdirSync(TEMP).find(f => f.endsWith('.tgz'))
  if (!tgz) return false
  const extractDir = path.join(TEMP, 'x')
  fs.mkdirSync(extractDir, { recursive: true })
  try {
    execSync(`tar -xzf "${path.join(TEMP, tgz)}" -C "${extractDir}"`, { stdio: 'pipe' })
  } catch (e) {
    return false
  }
  let pkgDir = path.join(extractDir, 'package')
  if (!fs.existsSync(pkgDir)) {
    const sub = fs.readdirSync(extractDir, { withFileTypes: true }).filter(d => d.isDirectory())
    if (sub.length === 1) pkgDir = path.join(extractDir, sub[0].name)
  }
  if (!fs.existsSync(path.join(pkgDir, 'package.json'))) return false
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
  const dest = path.join('node_modules', pkgJson.name)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(pkgDir)) {
    fs.cpSync(path.join(pkgDir, entry), path.join(dest, entry), { recursive: true })
  }
  return true
}

let restored = 0
for (const [name, version] of REQUIRED) {
  if (resolves(name)) continue
  console.log(`[restore] reinstalling ${name}@${version}...`)
  if (installOne(name, version)) {
    restored++
    console.log(`[restore]   OK ${name}`)
  } else {
    console.warn(`[restore]   FAILED ${name}`)
  }
}

if (restored > 0) {
  console.log(`[restore] restored ${restored} package(s).`)
} else {
  console.log('[restore] all required packages present.')
}
