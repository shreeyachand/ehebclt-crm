# Adapted from https://github.com/muchobien/pocketbase-docker
FROM alpine:3.24.1

ARG POCKETBASE_VERSION=0.39.8

RUN apk add --no-cache ca-certificates tzdata wget unzip \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip" -O /tmp/pocketbase.zip \
    && unzip /tmp/pocketbase.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/pocketbase \
    && rm -f /tmp/pocketbase.zip \
    && addgroup -S pocketbase \
    && adduser -S -G pocketbase pocketbase

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER pocketbase

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
