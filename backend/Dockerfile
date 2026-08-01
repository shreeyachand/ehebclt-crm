# Adapted from https://github.com/muchobien/pocketbase-docker
FROM alpine:3.24.1

ARG POCKETBASE_VERSION=0.39.8

RUN apk add --no-cache ca-certificates tzdata wget unzip \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/checksums.txt" -O /tmp/checksums.txt \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip" -O /tmp/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip \
    && grep "pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip$" /tmp/checksums.txt > /tmp/checksums-filtered.txt \
    && ( cd /tmp && sha256sum -c checksums-filtered.txt ) \
    && unzip /tmp/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/pocketbase \
    && rm -f /tmp/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip /tmp/checksums.txt /tmp/checksums-filtered.txt \
    && addgroup -S pocketbase \
    && adduser -S -G pocketbase pocketbase

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER pocketbase

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
