import path from 'path';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  root: path.resolve(__dirname, 'src'), // Set the root to your source directory
  plugins: [
    createHtmlPlugin({
      inject: true,
      template: path.resolve(__dirname, 'src/templates/index.html'),
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    rollupOptions: {
      input: path.resolve(__dirname, 'src/script/index.ts'),
      output: {
        entryFileNames: '[name].[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/script'),
    },
    extensions: ['.tsx', '.ts', '.js'],
  },
  server: {
    port: 9000,
  },
});
