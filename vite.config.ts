/* eslint-disable @typescript-eslint/no-var-requires */
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
import webfontDownload from "vite-plugin-webfont-dl";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    tailwindcss(),
    webfontDownload([
      "https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900&display=swap",
    ]),
    vuetify({
      autoImport: true,
      styles: {
        configFile: "src/styles/settings.scss",
      },
    }),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB
      },
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Streamloader",
        short_name: "Streamloader",
        description:
          "Streamloader is a media library manager (built on Music Assistant) that connects to your streaming services and a wide range of connected speakers.",
        // Streamloader-fork branding: theme_color drives the PWA splash
        // background and Android task-switcher chrome. Aligned with the
        // teal used in favicon.svg / streamloader-mark.svg / index.html so
        // the install + splash experience matches the rest of the brand.
        theme_color: "#0f766e",
        background_color: "#0f766e",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
    VueI18nPlugin({
      include: [path.resolve(__dirname, "./src/translations/**")],
    }),
  ],
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: "./music_assistant_frontend",
    // Bumped: with vendor + dialog/route splits the largest remaining chunk
    // is comfortably under 1 MB. Keep the warning at 1000 so a future
    // regression past 1 MB still trips the build output (Streamloader
    // bundle-split, batch BBB3).
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Translations: i18n.ts now uses import.meta.glob to lazy-load
          // each locale on demand (Streamloader bundle-split, batch ZZZ3).
          // We deliberately do NOT force-merge them into a single chunk
          // anymore — Vite's per-import code-splitting yields one tiny
          // async chunk per locale (~50-100 KB raw each) that is fetched
          // only when the user picks that language. The English baseline
          // is statically imported by i18n.ts so it lands in the entry
          // chunk graph and is always available for the fallback chain.
          // Keep the @intlify unplugin's lingering `messages` virtual
          // module isolated in its own chunk just in case anything still
          // touches it transitively, so it can be tree-shaken away.
          if (
            id.includes("@intlify/unplugin-vue-i18n/messages") ||
            id.includes("intlify_unplugin-vue-i18n_messages")
          )
            return "translations-virtual";
          if (id.includes("node_modules")) {
            if (id.includes("vuetify")) return "vuetify";
            if (id.includes("vue-i18n") || id.includes("@intlify"))
              return "vue-i18n";
            if (id.includes("vue-router")) return "vue-router";
            if (id.includes("@vueuse")) return "vueuse";
            if (id.includes("reka-ui")) return "reka-ui";
            if (id.includes("swiper")) return "swiper";
            if (id.includes("lucide")) return "lucide";
            if (id.includes("colorthief") || id.includes("color/"))
              return "color";
            if (id.includes("@mdi/js") || id.includes("material-design-icons"))
              return "mdi";
            if (id.includes("marked")) return "marked";
            if (id.includes("qrcode")) return "qrcode";
            // Audio-decoder family — large WASM-backed deps used only by the
            // optional in-browser web player. Keep them out of the main vendor
            // bundle so users who never trigger web playback don't pay the
            // download cost on first load (Streamloader bundle-split BBB3).
            if (
              id.includes("libopus-decoder") ||
              id.includes("opus-decoder") ||
              id.includes("vue-audio-better")
            )
              return "audio";
            // QR scanner uses a barcode-detection polyfill that's heavy and
            // only used on the device-pairing flow. Same rationale as audio.
            if (id.includes("vue-qrcode-reader") || id.includes("barcode"))
              return "qrcode-reader";
            // Tanstack table/form ship as standalone medium-size chunks —
            // splitting keeps the table-using settings views from bloating
            // the main bundle.
            if (id.includes("@tanstack")) return "tanstack";
          }
        },
      },
    },
  },
});
