import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    const serverConfig: any = {
        host: '0.0.0.0',
        port: 3000,
        strictPort: true,
    };

    return {
        plugins: [react()],
        server: serverConfig,
        preview: {
            host: '0.0.0.0',
            port: 3000,
        },
    };
});
