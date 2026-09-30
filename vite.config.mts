import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
export default defineConfig({plugins:[react()],resolve:{alias:{'@':resolve(root)}},server:{host:'0.0.0.0',port:8081,strictPort:true},preview:{host:'0.0.0.0',port:8081,strictPort:true}});
