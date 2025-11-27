// import { defineConfig } from "vite"
// import react from "@vitejs/plugin-react"
// import path from "node:path"
// import { fileURLToPath } from "node:url"

// const __dirname = path.dirname(fileURLToPath(import.meta.url))

// export default defineConfig({
//   plugins: [react()]
// })
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,            // or "0.0.0.0" – allow access from outside container
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,    // <— key for Docker: use polling instead of inotify
      interval: 100        // you can lower to 50 if you want faster reloads
    },
    // Optional but sometimes needed if HMR has issues:
    // hmr: {
    //   clientPort: 5173,
    // },
  },
})

