#!/usr/bin/env sh
set -e

DEFAULT_SERVE_ARGS="serve --http=0.0.0.0:8090 --dir=/pb_data --migrationsDir=/pb_migrations --hooksDir=/pb_hooks"

if [ $# -eq 0 ]; then
    exec /usr/local/bin/pocketbase $DEFAULT_SERVE_ARGS
fi

case "$1" in
    --help|-h|--version|-v)
        exec /usr/local/bin/pocketbase "$@"
        ;;
esac

if [ "${1#-}" != "$1" ]; then
    exec /usr/local/bin/pocketbase $DEFAULT_SERVE_ARGS "$@"
fi

exec /usr/local/bin/pocketbase "$@"
