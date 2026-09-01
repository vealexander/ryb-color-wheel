import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/ryb-color-wheel/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "logo.svg",
        "apple-touch-icon-180x180.png",
      ],
      manifest: {
        name: "RYB Color Wheel",
        short_name: "RYB Wheel",
        description:
          "Interactive traditional artist color wheel with rotatable harmony schemes.",
        theme_color: "#0f0e0b",
        background_color: "#0f0e0b",
        display: "standalone",
        orientation: "any",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
