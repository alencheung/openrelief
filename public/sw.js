if (!self.define) {
  let e,
    s = {}
  const a = (a, i) => (
    (a = new URL(a + '.js', i).href),
    s[a] ||
      new Promise(s => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;((e.src = a), (e.onload = s), document.head.appendChild(e))
        } else ((e = a), importScripts(a), s())
      }).then(() => {
        let e = s[a]
        if (!e) throw new Error(`Module ${a} didn’t register its module`)
        return e
      })
  )
  self.define = (i, n) => {
    const t = e || ('document' in self ? document.currentScript.src : '') || location.href
    if (s[t]) return
    let c = {}
    const r = e => a(e, t),
      f = { module: { uri: t }, exports: c, require: r }
    s[t] = Promise.all(i.map(e => f[e] || r(e))).then(e => (n(...e), c))
  }
}
define(['./workbox-9324cd5d'], function (e) {
  'use strict'
  ;(importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: 'f771a6ba9390afb2a460e93fc48c4e4d' },
        { url: '/_next/build-manifest.json', revision: 'fab1a9dbbd5983f3fdb7ce9c30ef37d7' },
        {
          url: '/_next/react-loadable-manifest.json',
          revision: '4c9f9e5c62c765599509c9edb746ca29'
        },
        {
          url: '/_next/server/app/_not-found/page_client-reference-manifest.js',
          revision: '6a0b7406baf6e1179e7ed244f9389f1c'
        },
        {
          url: '/_next/server/app/api/audit/logs/route_client-reference-manifest.js',
          revision: '9a1578cb3860feec5680533c328118f6'
        },
        {
          url: '/_next/server/app/api/consensus/route_client-reference-manifest.js',
          revision: '0b896b08eba572062a094993be672888'
        },
        {
          url: '/_next/server/app/api/emergency/route_client-reference-manifest.js',
          revision: 'b9766134461dda094b72acbd10e2a2bf'
        },
        {
          url: '/_next/server/app/api/health/route_client-reference-manifest.js',
          revision: 'e2eee7cb4a66d7b13abcccb4c0abdaf0'
        },
        {
          url: '/_next/server/app/api/notifications/preferences/route_client-reference-manifest.js',
          revision: '77f6cb7bff6c2a646ef725b28870362c'
        },
        {
          url: '/_next/server/app/api/notifications/register/route_client-reference-manifest.js',
          revision: '5e9c8b7431af0c469156550ae2bc937e'
        },
        {
          url: '/_next/server/app/api/notifications/route_client-reference-manifest.js',
          revision: 'b4f8a3b50a06e49a055e718ea0d0aa74'
        },
        {
          url: '/_next/server/app/api/performance/route_client-reference-manifest.js',
          revision: 'dae1c5d39911c8e7b1bfe72de9359584'
        },
        {
          url: '/_next/server/app/api/privacy/export/route_client-reference-manifest.js',
          revision: 'ba0970979c9258f1a7a4f33379328f1a'
        },
        {
          url: '/_next/server/app/api/privacy/legal-requests/route_client-reference-manifest.js',
          revision: '11392499af1adab8fd7ed031db84dfa7'
        },
        {
          url: '/_next/server/app/api/privacy/settings/route_client-reference-manifest.js',
          revision: 'bd81e681d3f7eb5ef11d6d86df8e48c1'
        },
        {
          url: '/_next/server/app/api/privacy/transparency/route_client-reference-manifest.js',
          revision: '331c5112d97bbcf2d9150380f3617557'
        },
        {
          url: '/_next/server/app/api/push/subscribe/route_client-reference-manifest.js',
          revision: 'c55901f1dc6ffed697b4cfba953044ee'
        },
        {
          url: '/_next/server/app/api/push/unsubscribe/route_client-reference-manifest.js',
          revision: '5e6b8c22b921fd7c7bbde357da545372'
        },
        {
          url: '/_next/server/app/api/trust/%5BuserId%5D/route_client-reference-manifest.js',
          revision: '3b20e148c0312305f4709a6593fa9987'
        },
        {
          url: '/_next/server/app/api/trust/route_client-reference-manifest.js',
          revision: 'aa630b543faccb27ffd56fdcb3bb039d'
        },
        {
          url: '/_next/server/app/auth/callback/route_client-reference-manifest.js',
          revision: 'ba7e5f1b70e04098e70d131c6a1c9815'
        },
        {
          url: '/_next/server/app/login/page_client-reference-manifest.js',
          revision: '07e56de519ea513061e22a2f0a53376c'
        },
        {
          url: '/_next/server/app/offline/emergency/page_client-reference-manifest.js',
          revision: '680e4ae7b4730975df2debb523ac25c1'
        },
        {
          url: '/_next/server/app/offline/page_client-reference-manifest.js',
          revision: '07a2d9c28822376fcefea0a1ef18d292'
        },
        {
          url: '/_next/server/app/page_client-reference-manifest.js',
          revision: 'b76e8979cb9f8a0dde6e067ebc5642fa'
        },
        {
          url: '/_next/server/app/privacy/legal-requests/page_client-reference-manifest.js',
          revision: '6220672c8d57d18983b52d19e6b285ed'
        },
        {
          url: '/_next/server/app/privacy/page_client-reference-manifest.js',
          revision: 'e232475c6f64c4770675dcb63e9e3162'
        },
        {
          url: '/_next/server/app/privacy/settings/page_client-reference-manifest.js',
          revision: 'b156b95cbd79ffb330cc10d193e7485e'
        },
        {
          url: '/_next/server/app/profile/page_client-reference-manifest.js',
          revision: '368aeb0d38cb7b2c3aba2090c7ca99d1'
        },
        {
          url: '/_next/server/app/pwa-status/page_client-reference-manifest.js',
          revision: '987324436a475f682f08ab21095e5271'
        },
        {
          url: '/_next/server/app/report/page_client-reference-manifest.js',
          revision: '15846ed33d23860bc0a91142bee70894'
        },
        {
          url: '/_next/server/app/settings/page_client-reference-manifest.js',
          revision: '9b64cd366b546539ef0591a383a91f58'
        },
        {
          url: '/_next/server/app/signup/page_client-reference-manifest.js',
          revision: 'a8475bf23dccfd6a09b047de2a0cef45'
        },
        {
          url: '/_next/server/app/terms/page_client-reference-manifest.js',
          revision: '252da85c0d8a19574440cc6674412c02'
        },
        {
          url: '/_next/server/middleware-build-manifest.js',
          revision: 'b14e246bb75b507abaa6a25dc62a0561'
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
          url: '/_next/static/chunks/app/_not-found/page-4cee6297c4746802.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/audit/logs/route-9701a6dd59213da6.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/consensus/route-f985076bd4a55384.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/emergency/route-29a95aacd4e90824.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/health/route-30ed84b24398157d.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/preferences/route-34f3d3e2e44d01c0.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/register/route-624c8e276cdc6c8c.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/route-2139e90cff96a2ff.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/performance/route-345074b37a2d0959.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/export/route-332f6fde62c289e8.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/legal-requests/route-0420c3d27da6a59d.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/settings/route-8dd279aa05e648d7.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/transparency/route-46b39bf084da3e34.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/push/subscribe/route-7bb15f95fe78f7fc.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/push/unsubscribe/route-45f0c5813989527c.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/trust/%5BuserId%5D/route-bb71fb69f30c2a1e.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/api/trust/route-ff663ec8d4416e0d.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/auth/callback/route-d026f56b5959587d.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/error-0c4651af482b0ab9.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/error-0c4651af482b0ab9.js.map',
          revision: '5095c215781ed755f197ac69aac640ed'
        },
        {
          url: '/_next/static/chunks/app/global-error-9ddcea891f2946d2.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/global-error-9ddcea891f2946d2.js.map',
          revision: '755372130b7add79d99ea6e2745711ba'
        },
        {
          url: '/_next/static/chunks/app/layout-d08c6bc24b4ccb8b.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/layout-d08c6bc24b4ccb8b.js.map',
          revision: 'e12daece54019fe1d4d4a3606c3f0e5c'
        },
        {
          url: '/_next/static/chunks/app/loading-4c59f8ef00fcbc9c.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/login/page-4815cb3caafe7aef.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/login/page-4815cb3caafe7aef.js.map',
          revision: '0e02596efa8de3f3f6a9951aeba7671f'
        },
        {
          url: '/_next/static/chunks/app/not-found-8af84a0c637cf98a.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/not-found-8af84a0c637cf98a.js.map',
          revision: '4e81a33710e41625603248a2890245dd'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-0692a1ed5f9e0e2b.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-0692a1ed5f9e0e2b.js.map',
          revision: '98e6464d52def8f2bf937afa96965e6f'
        },
        {
          url: '/_next/static/chunks/app/offline/page-19df4dc0cd524aa7.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/offline/page-19df4dc0cd524aa7.js.map',
          revision: '58d4e89ca528a76d9d401907998a8030'
        },
        {
          url: '/_next/static/chunks/app/page-329d044c80ac4295.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/page-329d044c80ac4295.js.map',
          revision: '87f1d7a21dbd4159e056545ca111f542'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-2b0a4fbf518d45ce.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-2b0a4fbf518d45ce.js.map',
          revision: '0d751254cfaaa6b6d5b3102212c6b8ba'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-8997655915b3a6f2.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-8997655915b3a6f2.js.map',
          revision: '4ec690a9912d5c493c6004400739ad60'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-f26e694012f6c17d.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-f26e694012f6c17d.js.map',
          revision: '8b71a66e560e35f7e3aa4024969ff116'
        },
        {
          url: '/_next/static/chunks/app/profile/page-3d3d5b8c635f5fbb.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/profile/page-3d3d5b8c635f5fbb.js.map',
          revision: 'ddfc599092c254948bf3e6bca5e6b7dd'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-1cc7c36e5a6dd3e5.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-1cc7c36e5a6dd3e5.js.map',
          revision: 'de89c27d862cee9785682aef8d8dfb10'
        },
        {
          url: '/_next/static/chunks/app/report/page-f6ddeda0ad82d263.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/report/page-f6ddeda0ad82d263.js.map',
          revision: '8bf66d7271249790ddf36f4f684afd24'
        },
        {
          url: '/_next/static/chunks/app/settings/page-86ad99fda8809fe4.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/settings/page-86ad99fda8809fe4.js.map',
          revision: '7e001fe924d251df80e4d985571b57e1'
        },
        {
          url: '/_next/static/chunks/app/signup/page-b255e9d19a8b3cb6.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/app/signup/page-b255e9d19a8b3cb6.js.map',
          revision: 'e6deb1fa39e52a597e179d65c1beaf57'
        },
        {
          url: '/_next/static/chunks/app/terms/page-d15ebad741b27419.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/common-9ed109503e23fadd.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        { url: '/_next/static/chunks/main-942f6268cfa137de.js', revision: 'nQ20fs3it5-xMRtVAzB85' },
        {
          url: '/_next/static/chunks/main-app-8cd415babd4b530e.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/main-app-8cd415babd4b530e.js.map',
          revision: '8cb3896f32371eaf054588ca7a8f9051'
        },
        {
          url: '/_next/static/chunks/pages/_app-2d28230c881d6485.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/pages/_app-2d28230c881d6485.js.map',
          revision: '9af09928ac910e1acaa915294b557f7e'
        },
        {
          url: '/_next/static/chunks/pages/_error-cb21a6d7c777b970.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
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
          url: '/_next/static/chunks/vendors-f897597e2ae1e106.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
        },
        {
          url: '/_next/static/chunks/webpack-f427acca71000ff2.js',
          revision: 'nQ20fs3it5-xMRtVAzB85'
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
          revision: '6fbe7849609959eee3b390292fd04bad'
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
        {
          url: '/_next/static/nQ20fs3it5-xMRtVAzB85/_buildManifest.js',
          revision: '11b3295b06ab602f16bbd19813bb78eb'
        },
        {
          url: '/_next/static/nQ20fs3it5-xMRtVAzB85/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933'
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
            cacheWillUpdate: async ({ request: e, response: s, event: a, state: i }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, { status: 200, statusText: 'OK', headers: s.headers })
                : s
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
