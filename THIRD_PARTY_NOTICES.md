# Third-party notices

This repository distributes the Seven AI Search Community application source and configuration. The project-owned portions are licensed under the root [MIT LICENSE](LICENSE), Copyright (c) 2026 绿藻头. External software retains its own licenses; the project license does not relicense it.

## Included source and generated scaffolding

The source tree contains the application, build/Compose integration and adapted PanSou Go module manifests. It does not bundle a PanSou source archive, executable, prebuilt image, npm tarballs, pnpm archive, standalone third-party image/font assets, or search-result resources. The build downloads the checksum-verified upstream source and locked dependencies. External components retain their own licenses.

`apps/web/next-env.d.ts` is Next.js-generated type-reference scaffolding. Its generated comments are retained. For attribution, the license of the referenced Next.js 16.2.12 is reproduced below from [the versioned upstream license](https://github.com/vercel/next.js/blob/v16.2.12/license.md).

### Next.js

The MIT License (MIT)

Copyright (c) 2025 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Source-built PanSou service

The adapter calls the included Compose service at `POST /api/search` by default; an external endpoint is an optional operator override. `docker/pansou.Dockerfile` fetches [PanSou commit 221665fb2c9279f22af4684ea2d8c0c331eac1cc](https://github.com/fish2018/pansou/tree/221665fb2c9279f22af4684ea2d8c0c331eac1cc), checks archive SHA256 `f1476c92c7dc9a5bc04836ef36d48993bdea93e37a2032823f1fc08ee533d3fa`, and compiles it locally. It never pulls the official PanSou application image. Upstream search source is unchanged. The adapted manifests pin Sonic 1.15.4 and required transitive versions for Go 1.27.3 compatibility; [Sonic 1.15.4 requirements](https://github.com/bytedance/sonic/blob/v1.15.4/README.md) include Go 1.27.

The pinned PanSou LICENSE and README explicitly specify MIT. The upstream repository About separately asks against profit-making use. This integration relies on the fixed source license; it does not claim clearance of upstream prebuilt-image/service terms, paid teaching/support arrangements, source websites' service conditions, or indexed material. The non-profit reminder's application to commercial companion offerings remains an upstream-clarification question; no external consultation was sent. Do not treat the application's own MIT license as a grant over those separate subjects.

The build retains PanSou's license, Go's license/patent text, adapted `go.mod`/`go.sum`, and license/notice files from downloaded Go modules under `/usr/share/licenses/pansou`. A test of the actual ARM64 binary found 30 linked dependency modules, each with a corresponding copied license directory. This checks presence, not legal ownership of every upstream contribution. The full pinned PanSou license is reproduced here:

MIT License

Copyright (c) 2025 fish2018

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Build and runtime dependencies obtained separately

The manifests and lockfile specify exact npm package versions, including Next.js, React, NestJS, Tailwind CSS and ioredis. The Dockerfile references Node and downloads pnpm; Compose references Redis. Their respective packages, binaries, image layers and licenses are supplied by their upstream distributors when installed. The reachable compressed-request parser issue [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) is addressed by a lockfile override to body-parser 2.4.0; other existing advisories and test boundaries are recorded in the README. They are not bundled in this source repository.

Relevant upstream projects: [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [NestJS](https://github.com/nestjs/nest), [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss), [ioredis](https://github.com/redis/ioredis), [pnpm](https://github.com/pnpm/pnpm), [Node Docker images](https://github.com/nodejs/docker-node), and [Redis](https://github.com/redis/redis).

This source-only notice is not an inventory or clearance for a complete built image. Redis uses a version tag in Compose; the tested image ran Redis 7.4.9. That release is available under the operator's choice of [RSALv2 or SSPLv1](https://github.com/redis/redis/blob/7.4.9/LICENSE.txt), rather than MIT. The bundled configuration uses Redis privately as an application backend, not as a separately offered Redis database service; operators must follow their chosen license, especially before redistribution or offering database services. Transitive/native dependencies and base OS packages can have additional licenses. Anyone distributing built images or dependency bundles must inspect the actual versions and contents and provide their required notices and other materials. This release does not distribute such images or claim those obligations have already been completed.

Search-result titles and links do not grant permission to copy, host or redistribute the linked material. Teaching, video and community-service materials are not included in this repository.
