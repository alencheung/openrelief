#!/usr/bin/env node
/**
 * repair-node-modules.cjs
 *
 * Repairs node_modules packages on network-mapped drives where `npm install`
 * fails with ENOTEMPTY, leaving package directories with only package.json and
 * no source files. For each broken package it:
 *   1. Reads name + version from its package.json
 *   2. Downloads the exact tarball from the npm registry
 *   3. Extracts the full package contents over the existing directory
 *
 * This is a one-time repair tool; safe to re-run (it skips packages whose
 * entry already resolves).
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')

const NM = path.join(process.cwd(), 'node_modules')

function isPackageRoot(dir) {
  const parent = path.dirname(dir)
  const parentName = path.basename(parent)
  if (parentName === 'node_modules') return true
  if (parentName.startsWith('@') && path.basename(path.dirname(parent)) === 'node_modules') return true
  return false
}

function entryResolves(pkgDir, meta) {
  const candidates = []
  if (meta.main) candidates.push(path.join(pkgDir, meta.main))
  if (meta.module) candidates.push(path.join(pkgDir, meta.module))
  for (const c of ['index.js', 'index.cjs', 'index.mjs', 'build/index.js', 'dist/index.js', 'lib/index.js', 'src/index.js']) {
    candidates.push(path.join(pkgDir, c))
  }
  return candidates.some(c => {
    try { return fs.statSync(c).isFile() } catch { return false }
  })
}

// Find all broken packages: name@version + absDir
function findBroken() {
  const broken = []
  function walk(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (e.name === 'node_modules') continue
      const child = path.join(dir, e.name)
      const pkj = path.join(child, 'package.json')
      if (fs.existsSync(pkj) && isPackageRoot(child)) {
        let meta
        try { meta = JSON.parse(fs.readFileSync(pkj, 'utf-8')) } catch { continue }
        if (!entryResolves(child, meta) && (meta.name && meta.version)) {
          broken.push({ name: meta.name, version: meta.version, dir: child })
        }
        walk(child)
      }
    }
  }
  walk(NM)
  return broken
}

const zlib = require('zlib')
const https = require('https')

// Minimal Node-native tar extractor (ustar 512-byte blocks). Extracts the
// package/ directory from the registry tarball directly into destDir without
// shelling out to `tar` (which mis-handles Windows C:\ paths under git-bash).
function extractTarGz(buffer, destDir) {
  const gunzipped = zlib.gunzipSync(buffer)
  let offset = 0
  while (offset < gunzipped.length) {
    const header = gunzipped.subarray(offset, offset + 512)
    if (header.every(b => b === 0)) { offset += 512; continue } // empty block
    const name = header.subarray(0, 100).toString('utf-8').replace(/\0/g, '')
    if (!name) { offset += 512; continue }
    const sizeOctal = header.subarray(124, 136).toString('utf-8').replace(/\0/g, '').trim()
    const size = sizeOctal ? parseInt(sizeOctal, 8) : 0
    const typeflag = String.fromCharCode(header[156])
    offset += 512
    // Only the leading "package/" prefix is expected from npm tarballs. Strip it
    // so files land directly in destDir.
    const relPath = name.replace(/^package\//, '')
    if (relPath) {
      const abs = path.join(destDir, relPath)
      if (typeflag === '5' || name.endsWith('/')) {
        fs.mkdirSync(abs, { recursive: true })
      } else if (typeflag === '0' || typeflag === '' || typeflag === '\u0000') {
        fs.mkdirSync(path.dirname(abs), { recursive: true })
        fs.writeFileSync(abs, gunzipped.subarray(offset, offset + size))
      }
      // symlinks/links skipped (rare in npm packages)
    }
    // advance past file data + padding to next 512 boundary
    const blocks = Math.ceil(size / 512)
    offset += blocks * 512
  }
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(res.headers.location))
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(new Error('timeout')) })
  })
}

async function fetchAndExtract(name, version, destDir) {
  const tarballName = name.replace(/^@/, '').replace(/\//, '-')
  const url = `https://registry.npmjs.org/${name}/-/${tarballName}-${version}.tgz`
  const buf = await fetchBuffer(url)
  if (!buf || buf.length < 200) throw new Error(`tarball too small (${buf && buf.length} bytes)`)
  extractTarGz(buf, destDir)
  return true
}

const broken = findBroken()
console.log(`[repair] found ${broken.length} broken package(s)`)
;(async () => {
  let fixed = 0
  let failed = 0
  for (const b of broken) {
    process.stdout.write(`[repair] ${b.name}@${b.version} ... `)
    try {
      await fetchAndExtract(b.name, b.version, b.dir)
      // verify
      const meta = JSON.parse(fs.readFileSync(path.join(b.dir, 'package.json'), 'utf-8'))
      if (entryResolves(b.dir, meta)) {
        console.log('OK')
        fixed++
      } else {
        console.log('STILL BROKEN (entry still missing)')
        failed++
      }
    } catch (e) {
      console.log(`FAILED (${e.message})`)
      failed++
    }
  }
  console.log(`[repair] done. fixed=${fixed} failed=${failed}`)
})()
