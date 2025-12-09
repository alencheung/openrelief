#!/usr/bin/env sh
# Husky runner script
if [ -z "$husky_skip_init" ]; then
  echo "husky: skip init"
  exit 0
fi

# Execute the command directly
exec "$@"