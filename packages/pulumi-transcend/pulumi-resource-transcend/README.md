# pulumi-resource-transcend

Source tree for the Node.js Pulumi resource plugin (`pulumi plugin install resource transcend`). This folder is **not** published to npm; `scripts/pack-plugin.mjs` copies it into a platform tarball with compiled `dist/plugin` output.

`package.json` lists only the runtime dependencies needed inside the installed plugin (`@grpc/grpc-js`, `@pulumi/pulumi`). The committed `npm-shrinkwrap.json` pins their full dependency tree, so Pulumi's plugin install gets the same reviewed versions on every machine. After changing those dependencies, run `node scripts/update-plugin-shrinkwrap.mjs` and commit the result. Packing fails when the shrinkwrap is missing or does not match `package.json`.
