import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3002",
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router-dom") || id.includes("react-dom") || id.match(/[\\/]react[\\/]/)) {
              return "react-vendor";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "recharts";
            }
            if (id.includes("@tanstack/react-query")) {
              return "react-query";
            }
            if (id.includes("react-markdown") || id.includes("remark-") || id.includes("micromark") || id.includes("mdast") || id.includes("unist")) {
              return "markdown";
            }
          }
          return undefined;
        },
      },
    },
  },
});
