import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173
    },
    resolve: {
        alias: {
            'identity': path.resolve(__dirname, '../packages/identity'),
            'ens-integration': path.resolve(__dirname, '../packages/ens-integration'),
            'yellow-integration': path.resolve(__dirname, '../packages/yellow-integration'),
            'core': path.resolve(__dirname, '../packages/core'),
            'crypto': 'crypto-browserify',
            'stream': 'stream-browserify',
            'buffer': 'buffer'
        }
    },
    define: {
        'global': 'globalThis',
        'process.env': {}
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis'
            }
        }
    }
})
