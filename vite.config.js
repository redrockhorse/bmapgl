import { defineConfig } from 'vite'
import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';
import obfuscator from 'rollup-plugin-obfuscator';
export default defineConfig({
  base: './',
  build: {
    target: 'umd',
    rollupOptions: {
      input: 'src/bmap.ts',
      external: ['echarts'],
      output: {
        file: 'dist/bmap.min.js',
        format: 'umd',
        name: "bmap",
        globals: {
          echarts: 'echarts',
        }
      },
      plugins: [
        typescript(),
        obfuscator({
          options: {
          }
        }), 
        terser() 
      ]
    }
  },
  server: {
    watch: {
      include: 'src/**/*',
    },
    hmr: true,
    host: true,
    cors: true,
    port: 4000,
    https: false,
  }
})