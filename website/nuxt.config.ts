const plausibleEnabled = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  compatibilityDate: '2026-04-02',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/global.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:3004/api/v1',
    },
  },
  app: {
    head: {
      script: plausibleEnabled
        ? [
            { src: 'https://plausible.io/js/pa-DWMfDCTX_xttSKfBSXbM1.js', async: true },
            {
              innerHTML:
                'window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()',
            },
          ]
        : [],
    },
  },
})
