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
  self.define = (n, c) => {
    const i = e || ('document' in self ? document.currentScript.src : '') || location.href
    if (a[i]) return
    let t = {}
    const r = e => s(e, i),
      f = { module: { uri: i }, exports: t, require: r }
    a[i] = Promise.all(n.map(e => f[e] || r(e))).then(e => (c(...e), t))
  }
}
define(['./workbox-9324cd5d'], function (e) {
  'use strict'
  ;(importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: '3c5a5c9dee75e587ad71ad880113b6f0' },
        { url: '/_next/build-manifest.json', revision: 'd82172ac332c33d43c547e077d7c67aa' },
        {
          url: '/_next/react-loadable-manifest.json',
          revision: '4c9f9e5c62c765599509c9edb746ca29'
        },
        {
          url: '/_next/server/app/_not-found/page_client-reference-manifest.js',
          revision: '43b8cc11f94bb4b0680ed216c4a4450d'
        },
        {
          url: '/_next/server/app/api/audit/logs/route_client-reference-manifest.js',
          revision: 'ef6486a9013c9d4dfad3dc3fa7f177bf'
        },
        {
          url: '/_next/server/app/api/consensus/route_client-reference-manifest.js',
          revision: '86ad27a7a741d2f8eb0621f39223d450'
        },
        {
          url: '/_next/server/app/api/emergency/route_client-reference-manifest.js',
          revision: '727354b82a9f3690fa3a246f66a32221'
        },
        {
          url: '/_next/server/app/api/health/route_client-reference-manifest.js',
          revision: '888f3ef755c39b24de4eb6c911b021b9'
        },
        {
          url: '/_next/server/app/api/notifications/preferences/route_client-reference-manifest.js',
          revision: '082de800beb10c62732b401e60bd2414'
        },
        {
          url: '/_next/server/app/api/notifications/register/route_client-reference-manifest.js',
          revision: 'b92e83c36eccaf135d5126971cee8fc2'
        },
        {
          url: '/_next/server/app/api/notifications/route_client-reference-manifest.js',
          revision: '459590711ce0bcbac7084c829f7698f5'
        },
        {
          url: '/_next/server/app/api/performance/route_client-reference-manifest.js',
          revision: '00779d9e9515810bf144f892b2785ca5'
        },
        {
          url: '/_next/server/app/api/privacy/export/route_client-reference-manifest.js',
          revision: 'c4be95665d72d7ec3266f977e1d53c17'
        },
        {
          url: '/_next/server/app/api/privacy/legal-requests/route_client-reference-manifest.js',
          revision: 'e518b3efa6edc1c0b8d3c99585838419'
        },
        {
          url: '/_next/server/app/api/privacy/settings/route_client-reference-manifest.js',
          revision: '26f716870444318d51f1cedf7840c051'
        },
        {
          url: '/_next/server/app/api/privacy/transparency/route_client-reference-manifest.js',
          revision: '1c758e1d8c16c49ca658c95bd1bfb888'
        },
        {
          url: '/_next/server/app/api/push/subscribe/route_client-reference-manifest.js',
          revision: 'b4785dd143449b8a57ec931722ea2faa'
        },
        {
          url: '/_next/server/app/api/push/unsubscribe/route_client-reference-manifest.js',
          revision: '49de57db7a3266658de80746494db528'
        },
        {
          url: '/_next/server/app/api/trust/%5BuserId%5D/route_client-reference-manifest.js',
          revision: 'e96dea9de5f3c7ca86af80490dd9ef04'
        },
        {
          url: '/_next/server/app/api/trust/route_client-reference-manifest.js',
          revision: '2f92f9b02964665e223bc95e886c22d4'
        },
        {
          url: '/_next/server/app/auth/callback/route_client-reference-manifest.js',
          revision: 'baf94a629812ee19b2f11cebed815d71'
        },
        {
          url: '/_next/server/app/login/page_client-reference-manifest.js',
          revision: '773f349df996fc03476eb99aa948158b'
        },
        {
          url: '/_next/server/app/offline/emergency/page_client-reference-manifest.js',
          revision: '755584422cbdffa4f20a68f6f9345af7'
        },
        {
          url: '/_next/server/app/offline/page_client-reference-manifest.js',
          revision: 'a4af963525264cef242886852d0f2f3d'
        },
        {
          url: '/_next/server/app/page_client-reference-manifest.js',
          revision: '22a5ab481f54d553d50cdaa0ee184802'
        },
        {
          url: '/_next/server/app/privacy/legal-requests/page_client-reference-manifest.js',
          revision: 'adc76350c88ce6764f9f68d2d17f8b02'
        },
        {
          url: '/_next/server/app/privacy/page_client-reference-manifest.js',
          revision: '780af4e3791b306b6dbded87212ad58a'
        },
        {
          url: '/_next/server/app/privacy/settings/page_client-reference-manifest.js',
          revision: '1ab35378e771c820266b9fbaaa9a000c'
        },
        {
          url: '/_next/server/app/profile/page_client-reference-manifest.js',
          revision: '1804f9880045b1a2dab6f12368fa2697'
        },
        {
          url: '/_next/server/app/pwa-status/page_client-reference-manifest.js',
          revision: 'ec3495b1aef0ff54be5daecddc8eeb30'
        },
        {
          url: '/_next/server/app/report/page_client-reference-manifest.js',
          revision: 'c107159a0dd0d8c6dfd81390310ee943'
        },
        {
          url: '/_next/server/app/settings/page_client-reference-manifest.js',
          revision: '6255aed2df04b4892315444c30c0a1d2'
        },
        {
          url: '/_next/server/app/signup/page_client-reference-manifest.js',
          revision: '292544b38544b2ed9c1be618b8c4e26a'
        },
        {
          url: '/_next/server/app/terms/page_client-reference-manifest.js',
          revision: 'c877f9a4a76a43ec39310d64b4827d3c'
        },
        {
          url: '/_next/server/middleware-build-manifest.js',
          revision: 'cd02c9d8fb04d69d05745293507018ed'
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
          url: '/_next/static/E2MxHzmtCbHn7aWmq_-zY/_buildManifest.js',
          revision: '11b3295b06ab602f16bbd19813bb78eb'
        },
        {
          url: '/_next/static/E2MxHzmtCbHn7aWmq_-zY/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933'
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-4cee6297c4746802.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/audit/logs/route-9701a6dd59213da6.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/consensus/route-f985076bd4a55384.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/emergency/route-29a95aacd4e90824.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/health/route-30ed84b24398157d.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/preferences/route-34f3d3e2e44d01c0.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/register/route-624c8e276cdc6c8c.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/route-2139e90cff96a2ff.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/performance/route-345074b37a2d0959.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/export/route-332f6fde62c289e8.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/legal-requests/route-0420c3d27da6a59d.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/settings/route-8dd279aa05e648d7.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/transparency/route-46b39bf084da3e34.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/push/subscribe/route-7bb15f95fe78f7fc.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/push/unsubscribe/route-45f0c5813989527c.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/trust/%5BuserId%5D/route-bb71fb69f30c2a1e.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/api/trust/route-ff663ec8d4416e0d.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/auth/callback/route-d026f56b5959587d.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/error-8de8440738f20b22.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/error-8de8440738f20b22.js.map',
          revision: 'bf5a5e248e2bbf07f75a71099dedc0cc'
        },
        {
          url: '/_next/static/chunks/app/global-error-d5c341cdf22a8342.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/global-error-d5c341cdf22a8342.js.map',
          revision: '6d072c4f7bbd05f6115aef07ce34027b'
        },
        {
          url: '/_next/static/chunks/app/layout-111ed78cb3bd537c.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/layout-111ed78cb3bd537c.js.map',
          revision: '11f27fd8207f6f6cef450b0ab174f9a2'
        },
        {
          url: '/_next/static/chunks/app/loading-4c59f8ef00fcbc9c.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/login/page-4815cb3caafe7aef.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/login/page-4815cb3caafe7aef.js.map',
          revision: '0e02596efa8de3f3f6a9951aeba7671f'
        },
        {
          url: '/_next/static/chunks/app/not-found-8af84a0c637cf98a.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/not-found-8af84a0c637cf98a.js.map',
          revision: '4e81a33710e41625603248a2890245dd'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-b4ef9cd2ddf0e137.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-b4ef9cd2ddf0e137.js.map',
          revision: '6fd8423409507374376c47f37562d4e7'
        },
        {
          url: '/_next/static/chunks/app/offline/page-0983465c21fac023.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/offline/page-0983465c21fac023.js.map',
          revision: 'ca254db599da357ee698e5f5c78a4cf6'
        },
        {
          url: '/_next/static/chunks/app/page-e6f60a64a89c80a3.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/page-e6f60a64a89c80a3.js.map',
          revision: 'e1c90fd9b1394bf594a8f667601b91f6'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-e39dac905553c573.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-e39dac905553c573.js.map',
          revision: '0d26daa25cb1b616ed1139b804012740'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-4e7bed3c1da02705.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-4e7bed3c1da02705.js.map',
          revision: 'a6d074bb51ec1544a644675e38b81ade'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-3e2eef5fff5a5573.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-3e2eef5fff5a5573.js.map',
          revision: '34d4601bb1cb8edc029af5ac723daa48'
        },
        {
          url: '/_next/static/chunks/app/profile/page-3d3d5b8c635f5fbb.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/profile/page-3d3d5b8c635f5fbb.js.map',
          revision: 'ddfc599092c254948bf3e6bca5e6b7dd'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-cc6801139c6be418.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-cc6801139c6be418.js.map',
          revision: 'c2d3e1850fe8b9f8c36245280e846893'
        },
        {
          url: '/_next/static/chunks/app/report/page-e71310a2b4c64f13.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/report/page-e71310a2b4c64f13.js.map',
          revision: '748aeeb10a773eeb1dd6eae1767ae7f5'
        },
        {
          url: '/_next/static/chunks/app/settings/page-05787eade5a6a83e.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/settings/page-05787eade5a6a83e.js.map',
          revision: '7ccef8865facca2ee278cb40c82557ba'
        },
        {
          url: '/_next/static/chunks/app/signup/page-56e33d3c93e14f28.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/app/signup/page-56e33d3c93e14f28.js.map',
          revision: 'bb534676b1874c5e06813cb7336f5347'
        },
        {
          url: '/_next/static/chunks/app/terms/page-d15ebad741b27419.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/common-44a4fe847ba6d744.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        { url: '/_next/static/chunks/main-942f6268cfa137de.js', revision: 'E2MxHzmtCbHn7aWmq_-zY' },
        {
          url: '/_next/static/chunks/main-app-938fb84f30fbce71.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/main-app-938fb84f30fbce71.js.map',
          revision: '9cff20f048f047e3326f3d391648cd1c'
        },
        {
          url: '/_next/static/chunks/pages/_app-67907bf64768ad50.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/pages/_app-67907bf64768ad50.js.map',
          revision: '26641c46bfee10d34eca6ffedf447771'
        },
        {
          url: '/_next/static/chunks/pages/_error-cb21a6d7c777b970.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
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
          url: '/_next/static/chunks/webpack-f427acca71000ff2.js',
          revision: 'E2MxHzmtCbHn7aWmq_-zY'
        },
        {
          url: '/_next/static/chunks/webpack-f427acca71000ff2.js.map',
          revision: '093d7e0e41077c959a66e5e36786d701'
        },
        { url: '/_next/static/css/347e88918a814ffa.css', revision: '347e88918a814ffa' },
        {
          url: '/_next/static/css/347e88918a814ffa.css.map',
          revision: '6378c4f6e35958c8db72d87b12fb5846'
        },
        { url: '/_next/static/css/9e167c07fdcc5fdc.css', revision: '9e167c07fdcc5fdc' },
        {
          url: '/_next/static/css/9e167c07fdcc5fdc.css.map',
          revision: '17520716095703740916bd81cc4365f5'
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
