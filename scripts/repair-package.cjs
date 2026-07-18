#!/usr/bin/env node
/**
 * repair-package.cjs <name> <version>
 * Directly re-extracts a specific name@version from the npm registry over the
 * existing node_modules/<name> directory. Used when a package's package.json
 * itself is corrupted (so the bulk scanner can't read name/version).
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const https = require('https')

const [name, version] = process.argv.slice(2)
if (!name || !version) {
  console.error('usage: repair-package.cjs <name> <version>')
  process.exit(1)
}

const { extractTarGz } = require('./repair-helpers.cjs')

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

;(async () => {
  const tarballName = name.replace(/^@/, '').replace(/\//, '-')
  // Scoped packages use the @scope/name slug pattern on the registry.
  const url = `https://registry.npmjs.org/${name}/-/${tarballName}-${version}.tgz`
  const destDir = path.join(process.cwd(), 'node_modules', name)
  console.log(`[repair-package] ${name}@${version} -> ${destDir}`)
  const buf = await fetchBuffer(url)
  if (!buf || buf.length < 300) throw new Error(`tarball too small (${buf && buf.length} bytes)`)
  extractTarGz(buf, destDir)
  console.log(`[repair-package] done`)
})().catch(e => { console.error(e); process.exit(1) })
