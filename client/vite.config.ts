// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(() => {
    const useHttps = process.env.HTTPS;
    const certPath = process.env.SSL_CRT_FILE;
    const keyPath = process.env.SSL_KEY_FILE;

    console.log(`Using HTTPS: ${process.env.HTTPS }`);
    
    const serverConfig = useHttps
        ? {
            https: {
                cert: fs.readFileSync(path.resolve(certPath)),
                key: fs.readFileSync(path.resolve(keyPath)),
            },
        }
        : {};

    return {
        plugins: [react()],
        server: {
            port: 3000,
            ...serverConfig, // Spread the HTTPS configuration only if needed
        },
    };
});