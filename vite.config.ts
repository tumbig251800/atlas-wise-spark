import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

const analyze = process.env.ANALYZE === "true";

/** Split heavy vendor deps for cache + parallel load (Stage 5). */
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return;

  if (id.includes("recharts")) return "vendor-recharts";
  if (id.includes("xlsx")) return "vendor-xlsx";
  if (id.includes("docx")) return "vendor-docx";
  if (id.includes("react-markdown") || id.includes("micromark") || id.includes("unified")) {
    return "vendor-markdown";
  }
  if (id.includes("@supabase")) return "vendor-supabase";
  if (id.includes("@tanstack")) return "vendor-query";
  if (id.includes("react-router")) return "vendor-router";
  if (id.includes("lucide-react")) return "vendor-icons";
  if (id.includes("react-dom")) return "vendor-react";
  if (id.includes("node_modules/react/") || id.includes("node_modules\\react\\")) {
    return "vendor-react";
  }
  if (id.includes("node_modules/scheduler") || id.includes("node_modules\\scheduler")) {
    return "vendor-react";
  }
  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8080,
    hmr: {
      overlay: false,
    },
    /** ลดโอกาสที่แท็บ/embedded browser โชว์ index.html แคชเก่า (ชื่อแท็บยังเป็น Lovable / UI เก่า) */
    headers: {
      "Cache-Control": "no-store",
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    analyze &&
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
