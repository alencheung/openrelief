const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const iconsDir = path.join(__dirname, '..', 'public', 'icons')

async function generateIcon(size) {
  const fontSize = Math.round(size * 0.3)
  const rx = Math.round(size * 0.15)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${rx}" fill="#dc2626"/>
    <text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" 
      font-family="Arial,Helvetica,sans-serif" font-weight="bold" fill="white" 
      font-size="${fontSize}">OR</text>
  </svg>`

  const outPath = path.join(iconsDir, `icon-${size}x${size}.png`)
  await sharp(Buffer.from(svg)).png().toFile(outPath)
  console.log(`Generated ${outPath}`)
}

async function generateShortcut(name, symbol, bg) {
  const size = 96
  const fontSize = Math.round(size * 0.4)
  const rx = Math.round(size * 0.15)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${rx}" fill="${bg}"/>
    <text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" 
      font-family="Arial,Helvetica,sans-serif" font-weight="bold" fill="white" 
      font-size="${fontSize}">${symbol}</text>
  </svg>`

  const outPath = path.join(iconsDir, `shortcut-${name}.png`)
  await sharp(Buffer.from(svg)).png().toFile(outPath)
  console.log(`Generated ${outPath}`)
}

async function generateScreenshot(name, width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#eff6ff"/>
    <text x="50%" y="45%" dominant-baseline="central" text-anchor="middle" 
      font-family="Arial,Helvetica,sans-serif" font-weight="bold" fill="#dc2626" 
      font-size="${Math.round(height * 0.08)}">OpenRelief</text>
    <text x="50%" y="55%" dominant-baseline="central" text-anchor="middle" 
      font-family="Arial,Helvetica,sans-serif" fill="#6b7280" 
      font-size="${Math.round(height * 0.03)}">Emergency Coordination Platform</text>
  </svg>`

  const outPath = path.join(__dirname, '..', 'public', 'screenshots', `${name}.png`)
  await sharp(Buffer.from(svg)).png().toFile(outPath)
  console.log(`Generated ${outPath}`)
}

async function main() {
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  for (const size of sizes) {
    await generateIcon(size)
  }

  await generateShortcut('report', '!', '#dc2626')
  await generateShortcut('map', 'M', '#2563eb')
  await generateShortcut('contacts', 'C', '#059669')

  await generateScreenshot('desktop-1', 1280, 720)
  await generateScreenshot('mobile-1', 390, 844)

  console.log('All icons generated!')
}

main().catch(console.error)
