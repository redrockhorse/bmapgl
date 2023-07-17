// rollup.config.js
import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';
import obfuscator from 'rollup-plugin-obfuscator';
export default [{
  input: 'src/bmap.ts',
  external: ['echarts'],
  output: {
    file: 'dist/bmap.min.js',
    format: 'umd',
    name: "bmap",
    globals: {
      echarts: 'echarts'
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
},{
  input: 'src/bmap.ts',
  external: ['echarts'],
  output: {
    file: 'test/bmap.min.js',
    format: 'umd',
    name: "bmap",
    globals: {
      echarts: 'echarts'
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
}];