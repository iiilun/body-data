#!/bin/zsh
cd "${0:A:h}"
for body_data_node in "$(command -v node)" /opt/homebrew/bin/node /usr/local/bin/node /Users/markhung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node; do
  if [[ -n "$body_data_node" && -x "$body_data_node" ]]; then
    (sleep 1; open 'http://localhost:5173') &
    exec "$body_data_node" scripts/serve.mjs
  fi
done
echo 'Please install Node.js 20 or newer from https://nodejs.org, then open this file again.'
read -r
