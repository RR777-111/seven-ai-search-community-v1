# Third-party notices

This repository distributes the Seven AI Search Community application source and configuration. The project-owned portions are licensed under the root [MIT LICENSE](LICENSE), Copyright (c) 2026 绿藻头. External software retains its own licenses; the project license does not relicense it.

## Included source and generated scaffolding

The source tree contains no vendored PanSou Go source, image layers, npm tarballs, pnpm archive, standalone third-party image/font assets, or search-result resources. Dependency manifests and a lockfile reference software that recipients obtain separately. The inline application graphics are covered as part of the project software; independent brand and endorsement rights are addressed in the README without restricting the MIT software grant.

`apps/web/next-env.d.ts` is Next.js-generated type-reference scaffolding. Its generated comments are retained. For attribution, the license of the referenced Next.js 16.2.12 is reproduced below from [the versioned upstream license](https://github.com/vercel/next.js/blob/v16.2.12/license.md).

### Next.js

The MIT License (MIT)

Copyright (c) 2025 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## External search interface

The project contains its own HTTP adapter for a PanSou-compatible `POST /api/search` endpoint. Current Compose configuration requires an operator-supplied endpoint and does not download or launch PanSou. No PanSou code, official image, service subscription, search index, or result resource is included.

The referenced PanSou source at [commit 221665fb2c9279f22af4684ea2d8c0c331eac1cc](https://github.com/fish2018/pansou/tree/221665fb2c9279f22af4684ea2d8c0c331eac1cc) carries an [MIT license](https://github.com/fish2018/pansou/blob/221665fb2c9279f22af4684ea2d8c0c331eac1cc/LICENSE), Copyright (c) 2025 fish2018. This is attribution to an external API ecosystem, not a claim that this repository redistributes that source or that all official image/service terms and commercial teaching uses have been clarified. Operators must verify the terms for whatever implementation or service they choose. Earlier Git history contains an official-image configuration reference, not image bytes; that configuration is superseded and is not the current recommended setup.

## Build and runtime dependencies obtained separately

The manifests and lockfile specify exact npm package versions, including Next.js, React, NestJS, Tailwind CSS and ioredis. The Dockerfile references Node and downloads pnpm; Compose references Redis. Their respective packages, binaries, image layers and licenses are supplied by their upstream distributors when installed. They are not bundled in this source repository.

Relevant upstream projects: [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [NestJS](https://github.com/nestjs/nest), [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss), [ioredis](https://github.com/redis/ioredis), [pnpm](https://github.com/pnpm/pnpm), [Node Docker images](https://github.com/nodejs/docker-node), and [Redis](https://github.com/redis/redis).

This source-only notice is not an inventory or clearance for a complete built image. Redis uses a version tag in Compose, and transitive/native dependencies can have additional licenses. Anyone distributing built images or dependency bundles must inspect the actual versions and contents and provide their required notices and other materials. This release does not distribute such images or claim those obligations have already been completed.

Search-result titles and links do not grant permission to copy, host or redistribute the linked material. Teaching, video and community-service materials are not included in this repository.
