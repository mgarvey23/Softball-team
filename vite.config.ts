import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The base path is set for GitHub Pages project sites, where the app is served
// from https://<user>.github.io/<repo>/. The deploy workflow passes BASE_PATH
// automatically from the repo name; override it here if you use a custom domain.
const base = process.env.BASE_PATH ?? '/softball-team/';

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    rollupOptions: {
      output: {
        // Split the heavy Firebase SDK into its own chunk so it caches
        // independently of app code between deploys.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
