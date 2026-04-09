export default defineConfig(({ mode }) => ({
  // Only use the nested base path if we are in production (GitHub Pages)
  base: mode === 'production' ? '/Tablers/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
      }
    }
  }
}))
