import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()
const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_HASH__: JSON.stringify(commitHash),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
})
