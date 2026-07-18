#!/usr/bin/env node
/**
 * repair-all-from-lockfile.cjs
 *
 * Walks package-lock.json's `packages` map. For every package that is installed
 * under node_modules/ (top-level only), checks whether its declared entry
 * (main/module/exports top-level) can be resolved via Node. If not, fetches the
 * exact version from the npm registry and re-extracts the package files.
 *
 * This catches transitive deps (globby, fast-glob, etc.) that the file-based
 * scanner may miss because they declare no `main` or use an index.js that
 * happens to be absent.
 */
const fs = require('fs')
const path = require('path')
const https = require('https')
const { extractTarGz } = require('./repair-helpers.cjs')

const root = process.cwd()
const NM = path.join(root, 'node_modules')
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf-8'))

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'))
    const req = https.get(url, { timeout: 60000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(res.headers.location, redirects + 1))
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
  })
}

// Fetch JSON (used for the registry packument).
async function fetchJson(url) {
  const buf = await fetchBuffer(url)
  return JSON.parse(buf.toString('utf-8'))
}

// Build the canonical tarball URL for name@version. For scoped packages the
// tarball filename is "<unscoped-name>-<version>.tgz" (no scope prefix); for
// unscoped packages it's "<name>-<version>.tgz". Fall back to the packument
// only if the direct URL 404s.
function directTarballUrl(name, version) {
  const unscoped = name.replace(/^@[^/]+\//, '')
  return `https://registry.npmjs.org/${name}/-/${unscoped}-${version}.tgz`
}

async function resolveTarballUrl(name, version) {
  // Try the direct URL first; fetchBuffer throws on non-200, in which case
  // fall back to the packument (rare — only for non-standard slugs).
  const direct = directTarballUrl(name, version)
  try {
    const buf = await fetchBuffer(direct)
    if (buf && buf.length >= 300) return { url: direct, buf }
  } catch {
    // fall through to packument
  }
  const full = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(name).replace('%40', '@')}`)
  const ver = full.versions && full.versions[version]
  if (ver && ver.dist && ver.dist.tarball) {
    return { url: ver.dist.tarball, buf: await fetchBuffer(ver.dist.tarball) }
  }
  throw new Error(`could not resolve tarball URL for ${name}@${version}`)
}

// File-based entry check (fast). Resolves the declared entry accounting for
// Node's extension/directory resolution: a "main" of "lib" resolves to
// lib/index.js; "main" of "foo.js" resolves directly; etc.
function entryResolvesViaNode(pkgPath) {
  let meta
  try {
    meta = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf-8'))
  } catch {
    return false
  }
  const exists = p => { try { return fs.statSync(p).isFile() } catch { return false } }
  const resolveLike = (spec) => {
    if (!spec) return false
    const abs = path.join(pkgPath, spec)
    if (exists(abs)) return true
    for (const ext of ['.js', '.cjs', '.mjs', '.json', '.node']) {
      if (exists(abs + ext)) return true
    }
    // directory → index.*
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      for (const ext of ['.js', '.cjs', '.mjs']) {
        if (exists(path.join(abs, 'index' + ext))) return true
      }
    }
    return false
  }
  // main
  if (resolveLike(meta.main)) return true
  if (resolveLike(meta.module)) return true
  // exports["."]
  if (meta.exports) {
    const dot = meta.exports['.']
    if (dot) {
      if (typeof dot === 'string') { if (resolveLike(dot)) return true }
      else {
        for (const k of ['browser', 'node', 'require', 'import', 'default']) {
          if (dot[k] && resolveLike(dot[k])) return true
        }
      }
    } else if (!meta.main && !meta.module) {
      // subpath-only exports (e.g. math-intrinsics): no root entry by design.
      return true
    }
  }
  // index.* at root
  for (const ext of ['.js', '.cjs', '.mjs']) {
    if (exists(path.join(pkgPath, 'index' + ext))) return true
  }
  // Type-only packages (.d.ts only, no JS entry by design) — treat as OK.
  const files = meta.files || []
  if (!meta.main && !meta.module && !meta.exports &&
      files.length && files.every(f => f.endsWith('.d.ts'))) return true
  return false
}

// Gather candidate broken packages from the lockfile (ALL — top-level AND
// nested, since a missing nested dep breaks the parent's require chain).
// INCLUDE packages whose directory exists but package.json is missing/empty —
// those are the clearest corruption cases (e.g. only a LICENSE file present).
const candidates = []
for (const [pkgPath, meta] of Object.entries(lock.packages || {})) {
  if (!pkgPath.startsWith('node_modules/')) continue
  if (!meta.version) continue
  // pkgPath like "node_modules/foo" or "node_modules/a/node_modules/b"
  const abs = path.join(root, pkgPath)
  if (!fs.existsSync(abs)) continue // never-installed (e.g. optional os/python deps)
  // Extract the package name (last "node_modules/<name>" segment, preserving @scope).
  const segs = pkgPath.split('node_modules/')
  const nameSeg = segs[segs.length - 1] // e.g. "@scope/pkg" or "pkg"
  candidates.push({ name: nameSeg, version: meta.version, abs })
}

async function repairOne(b) {
  const { buf } = await resolveTarballUrl(b.name, b.version)
  if (!buf || buf.length < 300) throw new Error(`tarball too small (${buf && buf.length})`)
  extractTarGz(buf, b.abs)
  return entryResolvesViaNode(b.abs)
}

console.log(`[repair-all] scanning ${candidates.length} packages`)
;(async () => {
  const MAX_PASSES = 6
  const CONCURRENCY = 24
  let totalFixed = 0
  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const broken = candidates.filter(c => {
      const pkjPath = path.join(c.abs, 'package.json')
      if (!fs.existsSync(pkjPath)) return true
      try { JSON.parse(fs.readFileSync(pkjPath, 'utf-8')) } catch { return true }
      return !entryResolvesViaNode(c.abs)
    })
    if (broken.length === 0) {
      console.log(`[repair-all] pass ${pass}: no broken packages remaining`)
      break
    }
    console.log(`[repair-all] pass ${pass}: ${broken.length} package(s) need repair`)
    let fixed = 0
    let failed = 0
    const stillBroken = []
    // Process with bounded concurrency; filesystem writes are sync per task.
    let idx = 0
    async function worker() {
      while (idx < broken.length) {
        const myIdx = idx++
        const b = broken[myIdx]
        try {
          const ok = await repairOne(b)
          if (ok) { fixed++ } else { failed++; stillBroken.push(`${b.name}@${b.version}`) }
        } catch (e) {
          failed++; stillBroken.push(`${b.name}@${b.version}: ${e.message}`)
        }
      }
    }
    const workers = Array.from({ length: CONCURRENCY }, () => worker())
    await Promise.all(workers)
    totalFixed += fixed
    console.log(`[repair-all] pass ${pass} done. fixed=${fixed} failed=${failed}`)
    if (fixed === 0) {
      console.log('[repair-all] still broken:')
      for (const s of stillBroken) console.log('  ' + s)
      break
    }
  }
  console.log(`[repair-all] all passes done. total fixed=${totalFixed}`)
})()
