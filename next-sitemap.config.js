/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://openrelief.org',
  generateRobotsTxt: true,
  exclude: ['/api/*', '/offline/*', '/pwa-status'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/api/', '/offline/', '/pwa-status'] }
    ]
  }
}
