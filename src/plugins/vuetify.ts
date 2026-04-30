/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "material-design-icons-iconfont/dist/material-design-icons.css";
import { md } from "vuetify/iconsets/md";
import { aliases as defaultAliases, mdi } from "vuetify/iconsets/mdi";
import "./vuetify.css";

// Composables
import { IconAliases, createVuetify } from "vuetify";

const aliases: IconAliases = {
  ...defaultAliases,
};

export default createVuetify(
  // https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
  {
    icons: {
      defaultSet: "mdi",
      aliases,
      sets: {
        md,
        mdi,
      },
    },
    display: {
      mobileBreakpoint: "md",
      thresholds: {
        xs: 0,
        sm: 340,
        md: 540,
        lg: 800,
        xl: 1280,
      },
    },
    theme: {
      defaultTheme: "dark",
      themes: {
        light: {
          dark: false,
          colors: {
            fg: "#000000",
            background: "#f5f5f5",
            overlay: "#e7e7e7ff",
            panel: "#ffffff",
            default: "#ffffff",
            // Streamloader brand teal — matches the streamloader web UI
            // CSS `--accent` light-mode value (Tailwind teal-700). Bright
            // enough on light backgrounds, dark enough for white text.
            primary: "#0f766e",
          },
        },
        dark: {
          dark: true,
          colors: {
            fg: "#ffffff",
            background: "#181818",
            overlay: "#181818",
            panel: "#232323",
            default: "#000000",
            // Streamloader brand teal-mint — matches the streamloader web
            // UI CSS `--accent` dark-mode value (Tailwind teal-400). The
            // brand is dark-mode-first; this is the canonical streamloader
            // teal users see in the streamloader.konradwalsh.com dashboard.
            primary: "#2dd4bf",
          },
        },
      },
    },
  },
);
