import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        outDir: 'upload-ready',
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:5298',
                changeOrigin: true,
            },
        },
        watch: {
            ignored: ['**/.vs/**'],
        },
    },
});
