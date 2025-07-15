import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(() => {
    const useHttps = process.env.HTTPS === 'true';
    const certPath = process.env.SSL_CRT_FILE;
    const keyPath = process.env.SSL_KEY_FILE;

    console.log(`Using HTTPS: ${useHttps}`);
    console.log(`Cert Path: ${certPath}`);
    console.log(`Key Path: ${keyPath}`);

    const serverConfig: any = {
        host: '0.0.0.0', // Listen on all network interfaces for LAN access
        port: 3000,
        strictPort: true,
    };

    // Add HTTPS configuration if enabled
    if (useHttps && certPath && keyPath) {
        try {
            serverConfig.https = {
                cert: fs.readFileSync(path.resolve(certPath)),
                key: fs.readFileSync(path.resolve(keyPath)),
            };
            console.log('HTTPS configuration loaded successfully');
        } catch (error) {
            console.error('Error loading SSL certificates:', error);
            console.log('Falling back to HTTP');
        }
    }

    return {
        plugins: [react()],
        server: serverConfig,
        preview: {
            host: '0.0.0.0',
            port: 3000,
        },
    };
});
