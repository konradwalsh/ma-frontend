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
          // Translations: the @intlify unplugin's `messages` virtual module
          // bundles ALL locale JSON files (~2.2 MB raw) eagerly. Vite tags it
          // as a `virtual:` ID. Splitting it into its own chunk pulls 2 MB+
          // of translation strings OUT of the main app bundle (Streamloader
          // bundle-split BBB3, the dominant single-file payload reduction).
          if (
            id.includes("@intlify/unplugin-vue-i18n/messages") ||
            id.includes("intlify_unplugin-vue-i18n_messages") ||
            id.includes("/src/translations/") ||
            id.includes("\\src\\translations\\")
          )
            return "translations";
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
