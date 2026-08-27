import { register } from 'node:module';

register(new URL('./asset-stub-loader.mjs', import.meta.url));
