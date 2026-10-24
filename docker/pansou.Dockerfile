FROM --platform=$BUILDPLATFORM golang:1.27.3-alpine AS build
WORKDIR /src
# Fetch source, never the upstream's prebuilt image. Fail if its bytes change.
ADD --checksum=sha256:f1476c92c7dc9a5bc04836ef36d48993bdea93e37a2032823f1fc08ee533d3fa https://codeload.github.com/fish2018/pansou/tar.gz/221665fb2c9279f22af4684ea2d8c0c331eac1cc /tmp/pansou.tar.gz
RUN tar -xzf /tmp/pansou.tar.gz --strip-components=1
# Build compatibility only: Sonic 1.14.0 does not compile on supported Go 1.27.
# These manifests pin Sonic 1.15.4 and its required transitive updates.
COPY docker/pansou-go.mod ./go.mod
COPY docker/pansou-go.sum ./go.sum
RUN go mod download && go mod verify
# Local parser fix: preserve '-' and '_' in Xunlei share IDs; do not invent links.
COPY docker/pansou-xunlei-id_test.go ./util/community_xunlei_id_test.go
RUN sed -i '/^var XunleiPanPattern =/s/\[a-zA-Z0-9\]+/[a-zA-Z0-9_-]+/' util/regex_util.go \
    && go test -mod=readonly ./util
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -mod=readonly -trimpath -ldflags='-s -w' -o /out/pansou .
# Retain upstream and Go/module license texts in the locally built runtime.
RUN mkdir -p /notices/go /notices/modules \
    && cp LICENSE /notices/PanSou-LICENSE \
    && cp go.mod go.sum /notices/ \
    && cp /usr/local/go/LICENSE /usr/local/go/PATENTS /notices/go/ \
    && find /go/pkg/mod -type f \( -iname 'license*' -o -iname 'copying*' -o -iname 'notice*' -o -iname 'patents*' \) \
       -exec sh -c 'for f do dest=/notices/modules/${f#/go/pkg/mod/}; mkdir -p "$(dirname "$dest")"; cp "$f" "$dest"; done' sh {} +

FROM alpine:3.23
RUN apk add --no-cache ca-certificates tzdata \
    && mkdir -p /app/cache && chown -R 10001:10001 /app
COPY --from=build /out/pansou /app/pansou
COPY --from=build /notices /usr/share/licenses/pansou
COPY LICENSE THIRD_PARTY_NOTICES.md /usr/share/licenses/community/
COPY licenses/ /usr/share/licenses/community/third-party/
LABEL org.opencontainers.image.source="https://github.com/fish2018/pansou" \
      org.opencontainers.image.revision="221665fb2c9279f22af4684ea2d8c0c331eac1cc" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
USER 10001:10001
ENV PORT=8888 CACHE_PATH=/app/cache AUTH_ENABLED=false
EXPOSE 8888
CMD ["/app/pansou"]
