# pulumi-resource-transcend

Source tree for the Node.js Pulumi resource plugin (`pulumi plugin install resource transcend`). This folder is **not** published to npm; `scripts/pack-plugin.mjs` copies it into a platform tarball with compiled `dist/plugin` output.

`package.json` lists only the runtime dependencies needed inside the installed plugin (`@grpc/grpc-js`, `@pulumi/pulumi`). When packing, the script generates `npm-shrinkwrap.json` in the staging directory so Pulumi’s plugin install gets a pinned dependency tree. The shrinkwrap is **not** checked into git (regenerate it whenever those dependencies change by running `node scripts/pack-plugin.mjs`).
