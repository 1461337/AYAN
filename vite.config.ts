import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 项目页部署在子路径 /AYAN/ 下；本地开发仍使用根路径
  base: command === 'build' ? '/AYAN/' : '/',
  plugins: [react()],
}))
