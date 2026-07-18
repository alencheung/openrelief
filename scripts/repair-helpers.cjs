/**
 * Shared helpers for the node_modules repair scripts. Kept dependency-free so
 * the repair tooling can run even when node_modules itself is broken.
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

/**
 * Extract a .tgz buffer into destDir, stripping the top-level prefix whether
 * it's the standard "package/" or a custom "<name>-<version>/" (some npm
 * tarballs like ejs use the latter).
 */
function extractTarGz(buffer, destDir) {
  const gunzipped = zlib.gunzipSync(buffer)
  const entries = []
  let offset = 0
  let firstPrefix = null
  while (offset < gunzipped.length) {
    const header = gunzipped.subarray(offset, offset + 512)
    if (header.every(b => b === 0)) { offset += 512; continue }
    const name = header.subarray(0, 100).toString('utf-8').replace(/\0/g, '')
    if (!name) { offset += 512; continue }
    const sizeOctal = header.subarray(124, 136).toString('utf-8').replace(/\0/g, '').trim()
    const size = sizeOctal ? parseInt(sizeOctal, 8) : 0
    const typeflag = String.fromCharCode(header[156])
    const slashIdx = name.indexOf('/')
    if (slashIdx > 0 && firstPrefix === null) firstPrefix = name.slice(0, slashIdx + 1)
    entries.push({ name, size, typeflag, dataOffset: offset + 512 })
    const blocks = Math.ceil(size / 512)
    offset += 512 + blocks * 512
  }
  // Choose the prefix to strip: "package/" wins if present; otherwise use the
  // detected leading segment only if EVERY entry shares it.
  let strip = ''
  if (entries.some(e => e.name.startsWith('package/'))) {
    strip = 'package/'
  } else if (firstPrefix && entries.every(e => e.name.startsWith(firstPrefix) || e.name === firstPrefix.slice(0, -1))) {
    strip = firstPrefix
  }
  for (const e of entries) {
    const relPath = e.name.startsWith(strip) ? e.name.slice(strip.length) : e.name
    if (!relPath) continue
    const abs = path.join(destDir, relPath)
    if (e.typeflag === '5' || e.name.endsWith('/')) {
      fs.mkdirSync(abs, { recursive: true })
    } else if (e.typeflag === '0' || e.typeflag === '' || e.typeflag === '\u0000') {
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, gunzipped.subarray(e.dataOffset, e.dataOffset + e.size))
    }
  }
}

module.exports = { extractTarGz }
