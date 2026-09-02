import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".."]
    },
    allowedHosts: [".onrender.com"]
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: [".onrender.com"]
  }
});
