import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon-32.png",
        "apple-touch-icon.png",
        "og-image.jpg",
      ],
      manifest: {
        name: "Sadhana Tracker",
        short_name: "Sadhana",
        description:
          "Record daily japa, reading, and hearing — build consistency in spiritual practice.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fff7ed",
        theme_color: "#ea580c",
        lang: "en-IN",
        categories: ["lifestyle", "productivity"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webmanifest}"],
        navigateFallback: "/index.html",
        // Supabase REST/auth responses are user-specific and must not be cached.
        navigateFallbackDenylist: [/^\/api/, /supabase/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
