import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import html from '@rollup/plugin-html';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    open: false
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=bilibili.com',
        namespace: 'npm/vite-plugin-monkey',
        match: ['https://www.bilibili.com/bangumi/*'],
        noframes: true,
        "run-at": 'document-end'
      },
    }),
    html(),
  ],
});