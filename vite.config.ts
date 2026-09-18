import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // GitHub Pages 项目页部署在子路径 /AYAN/ 下；本地开发/测试仍使用根路径，
  // 生产模式同时覆盖 build 与 preview，保证本地预览路径与线上一致
  base: mode === 'production' ? '/AYAN/' : '/',
  plugins: [react()],
}))
