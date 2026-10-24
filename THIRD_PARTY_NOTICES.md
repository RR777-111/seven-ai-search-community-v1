# Third-party notices

This repository distributes Seven AI Search Community source and configuration. The v1.0.1 candidate also publishes prebuilt Web, API and PanSou container images from the same Dockerfiles. The project-owned portions are licensed under the root [MIT LICENSE](LICENSE), Copyright (c) 2026 绿藻头. External software retains its own licenses; the project license does not relicense it.

## Included source and generated scaffolding

The source tree contains the application, build/Compose integration and adapted PanSou Go module manifests. The Git source archive does not bundle a PanSou source archive, executable, container layers, npm tarballs, pnpm archive, standalone third-party image/font assets, or search-result resources. The separate GHCR images do contain their built application binaries and dependencies. The build downloads the checksum-verified upstream source and locked dependencies. External components retain their own licenses.

`apps/web/next-env.d.ts` is Next.js-generated type-reference scaffolding. Its generated comments are retained. For attribution, the license of the referenced Next.js 16.2.12 is reproduced below from [the versioned upstream license](https://github.com/vercel/next.js/blob/v16.2.12/license.md).

### Next.js

The MIT License (MIT)

Copyright (c) 2025 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Source-built PanSou service

The adapter calls the included Compose service at `POST /api/search` by default; an external endpoint is an optional operator override. `docker/pansou.Dockerfile` fetches [PanSou commit 221665fb2c9279f22af4684ea2d8c0c331eac1cc](https://github.com/fish2018/pansou/tree/221665fb2c9279f22af4684ea2d8c0c331eac1cc), checks archive SHA256 `f1476c92c7dc9a5bc04836ef36d48993bdea93e37a2032823f1fc08ee533d3fa`, and compiles it locally. It never pulls the official PanSou application image. A local one-line change to `util/regex_util.go` allows hyphens and underscores in Xunlei share IDs, preventing spurious truncated links; `docker/pansou-xunlei-id_test.go` tests complete URL preservation and actual Telegram message parsing during the build. Other upstream search source is unchanged. The adapted manifests pin Sonic 1.15.4 and required transitive versions for Go 1.27.3 compatibility; [Sonic 1.15.4 requirements](https://github.com/bytedance/sonic/blob/v1.15.4/README.md) include Go 1.27.

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

## Prebuilt images and runtime dependencies

The manifests and lockfile specify exact npm package versions, including Next.js, React, NestJS, Tailwind CSS and ioredis. The Dockerfile references Node and downloads pnpm; Compose references Redis. The Web and API images include their locked Node dependencies and the packages' retained license files under `/app/node_modules/.pnpm`; both images copy this notice and the project MIT license to `/usr/share/licenses/community`. The PanSou image also copies them there and retains upstream Go and module notices under `/usr/share/licenses/pansou`. The reachable compressed-request parser issue [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) is addressed by a lockfile override to body-parser 2.4.0; other existing advisories and test boundaries are recorded in the README.

Relevant upstream projects: [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [NestJS](https://github.com/nestjs/nest), [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss), [ioredis](https://github.com/redis/ioredis), [pnpm](https://github.com/pnpm/pnpm), [Node Docker images](https://github.com/nodejs/docker-node), and [Redis](https://github.com/redis/redis).

The Node dependency audit of the ARM64 candidate image (`pnpm licenses list --json`) included MIT, Apache-2.0, BSD, ISC, 0BSD, Python-2.0, CC-BY-4.0, MPL-2.0 and LGPL-3.0-or-later declarations. In particular, `@img/sharp-libvips-linuxmusl-arm64@1.2.4` (and the lockfile's x64 counterpart) carries prebuilt libvips and libraries under LGPL and other terms. The package's [versioned build scripts and source instructions](https://github.com/lovell/sharp-libvips/tree/v1.2.4) and [versioned third-party notices](https://github.com/lovell/sharp-libvips/blob/v1.2.4/THIRD-PARTY-NOTICES.md) identify those libraries; [libvips source](https://github.com/libvips/libvips/tree/v8.17.3) is available upstream. Copies of the upstream notices and the GPLv3/LGPLv3 texts are included under `licenses/` in this repository and `/usr/share/licenses/community/third-party/` in the three images. `lightningcss@1.32.0` and its native package declare [MPL-2.0](https://github.com/parcel-bundler/lightningcss/blob/v1.32.0/LICENSE); `caniuse-lite@1.0.30001805` declares [CC-BY-4.0](https://github.com/browserslist/caniuse-lite/blob/1.0.30001805/LICENSE). These are upstream software and data, not Community-owned MIT code; no changes were made to them. The prebuilt images are not represented as a blanket MIT-licensed stack.

The Compose file points to the upstream Redis image by immutable digest; Community does not republish Redis. The ARM64 installation test ran Redis 7.4.11. Its [versioned license](https://github.com/redis/redis/blob/7.4.11/LICENSE.txt) offers the operator a choice of RSALv2 or SSPLv1, rather than MIT. This configuration uses Redis privately as an application backend, not as a separately offered database service. Base OS packages, native dependencies, and third-party indexes retain their own terms. The notices and source links identify material obligations; they do not substitute for a legal review of every binary or grant rights over indexed resources.

Search-result titles and links do not grant permission to copy, host or redistribute the linked material. Teaching, video and community-service materials are not included in this repository.
