if (!self.define) {
  let e,
    a = {}
  const s = (s, i) => (
    (s = new URL(s + '.js', i).href),
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
  self.define = (i, n) => {
    const t = e || ('document' in self ? document.currentScript.src : '') || location.href
    if (a[t]) return
    let c = {}
    const r = e => s(e, t),
      p = { module: { uri: t }, exports: c, require: r }
    a[t] = Promise.all(i.map(e => p[e] || r(e))).then(e => (n(...e), c))
  }
}
define(['./workbox-9324cd5d'], function (e) {
  'use strict'
  ;(importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: 'bdd7219bfde86b8d8140d6002ac6ad7b' },
        { url: '/_next/build-manifest.json', revision: 'd8016407840b6feee45988b0bf6706a4' },
        {
          url: '/_next/react-loadable-manifest.json',
          revision: '4c9f9e5c62c765599509c9edb746ca29'
        },
        {
          url: '/_next/server/app/_not-found/page_client-reference-manifest.js',
          revision: 'be4d67150ed64a28ef7a1161398cf704'
        },
        {
          url: '/_next/server/app/api/audit/logs/route_client-reference-manifest.js',
          revision: '3a2079f4a832172ed146e7035968d041'
        },
        {
          url: '/_next/server/app/api/consensus/route_client-reference-manifest.js',
          revision: '1230c18975c7a9349ce97fb52876c4af'
        },
        {
          url: '/_next/server/app/api/emergency/route_client-reference-manifest.js',
          revision: 'b962f6c013c7da5aad79396a23873971'
        },
        {
          url: '/_next/server/app/api/health/route_client-reference-manifest.js',
          revision: '30b30a25958a659652cff72805da111a'
        },
        {
          url: '/_next/server/app/api/notifications/preferences/route_client-reference-manifest.js',
          revision: 'e041ccb2b17d9b5d53de49ead95f0297'
        },
        {
          url: '/_next/server/app/api/notifications/register/route_client-reference-manifest.js',
          revision: '7baf0306392c6a061dd47ebe39524b68'
        },
        {
          url: '/_next/server/app/api/notifications/route_client-reference-manifest.js',
          revision: '5a294cd0227dbb6d1ea01153bc5dfe6d'
        },
        {
          url: '/_next/server/app/api/performance/route_client-reference-manifest.js',
          revision: '3015213cf0420e80aa5bf837b698ae00'
        },
        {
          url: '/_next/server/app/api/privacy/export/route_client-reference-manifest.js',
          revision: 'fe9fee897416c3c1d568e48fb084ee18'
        },
        {
          url: '/_next/server/app/api/privacy/legal-requests/route_client-reference-manifest.js',
          revision: '0772d87c950309b7c99c6e7f959c02e8'
        },
        {
          url: '/_next/server/app/api/privacy/settings/route_client-reference-manifest.js',
          revision: 'ee0d1378f1df03cb947125078e9650f6'
        },
        {
          url: '/_next/server/app/api/privacy/transparency/route_client-reference-manifest.js',
          revision: '287c9397dfc2df4cfe02bb255f32bce9'
        },
        {
          url: '/_next/server/app/api/trust/%5BuserId%5D/route_client-reference-manifest.js',
          revision: '4d8b4e631ff73c72c2d25a7a0f00147e'
        },
        {
          url: '/_next/server/app/api/trust/route_client-reference-manifest.js',
          revision: 'aadcd741e0cac27c1fa9dc6084db1afb'
        },
        {
          url: '/_next/server/app/offline/emergency/page_client-reference-manifest.js',
          revision: '3faeeaa34df7a01e9f19a8e19e4ee723'
        },
        {
          url: '/_next/server/app/offline/page_client-reference-manifest.js',
          revision: '855b7dd3e57d5f85a2a780bd70171e8a'
        },
        {
          url: '/_next/server/app/page_client-reference-manifest.js',
          revision: 'ae3bbaa532555dbe92ba3ab5ab36c326'
        },
        {
          url: '/_next/server/app/privacy/legal-requests/page_client-reference-manifest.js',
          revision: 'b98816b41ddcf1b0920b51b6d2b05274'
        },
        {
          url: '/_next/server/app/privacy/page_client-reference-manifest.js',
          revision: 'd38967cc8a5347722714b0f924a4a1f0'
        },
        {
          url: '/_next/server/app/privacy/settings/page_client-reference-manifest.js',
          revision: 'f531555bef3f3e36839bd55e11d94a66'
        },
        {
          url: '/_next/server/app/pwa-status/page_client-reference-manifest.js',
          revision: '7b64687686d09895899e355eff0a7ea4'
        },
        {
          url: '/_next/server/app/signup/page_client-reference-manifest.js',
          revision: 'd410ef80fa6c5d6ff7d703cfc69b180f'
        },
        {
          url: '/_next/server/middleware-build-manifest.js',
          revision: '64a595d795cc4d02fdcc29e0ca0a9fff'
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
          url: '/_next/static/6zIQPeBiXpntXNg_zKlW3/_buildManifest.js',
          revision: 'd49cc2dac39414484574812f51ff6b8f'
        },
        {
          url: '/_next/static/6zIQPeBiXpntXNg_zKlW3/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933'
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-73e09b972fad5ad7.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-73e09b972fad5ad7.js.map',
          revision: '912bb714bd5903bc922b16c11184abfe'
        },
        {
          url: '/_next/static/chunks/app/api/audit/logs/route-8d0679ee77c574e4.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/consensus/route-80eb8513fb1d533d.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/emergency/route-c2cba50bb37dd9ac.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/health/route-04f2ca4082a667de.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/preferences/route-56679ea4832679ee.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/register/route-9d0bbe5cc34ff37a.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/route-cf305c7a07c11ba2.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/performance/route-dbe0dcadea3fc6e4.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/export/route-41e72e31557a70a0.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/legal-requests/route-abbaadcbc7e1fb71.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/settings/route-77df188dd75ab009.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/transparency/route-20872a52a6ef37c4.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/trust/%5BuserId%5D/route-5940b6f4dc583d33.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/api/trust/route-cb527be34d234f3b.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/layout-a74a973c71866713.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/layout-a74a973c71866713.js.map',
          revision: '8da9c5db077ac6b788a6d6c15224df4f'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-ceefabb88286b3e6.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-ceefabb88286b3e6.js.map',
          revision: '600941de9850bd2c6a19ce7643a9d655'
        },
        {
          url: '/_next/static/chunks/app/offline/page-8c7320b26ef1829f.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/offline/page-8c7320b26ef1829f.js.map',
          revision: '291551f34ad59d7c390ecc3d121c6481'
        },
        {
          url: '/_next/static/chunks/app/page-874f9d3d444355bd.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/page-874f9d3d444355bd.js.map',
          revision: '8140cf8ffe90ea4255667b24e537206a'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-559784b44d14ac65.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-559784b44d14ac65.js.map',
          revision: 'e322a3dcc001f7d7b0bb1d0f50627060'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-752c3bf8d6143bb6.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-752c3bf8d6143bb6.js.map',
          revision: '9b27800dc8d5d76b1e67643395a6e55d'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-c514f1a4b0c6b375.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-c514f1a4b0c6b375.js.map',
          revision: '2bd2f5ba40b2d9c1470977035f9a263c'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-7d651b547f03bfc8.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-7d651b547f03bfc8.js.map',
          revision: 'bc83bae6fdbca0905193093fc4128ece'
        },
        {
          url: '/_next/static/chunks/app/signup/page-b631baef2d5c2d9b.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/app/signup/page-b631baef2d5c2d9b.js.map',
          revision: 'c9a3c21c164a396d939deb177c7375ec'
        },
        {
          url: '/_next/static/chunks/common-89aba2f676504c9b.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/common-89aba2f676504c9b.js.map',
          revision: '58892dee91fae860a329382684f71bad'
        },
        { url: '/_next/static/chunks/main-a1ea976e7ea85e1a.js', revision: '6zIQPeBiXpntXNg_zKlW3' },
        {
          url: '/_next/static/chunks/main-app-836cfd42e3e31788.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/main-app-836cfd42e3e31788.js.map',
          revision: 'e7a330d930f6ef53da1475ab7cb20a35'
        },
        {
          url: '/_next/static/chunks/pages/_app-8f1cbf21b30d109f.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/pages/_app-8f1cbf21b30d109f.js.map',
          revision: '85ded05a0a25aed60580ea91e1e75f27'
        },
        {
          url: '/_next/static/chunks/pages/_error-3a90c6e2a8469608.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/pages/_error-3a90c6e2a8469608.js.map',
          revision: '85c21f12fef90eaaa06e36a04c6fa552'
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f'
        },
        {
          url: '/_next/static/chunks/vendors-6967d6953742e3fd.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/webpack-f427acca71000ff2.js',
          revision: '6zIQPeBiXpntXNg_zKlW3'
        },
        {
          url: '/_next/static/chunks/webpack-f427acca71000ff2.js.map',
          revision: '093d7e0e41077c959a66e5e36786d701'
        },
        { url: '/_next/static/css/9e167c07fdcc5fdc.css', revision: '9e167c07fdcc5fdc' },
        {
          url: '/_next/static/css/9e167c07fdcc5fdc.css.map',
          revision: 'e8a9476c3d20a5bd1c11585bee476b0f'
        },
        { url: '/_next/static/css/b07eeb2715cac96a.css', revision: 'b07eeb2715cac96a' },
        {
          url: '/_next/static/css/b07eeb2715cac96a.css.map',
          revision: 'cde4a032e1615500204fc2dcba7b4f2e'
        },
        { url: '/_next/static/css/b5cbfa1975bd175d.css', revision: 'b5cbfa1975bd175d' },
        {
          url: '/_next/static/css/b5cbfa1975bd175d.css.map',
          revision: '8634199a5f05ded62b9f0413f57f3150'
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
        { url: '/manifest.json', revision: '585a0ebfcad09a48fd4a84b6dcf9aeda' },
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
            cacheWillUpdate: async ({ request: e, response: a, event: s, state: i }) =>
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
