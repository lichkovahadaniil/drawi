#!/bin/sh
set -eu

if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "" | "#"*) continue ;;
    esac

    key=${line%%=*}
    value=${line#*=}
    case "$key" in
      "" | *[!A-Za-z0-9_]* | "$line") continue ;;
    esac

    if ! eval "[ \"\${$key+x}\" ]"; then
      export "$key=$value"
    fi
  done < .env
fi

if [ "${NODE_ENV:-}" = "development" ]; then
  unset NODE_ENV
fi

exec "$@"
