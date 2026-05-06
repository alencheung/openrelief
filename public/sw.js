if (!self.define) {
  let e,
    a = {}
  const s = (s, c) => (
    (s = new URL(s + '.js', c).href),
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
  self.define = (c, i) => {
    const n = e || ('document' in self ? document.currentScript.src : '') || location.href
    if (a[n]) return
    let r = {}
    const t = e => s(e, n),
      f = { module: { uri: n }, exports: r, require: t }
    a[n] = Promise.all(c.map(e => f[e] || t(e))).then(e => (i(...e), r))
  }
}
define(['./workbox-9324cd5d'], function (e) {
  'use strict'
  ;(importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: 'a90b154e4a03b550ea87d50c1592152f' },
        { url: '/_next/build-manifest.json', revision: '4c5a5d5913ddcce7a54148119ada9ede' },
        {
          url: '/_next/react-loadable-manifest.json',
          revision: '4c9f9e5c62c765599509c9edb746ca29'
        },
        {
          url: '/_next/server/app/_not-found/page_client-reference-manifest.js',
          revision: '00f72ffbc2e0f441a52e6bff0c1b0ada'
        },
        {
          url: '/_next/server/app/api/audit/logs/route_client-reference-manifest.js',
          revision: 'a786dd48e2ca1b9d3a305e3142e7cf03'
        },
        {
          url: '/_next/server/app/api/consensus/route_client-reference-manifest.js',
          revision: 'c93e064f045b9910bd3305f53dd92030'
        },
        {
          url: '/_next/server/app/api/emergency/route_client-reference-manifest.js',
          revision: 'ffba86366ba926c36cc2c56056d64962'
        },
        {
          url: '/_next/server/app/api/health/route_client-reference-manifest.js',
          revision: 'db4592ad6a6262eed2a23298b5b951c4'
        },
        {
          url: '/_next/server/app/api/notifications/preferences/route_client-reference-manifest.js',
          revision: '31928772749b1d150b115ab2e8c42314'
        },
        {
          url: '/_next/server/app/api/notifications/register/route_client-reference-manifest.js',
          revision: 'ae69de0394ee90a31d99241d9afa2baa'
        },
        {
          url: '/_next/server/app/api/notifications/route_client-reference-manifest.js',
          revision: '83ddf53d27d8931976e4d2508cbfd7d3'
        },
        {
          url: '/_next/server/app/api/performance/route_client-reference-manifest.js',
          revision: 'f8f37eb99b22f8e794428b2fecf6ab01'
        },
        {
          url: '/_next/server/app/api/privacy/export/route_client-reference-manifest.js',
          revision: '2b64767e6ef7634df1a606909346bc60'
        },
        {
          url: '/_next/server/app/api/privacy/legal-requests/route_client-reference-manifest.js',
          revision: '320d9f1ee7f599b0c1bdbb01f3a52ec4'
        },
        {
          url: '/_next/server/app/api/privacy/settings/route_client-reference-manifest.js',
          revision: 'f6fadb0ab950fa976d53ca980e695b18'
        },
        {
          url: '/_next/server/app/api/privacy/transparency/route_client-reference-manifest.js',
          revision: '865120c7aa2504512fe56764c494e3af'
        },
        {
          url: '/_next/server/app/api/push/subscribe/route_client-reference-manifest.js',
          revision: 'bc0b43e16818d8d0c1d94052eb020560'
        },
        {
          url: '/_next/server/app/api/push/unsubscribe/route_client-reference-manifest.js',
          revision: 'b850cd628a91fae8132527e580ba602d'
        },
        {
          url: '/_next/server/app/api/trust/%5BuserId%5D/route_client-reference-manifest.js',
          revision: 'ed02a669e864d603cc292fbaf85e697a'
        },
        {
          url: '/_next/server/app/api/trust/route_client-reference-manifest.js',
          revision: 'b800d64777996bb96819e574bd6847b7'
        },
        {
          url: '/_next/server/app/auth/callback/route_client-reference-manifest.js',
          revision: 'c62204e5afcca981fa2336f919e7ebbc'
        },
        {
          url: '/_next/server/app/login/page_client-reference-manifest.js',
          revision: 'b944ae5ccb00c755ccf71528c8ce27fc'
        },
        {
          url: '/_next/server/app/offline/emergency/page_client-reference-manifest.js',
          revision: '526a53f97c0c434b85525a81de122dca'
        },
        {
          url: '/_next/server/app/offline/page_client-reference-manifest.js',
          revision: 'b83102e070892ee7094f0f5a0dd2ce6b'
        },
        {
          url: '/_next/server/app/page_client-reference-manifest.js',
          revision: 'b97c5f6a7cadee34755621d17de37a37'
        },
        {
          url: '/_next/server/app/privacy/legal-requests/page_client-reference-manifest.js',
          revision: 'edcbf14279f9a124c8cf2be945dc1167'
        },
        {
          url: '/_next/server/app/privacy/page_client-reference-manifest.js',
          revision: '2597a85ce37a46ba1b3dc7524e8dcf4a'
        },
        {
          url: '/_next/server/app/privacy/settings/page_client-reference-manifest.js',
          revision: '1f0ab28dc430ef2427f8901190771a8e'
        },
        {
          url: '/_next/server/app/profile/page_client-reference-manifest.js',
          revision: '5f525d6e20ba69228717ca8bb84dfae0'
        },
        {
          url: '/_next/server/app/pwa-status/page_client-reference-manifest.js',
          revision: 'fc3d55eb4701938897e3d64df714b6c9'
        },
        {
          url: '/_next/server/app/report/page_client-reference-manifest.js',
          revision: 'ba7e850ef1766b23755480ec3f987493'
        },
        {
          url: '/_next/server/app/settings/page_client-reference-manifest.js',
          revision: '01e45de7da22559ee3fa2d55b1644b6c'
        },
        {
          url: '/_next/server/app/signup/page_client-reference-manifest.js',
          revision: 'efbbebd67a104b02a3f8217356d1f024'
        },
        {
          url: '/_next/server/app/terms/page_client-reference-manifest.js',
          revision: '11fb55581649063dcfc309ca60c42a12'
        },
        {
          url: '/_next/server/middleware-build-manifest.js',
          revision: '00963d5f9267f9b854357f522acc3b6f'
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
          url: '/_next/static/aByOwwMTjwUqNNyfA3Q-m/_buildManifest.js',
          revision: '11b3295b06ab602f16bbd19813bb78eb'
        },
        {
          url: '/_next/static/aByOwwMTjwUqNNyfA3Q-m/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933'
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-4cee6297c4746802.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/audit/logs/route-9701a6dd59213da6.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/consensus/route-f985076bd4a55384.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/emergency/route-29a95aacd4e90824.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/health/route-30ed84b24398157d.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/preferences/route-34f3d3e2e44d01c0.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/register/route-624c8e276cdc6c8c.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/notifications/route-2139e90cff96a2ff.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/performance/route-345074b37a2d0959.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/export/route-332f6fde62c289e8.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/legal-requests/route-0420c3d27da6a59d.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/settings/route-8dd279aa05e648d7.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/privacy/transparency/route-46b39bf084da3e34.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/push/subscribe/route-7bb15f95fe78f7fc.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/push/unsubscribe/route-45f0c5813989527c.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/trust/%5BuserId%5D/route-bb71fb69f30c2a1e.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/api/trust/route-ff663ec8d4416e0d.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/auth/callback/route-d026f56b5959587d.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/error-0c4651af482b0ab9.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/error-0c4651af482b0ab9.js.map',
          revision: '5095c215781ed755f197ac69aac640ed'
        },
        {
          url: '/_next/static/chunks/app/global-error-9ddcea891f2946d2.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/global-error-9ddcea891f2946d2.js.map',
          revision: '755372130b7add79d99ea6e2745711ba'
        },
        {
          url: '/_next/static/chunks/app/layout-d08c6bc24b4ccb8b.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/layout-d08c6bc24b4ccb8b.js.map',
          revision: 'e12daece54019fe1d4d4a3606c3f0e5c'
        },
        {
          url: '/_next/static/chunks/app/loading-4c59f8ef00fcbc9c.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/login/page-4815cb3caafe7aef.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/login/page-4815cb3caafe7aef.js.map',
          revision: '0e02596efa8de3f3f6a9951aeba7671f'
        },
        {
          url: '/_next/static/chunks/app/not-found-8af84a0c637cf98a.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/not-found-8af84a0c637cf98a.js.map',
          revision: '4e81a33710e41625603248a2890245dd'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-0692a1ed5f9e0e2b.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/offline/emergency/page-0692a1ed5f9e0e2b.js.map',
          revision: '98e6464d52def8f2bf937afa96965e6f'
        },
        {
          url: '/_next/static/chunks/app/offline/page-19df4dc0cd524aa7.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/offline/page-19df4dc0cd524aa7.js.map',
          revision: '58d4e89ca528a76d9d401907998a8030'
        },
        {
          url: '/_next/static/chunks/app/page-f318e07ce5fab0eb.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/page-f318e07ce5fab0eb.js.map',
          revision: '9b34e34483bbc6a04fb2731a20e9da33'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-2b0a4fbf518d45ce.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/privacy/legal-requests/page-2b0a4fbf518d45ce.js.map',
          revision: '0d751254cfaaa6b6d5b3102212c6b8ba'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-76b90f2103ffd183.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/privacy/page-76b90f2103ffd183.js.map',
          revision: 'f8003d6671201b97819c1d5669ac1415'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-f26e694012f6c17d.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/privacy/settings/page-f26e694012f6c17d.js.map',
          revision: '8b71a66e560e35f7e3aa4024969ff116'
        },
        {
          url: '/_next/static/chunks/app/profile/page-3d3d5b8c635f5fbb.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/profile/page-3d3d5b8c635f5fbb.js.map',
          revision: 'ddfc599092c254948bf3e6bca5e6b7dd'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-1cc7c36e5a6dd3e5.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/pwa-status/page-1cc7c36e5a6dd3e5.js.map',
          revision: 'de89c27d862cee9785682aef8d8dfb10'
        },
        {
          url: '/_next/static/chunks/app/report/page-52a3636165525753.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/report/page-52a3636165525753.js.map',
          revision: '4a47e9981594d1b1d8ba3af51d81eb7f'
        },
        {
          url: '/_next/static/chunks/app/settings/page-86ad99fda8809fe4.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/settings/page-86ad99fda8809fe4.js.map',
          revision: '7e001fe924d251df80e4d985571b57e1'
        },
        {
          url: '/_next/static/chunks/app/signup/page-da304049cae80cbc.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/app/signup/page-da304049cae80cbc.js.map',
          revision: 'd93f9a62a1b9ed53e22df4f8dc3b02f0'
        },
        {
          url: '/_next/static/chunks/app/terms/page-d15ebad741b27419.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/common-9cfcbc210cd8c3aa.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        { url: '/_next/static/chunks/main-942f6268cfa137de.js', revision: 'aByOwwMTjwUqNNyfA3Q-m' },
        {
          url: '/_next/static/chunks/main-app-b8e5478a80e2745f.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/main-app-b8e5478a80e2745f.js.map',
          revision: 'e4dac501cd8be4dce1f75f7e6c5bcb65'
        },
        {
          url: '/_next/static/chunks/pages/_app-6f40f7ffeba317bb.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/pages/_app-6f40f7ffeba317bb.js.map',
          revision: '025bc4e75397b7740eaee34430d5f5c8'
        },
        {
          url: '/_next/static/chunks/pages/_error-cb21a6d7c777b970.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
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
          url: '/_next/static/chunks/vendors-eae5460fe4a59879.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
        },
        {
          url: '/_next/static/chunks/webpack-f427acca71000ff2.js',
          revision: 'aByOwwMTjwUqNNyfA3Q-m'
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
          revision: 'ae40b17834026eb04cff1d924bb17cab'
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
            cacheWillUpdate: async ({ request: e, response: a, event: s, state: c }) =>
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
