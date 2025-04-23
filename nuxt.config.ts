// 打包分包插件解决潜在循环依赖
// import { prismjsPlugin } from "vite-plugin-prismjs";
// import { pwa } from "./config/pwa";
import { appDescription, appName } from "./constants/index";
import * as packageJson from "./package.json";
import "dayjs/locale/en";

const platform = process.env.TAURI_PLATFORM;
const isMobile = !!/android|ios/.exec(platform || "");
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const GQL_HOST = import.meta.env.VITE_GQL_HOST;
const isSSR = process.env.NUXT_PUBLIC_SPA;
const mode = process.env.NUXT_PUBLIC_NODE_ENV as "development" | "production" | "test";
const version = packageJson?.version;
const host = process.env.TAURI_DEV_HOST;
// 打印
console.log(`mode:${mode} api_url:${BASE_URL} SSR:${isSSR} platform: ${platform}`);
export default defineNuxtConfig({
  ssr: false,
  router: {
    options: {
      scrollBehaviorType: "smooth",
    },
  },
  future: {
    compatibilityVersion: 4,
    typescriptBundlerResolution: true, // https://nuxtjs.org.cn/docs/guide/going-further/features#typescriptbundlerresolution
  },
  runtimeConfig: {
    public: {
      baseUrl: BASE_URL,
      mode,
      version,
      isMobile,
    },
  },
  apollo: {
    autoImports: true,
    authType: "Bearer",
    authHeader: "Authorization",
    tokenStorage: "cookie",
    proxyCookies: true,
    clients: {
      default: {
        httpEndpoint: GQL_HOST,
      },
    },
  },
  build: {
    transpile: ["popperjs/core", "resize-detector"],
    analyze: {
      analyzerMode: "static", // or other configurations
      reportFilename: "report.html",
    },
  },
  // Loading status in spa case. The web side uses "./app/spa-loading-template.html" and the desktop side uses "./app/desktop-loading-template.html"  spaLoadingTemplate: './app/spa-loading-template.html',
  // Modules
  modules: [
    // Tools
    "@vueuse/nuxt",
    "@nuxtjs/color-mode",
    // UI
    "@element-plus/nuxt",
    "@formkit/auto-animate/nuxt",
    "@unocss/nuxt", // Base
    "@pinia/nuxt", // State Management
    "pinia-plugin-persistedstate/nuxt",
    "@nuxt/eslint",
    "@nuxtjs/apollo",
    "@nuxtjs/i18n",
  ],

  // https://i18n.nuxtjs.org/docs/getting-started/usage
  i18n: {
    defaultLocale: "en",
    strategy: "no_prefix",
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "zh", name: "简体中文", file: "zh.json" },
      { code: "vi", name: "Tiếng Việt", file: "vi.json" },
    ],
    bundle: {
      // https://github.com/nuxt-modules/i18n/issues/3238#issuecomment-2672492536
      optimizeTranslationDirective: false,
    },
  },
  srcDir: "",
  rootDir: "",
  app: {
    // pageTransition: { name: "page", mode: "out-in" },
    // layoutTransition: { name: "layout", mode: "out-in" },
    head: {
      title: `${appName}✨`,
      viewport: "width=device-width,initial-scale=1",
      // Website header information
      link: [
        { rel: "icon", href: "/logo.png", sizes: "any" },
        { rel: "apple-touch-icon", href: "/logo.png" },
      ],
      // Website meta information
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
        { name: "description", content: appDescription },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ],
    },
  },

  // https://blog.csdn.net/weixin_42553583/article/details/131372309
  experimental: {
    // https://nuxt.com.cn/docs/guide/going-further/experimental-features#inlinerouterules
    inlineRouteRules: true,
    payloadExtraction: false,
    renderJsonPayloads: true, //
    emitRouteChunkError: false, // https://nuxt.com.cn/docs/getting-started/error-handling#js-chunk-%E9%94%99%E8%AF%AF
    // viewTransition: true, // Support View Transition API Chorme111 https://blog.csdn.net/weixin_42553583/article/details/130474259
    crossOriginPrefetch: true, // Use the Speculation Rules API to enable cross-origin prefetching.
    watcher: "parcel", // Use Parcel as a file watcher.
    treeshakeClientOnly: true, // Enable treeshaking only for client-side bundling.
    noVueServer: true, // Disable Vue Server Renderer.
  },
  routeRules: {
    "/": { prerender: true },
    "/login": { prerender: true },
  },

  // Automatic import
  imports: {
    dirs: [
      // Scan top-level modules
      "composables/**",
      "types/**",
    ],
  },

  // css
  css: ["@/assets/styles/init.scss", "@/assets/styles/index.scss", "@/assets/styles/animate.scss"],
  // alias: {
  //   "~": "/<srcDir>",
  //   "@": "/<srcDir>",
  //   "~~": "/<rootDir>",
  //   "@@": "/<rootDir>",
  //   "assets": "/<srcDir>/assets",
  //   "public": "/<srcDir>/public",
  // },
  colorMode: {
    classSuffix: "",
  },
  // 3、elementPlus
  elementPlus: {
    icon: "ElIcon",
    importStyle: "scss",
    themes: ["dark"],
    defaultLocale: "en",
  },
  // pwa
  // pwa,
  devServer: { host: host || "localhost" },
  // nuxt开发者工具
  devtools: {
    enabled: true,
  },
  // hooks: {
  //   "vite:extend": function ({ config }) {
  //     if (config.server && config.server.hmr && config.server.hmr !== true) {
  //       config.server.hmr.protocol = "ws";
  //       config.server.hmr.host = "192.168.31.14";
  //       config.server.hmr.port = 3000;
  //     }
  //   },
  // },
  // vite
  vite: {
    // Better support for Tauri command output
    clearScreen: false,
    // Other environment variables can be found on the following webpages:https://v2.tauri.app/reference/environment-variables/
    envPrefix: ["VITE_", "TAURI_"],
    server: {
      // Tauri needs a certain port
      strictPort: true,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      // hmr: {
      //   host: "192.168.31.14",
      //   port: 3000,
      //   protocol: "ws",
      // }, // Hot Update
      // watch: {
      //   ignored: [
      //     "**/src-tauri/**",
      //     "**/node_modules/**",
      //     "**/dist/**",
      //     "**/.git/**",
      //     "**/.nuxt/**",
      //     "**/public/**",
      //     "**/.output/**",
      //   ],
      // },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api"],
          additionalData: `
          @use "@/assets/styles/element/index.scss" as element;
          @use "@/assets/styles/element/dark.scss" as dark;
          @use "@/assets/styles/var.scss" as *;
          `,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {},
        },
        // external: ["workbox-build"],
      },
    },
  },
  typescript: {
    typeCheck: true,
  },
  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: false,
      },
    },
  },
  compatibilityDate: "2025-04-22",
});
