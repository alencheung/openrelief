module.exports = (req, res) => {
  const size = parseInt(req.query.size) || 192
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#dc2626"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
      font-family="Arial,sans-serif" font-weight="bold" fill="white" 
      font-size="${Math.round(size * 0.35)}">OR</text>
  </svg>`
  res.setHeader('Content-Type', 'image/svg+xml')
  res.send(svg)
}
