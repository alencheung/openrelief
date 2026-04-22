if (!self.define) {
  let e,
    a = {}
  const s = (s, n) => (
    (s = new URL(s + '.js', n).href),
    a[s] ||
      new Promise(a => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;((e.src = s), (e.onload = a), document.head.appendChild(e))
        } else ((e = s), importScripts(s), a())
      }).then(() => {
        let e = a[s]
        if (!e) throw new Error(`Module ${s} didn’t register its module`)
        return e
      })
  )
  self.define = (n, i) => {
    const c = e || ('document' in self ? document.currentScript.src : '') || location.href
    if (a[c]) return
    let r = {}
    const t = e => s(e, c),
      f = { module: { uri: c }, exports: r, require: t }
    a[c] = Promise.all(n.map(e => f[e] || t(e))).then(e => (i(...e), r))
  }
}
define(['./workbox-9324cd5d'], function (e) {
  'use strict'
  ;(importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: 'eaf071887b869fab4b63fbd65dffa6de' },
        { url: '/_next/build-manifest.json', revision: '074a3e7e353ea111aa0ec445a48ebd9d' },
        {
          url: '/_next/react-loadable-manifest.json',
          revision: '4c9f9e5c62c765599509c9edb746ca29'
        },
        {
          url: '/_next/server/app/_not-found/page_client-reference-manifest.js',
          revision: 'acac5e0f19df9208416b940e40b1208f'
        },
        {
          url: '/_next/server/app/api/audit/logs/route_client-reference-manifest.js',
          revision: 'f43ab23d4a663400514eaf90dcc9f8db'
        },
        {
          url: '/_next/server/app/api/consensus/route_client-reference-manifest.js',
          revision: 'b4694c81408b3317e21a770864dc5b62'
        },
        {
          url: '/_next/server/app/api/emergency/route_client-reference-manifest.js',
          revision: '77ac94e8d1d488c5fcc14cae5bc3e660'
        },
        {
          url: '/_next/server/app/api/health/route_client-reference-manifest.js',
          revision: 'f74d72419706367da8be946aa8d18732'
        },
        {
          url: '/_next/server/app/api/notifications/preferences/route_client-reference-manifest.js',
          revision: 'f45b618663906cc1ac5b3e42bda7356c'
        },
        {
          url: '/_next/server/app/api/notifications/register/route_client-reference-manifest.js',
          revision: 'dd733c930dd89893a1d7d88958f09ec6'
        },
        {
          url: '/_next/server/app/api/notifications/route_client-reference-manifest.js',
          revision: '38b567d41e29e616e5eb9a5eb1e810bf'
        },
        {
          url: '/_next/server/app/api/performance/route_client-reference-manifest.js',
          revision: '32a7226c09129c9fbdd08de2a004f00f'
        },
        {
          url: '/_next/server/app/api/privacy/export/route_client-reference-manifest.js',
          revision: '2bc2585a1b3551bc23b1d7fc1aeadf33'
        },
        {
          url: '/_next/server/app/api/privacy/legal-requests/route_client-reference-manifest.js',
          revision: 'fe7cda8314c5b7d6b7e7dd05e355c51f'
        },
        {
          url: '/_next/server/app/api/privacy/settings/route_client-reference-manifest.js',
          revision: 'ae7bee3897a07297689e3ab739d86776'
        },
        {
          url: '/_next/server/app/api/privacy/transparency/route_client-reference-manifest.js',
          revision: '4b3e4f349fcc8f9306fb1977b23ab905'
        },
        {
          url: '/_next/server/app/api/push/subscribe/route_client-reference-manifest.js',
          revision: '8d882474802afc85630338da2a742fc1'
        },
        {
          url: '/_next/server/app/api/push/unsubscribe/route_client-reference-manifest.js',
          revision: '630d4058f80b02d417ea009f1d60da2a'
        },
        {
          url: '/_next/server/app/api/trust/%5BuserId%5D/route_client-reference-manifest.js',
          revision: '24bbf54d45ccbbc421481c7365d6e4f5'
        },
        {
          url: '/_next/server/app/api/trust/route_client-reference-manifest.js',
          revision: '3a64fd15acb06723ecf8b6075d6eab31'
        },
        {
          url: '/_next/server/app/auth/callback/route_client-reference-manifest.js',
          revision: '8d51963eea253b3de2153bb82b46ec73'
        },
        {
          url: '/_next/server/app/login/page_client-reference-manifest.js',
          revision: 'af61f227999e099ee25f9dfcbf675318'
        },
        {
          url: '/_next/server/app/offline/emergency/page_client-reference-manifest.js',
          revision: '323161069aa4f4429e005a23bbafa860'
        },
        {
          url: '/_next/server/app/offline/page_client-reference-manifest.js',
          revision: '00e169aadf363d6781f0db87298353fe'
        },
        {
          url: '/_next/server/app/page_client-reference-manifest.js',
          revision: 'ed48fb4b13fbfe641fea3d386b2c1c0e'
        },
        {
          url: '/_next/server/app/privacy/legal-requests/page_client-reference-manifest.js',
          revision: '442267bed33a73e952d0ee69e681c8bf'
        },
        {
          url: '/_next/server/app/privacy/page_client-reference-manifest.js',
          revision: '3f088a65c41ab5aa37171fb8a0546d49'
        },
        {
          url: '/_next/server/app/privacy/settings/page_client-reference-manifest.js',
          revision: '76fe4c28b939c9edd31ac0f2bf978fa8'
        },
        {
          url: '/_next/server/app/profile/page_client-reference-manifest.js',
          revision: 'b90ded66feecb0252dd63c368272af34'
        },
        {
          url: '/_next/server/app/pwa-status/page_client-reference-manifest.js',
          revision: '476b20c1436b60bf3166cfef6966b082'
        },
        {
          url: '/_next/server/app/report/page_client-reference-manifest.js',
          revision: 'a6857b5dd9f003cb33cbb05ee557ebf5'
        },
        {
          url: '/_next/server/app/settings/page_client-reference-manifest.js',
          revision: 'c6a81dc9b62e9cd01bb5d156c897d1d4'
        },
        {
          url: '/_next/server/app/signup/page_client-reference-manifest.js',
          revision: '079e37a0e5040142afa5a476f2900ea2'
        },
        {
          url: '/_next/server/app/terms/page_client-reference-manifest.js',
          revision: 'c276c60e48f306159c173527a30ca689'
        },
        {
          url: '/_next/server/middleware-build-manifest.js',
          revision: 'f890104bdbc5bacd49da5c698176097a'
        },
        {
          url: '/_next/server/middleware-react-loadable-manifest.js',
          revision: '55a94fa6e958fbf0599ec2a794719308'
        },
        {
          url: '/_next/server/next-font-manifest.js',
          revision: '255c888615691974e7c789058f8a626b'
        },
        {
          url: '/_next/server/next-font-manifest.json',
          revision: '958bcba3504a9c71888ecdd96c8f9b87'
        },
        {
          url: '/_next/static/79flQKx48nyuIWzgCa8Je/_buildManifest.js',
          revision: '11b3295b06ab602f16bbd19813bb78eb'
        },
        {
          url: '/_next/static/79flQKx48nyuIWzgCa8Je/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933'
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-4cee6297c4746802.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/audit/logs/route-9701a6dd59213da6.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/consensus/route-f985076bd4a55384.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/emergency/route-29a95aacd4e90824.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/health/route-30ed84b24398157d.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/preferences/route-34f3d3e2e44d01c0.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/register/route-624c8e276cdc6c8c.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/route-2139e90cff96a2ff.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/performance/route-345074b37a2d0959.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/export/route-332f6fde62c289e8.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/legal-requests/route-0420c3d27da6a59d.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/settings/route-8dd279aa05e648d7.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/transparency/route-46b39bf084da3e34.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/push/subscribe/route-7bb15f95fe78f7fc.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/push/unsubscribe/route-45f0c5813989527c.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/trust/%5BuserId%5D/route-bb71fb69f30c2a1e.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/api/trust/route-ff663ec8d4416e0d.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/auth/callback/route-d026f56b5959587d.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/error-0c4651af482b0ab9.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/error-0c4651af482b0ab9.js.map',
          revision: '5095c215781ed755f197ac69aac640ed'
        },
        {
          url: '/_next/static/chunks/app/global-error-9ddcea891f2946d2.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/global-error-9ddcea891f2946d2.js.map',
          revision: '755372130b7add79d99ea6e2745711ba'
        },
        {
          url: '/_next/static/chunks/app/layout-b4d236975cb566c1.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/layout-b4d236975cb566c1.js.map',
          revision: '4419ad30092f3b3e62223d85fdc3b5a0'
        },
        {
          url: '/_next/static/chunks/app/loading-4c59f8ef00fcbc9c.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/login/page-4815cb3caafe7aef.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/login/page-4815cb3caafe7aef.js.map',
          revision: '3477994339f2ebe5b746bf70152f412e'
        },
        {
          url: '/_next/static/chunks/app/not-found-8af84a0c637cf98a.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/not-found-8af84a0c637cf98a.js.map',
          revision: '4e81a33710e41625603248a2890245dd'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-0692a1ed5f9e0e2b.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-0692a1ed5f9e0e2b.js.map',
          revision: '98e6464d52def8f2bf937afa96965e6f'
        },
        {
          url: '/_next/static/chunks/app/offline/page-19df4dc0cd524aa7.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/offline/page-19df4dc0cd524aa7.js.map',
          revision: '58d4e89ca528a76d9d401907998a8030'
        },
        {
          url: '/_next/static/chunks/app/page-d925bcf4701f0555.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/page-d925bcf4701f0555.js.map',
          revision: '71d5e323440b176f7b6a4babeb01a60a'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-2b0a4fbf518d45ce.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-2b0a4fbf518d45ce.js.map',
          revision: '0d751254cfaaa6b6d5b3102212c6b8ba'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-a76378bf224d048a.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-a76378bf224d048a.js.map',
          revision: '08139e2a497ff481c66a118c5e24c500'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-f26e694012f6c17d.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-f26e694012f6c17d.js.map',
          revision: '8b71a66e560e35f7e3aa4024969ff116'
        },
        {
          url: '/_next/static/chunks/app/profile/page-3d3d5b8c635f5fbb.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/profile/page-3d3d5b8c635f5fbb.js.map',
          revision: 'ddfc599092c254948bf3e6bca5e6b7dd'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-1cc7c36e5a6dd3e5.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-1cc7c36e5a6dd3e5.js.map',
          revision: 'de89c27d862cee9785682aef8d8dfb10'
        },
        {
          url: '/_next/static/chunks/app/report/page-a425de92ea885638.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/report/page-a425de92ea885638.js.map',
          revision: '02b68d9ac45d5c454777e6b8bd4d9a72'
        },
        {
          url: '/_next/static/chunks/app/settings/page-86ad99fda8809fe4.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/settings/page-86ad99fda8809fe4.js.map',
          revision: '7e001fe924d251df80e4d985571b57e1'
        },
        {
          url: '/_next/static/chunks/app/signup/page-e2ed4c37015d4218.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/app/signup/page-e2ed4c37015d4218.js.map',
          revision: '231fb31b13fc4d0962e949d27084098b'
        },
        {
          url: '/_next/static/chunks/app/terms/page-d15ebad741b27419.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/common-07e20b3f951f8501.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        { url: '/_next/static/chunks/main-942f6268cfa137de.js', revision: '79flQKx48nyuIWzgCa8Je' },
        {
          url: '/_next/static/chunks/main-app-7e3e7cfbf2a3144a.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/main-app-7e3e7cfbf2a3144a.js.map',
          revision: '2889af2c79d2df40e52b7e35baa0dd47'
        },
        {
          url: '/_next/static/chunks/pages/_app-47731f586aaab678.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/pages/_app-47731f586aaab678.js.map',
          revision: 'ea2f3063b99ba19b17a262420335e146'
        },
        {
          url: '/_next/static/chunks/pages/_error-cb21a6d7c777b970.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/pages/_error-cb21a6d7c777b970.js.map',
          revision: 'd7199c9730afdbc3666df301765c0247'
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f'
        },
        {
          url: '/_next/static/chunks/vendors-f57e553868bb278a.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/webpack-f427acca71000ff2.js',
          revision: '79flQKx48nyuIWzgCa8Je'
        },
        {
          url: '/_next/static/chunks/webpack-f427acca71000ff2.js.map',
          revision: '093d7e0e41077c959a66e5e36786d701'
        },
        { url: '/_next/static/css/7b8ba985a2fab7b1.css', revision: '7b8ba985a2fab7b1' },
        {
          url: '/_next/static/css/7b8ba985a2fab7b1.css.map',
          revision: '0ed256838036c706209ffd913220963e'
        },
        { url: '/_next/static/css/9e167c07fdcc5fdc.css', revision: '9e167c07fdcc5fdc' },
        {
          url: '/_next/static/css/9e167c07fdcc5fdc.css.map',
          revision: 'd09f65c46f8dd613197ede2cd4bab2fd'
        },
        { url: '/_next/static/css/b07eeb2715cac96a.css', revision: 'b07eeb2715cac96a' },
        {
          url: '/_next/static/css/b07eeb2715cac96a.css.map',
          revision: 'cde4a032e1615500204fc2dcba7b4f2e'
        },
        {
          url: '/_next/static/media/19cfc7226ec3afaa-s.woff2',
          revision: '9dda5cfc9a46f256d0e131bb535e46f8'
        },
        {
          url: '/_next/static/media/21350d82a1f187e9-s.woff2',
          revision: '4e2553027f1d60eff32898367dd4d541'
        },
        {
          url: '/_next/static/media/8e9860b6e62d6359-s.woff2',
          revision: '01ba6c2a184b8cba08b0d57167664d75'
        },
        {
          url: '/_next/static/media/ba9851c3c22cd980-s.woff2',
          revision: '9e494903d6b0ffec1a1e14d34427d44d'
        },
        {
          url: '/_next/static/media/c5fe6dc8356a8c31-s.woff2',
          revision: '027a89e9ab733a145db70f09b8a18b42'
        },
        {
          url: '/_next/static/media/df0a9ae256c0569c-s.woff2',
          revision: 'd54db44de5ccb18886ece2fda72bdfe0'
        },
        {
          url: '/_next/static/media/e4af272ccee01ff0-s.p.woff2',
          revision: '65850a373e258f1c897a2b3d75eb74de'
        },
        { url: '/browserconfig.xml', revision: '50f680a7447e43b2328cdfa579ae1b7c' },
        { url: '/icons/icon-128x128.png', revision: 'ed30583da4679a11eac1c325f4ccb6a5' },
        { url: '/icons/icon-144x144.png', revision: 'd39817ce38503842f4c8c5ca6f08e22d' },
        { url: '/icons/icon-152x152.png', revision: '27f8313cf7808ec9dc2c9f29a9a7face' },
        { url: '/icons/icon-192x192.png', revision: '949b5a2c97097f8529a5cae46314fe76' },
        { url: '/icons/icon-384x384.png', revision: 'dabe4d15f0e42d95cef30035346d79d4' },
        { url: '/icons/icon-512x512.png', revision: '5e2f6936c7c0f31ae65792da785e2c0a' },
        { url: '/icons/icon-72x72.png', revision: '152c95e0a71ded097097c87e769018c2' },
        { url: '/icons/icon-96x96.png', revision: '903bfac98f172177440816c5f46a4c05' },
        { url: '/icons/shortcut-contacts.png', revision: 'ad46650bcca2ffed9a4e3cf27a772943' },
        { url: '/icons/shortcut-map.png', revision: '21f568116b8e0b6af4b5652aa8229cdc' },
        { url: '/icons/shortcut-report.png', revision: '080340ddab0cf34575ce77bc163336d5' },
        { url: '/manifest.json', revision: '585a0ebfcad09a48fd4a84b6dcf9aeda' },
        { url: '/robots.txt', revision: '0ce2193e1fa8f3582213497b39ac54c2' },
        { url: '/screenshots/desktop-1.png', revision: '15eedc42b579ea28fa8fa2e29c98d138' },
        { url: '/screenshots/mobile-1.png', revision: 'b068524f1ed4b08787a36f3e86dafddb' },
        { url: '/sw-custom.js', revision: '294010f3a80c01fa6397d0d924d76333' }
      ],
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ request: e, response: a, event: s, state: n }) =>
              a && 'opaqueredirect' === a.type
                ? new Response(a.body, { status: 200, statusText: 'OK', headers: a.headers })
                : a
          }
        ]
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.googleapis\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })]
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.gstatic\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-static',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })]
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      new e.CacheFirst({
        cacheName: 'images',
        plugins: [new e.ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 2592e3 })]
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
      new e.CacheFirst({
        cacheName: 'map-tiles',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 604800 }),
          new e.CacheableResponsePlugin({ statuses: [0, 200] })
        ]
      }),
      'GET'
    ),
    e.registerRoute(
      /^https?:\/\/.*\/api\/emergency/i,
      new e.NetworkFirst({
        cacheName: 'emergency-api',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
          new e.CacheableResponsePlugin({ statuses: [0, 200] })
        ]
      }),
      'GET'
    ),
    e.registerRoute(
      /^https?:\/\/.*\/api\/alerts/i,
      new e.NetworkFirst({
        cacheName: 'alerts-api',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 }),
          new e.CacheableResponsePlugin({ statuses: [0, 200] })
        ]
      }),
      'GET'
    ))
})
//# sourceMappingURL=sw.js.map
