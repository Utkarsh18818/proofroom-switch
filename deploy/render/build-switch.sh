#!/usr/bin/env bash
set -euo pipefail
pin=12c48336dd37a18c70f3e8ccec0807ada452407d
mkdir -p .render
if [ ! -d .render/switch/.git ]; then git clone --depth 1 --no-checkout https://github.com/sandbox-quantum/switch.git .render/switch; fi
git -C .render/switch fetch --depth 1 origin "$pin"
git -C .render/switch checkout --detach "$pin"
python -m pip install uv==0.13.7
uv sync --project .render/switch/core --no-dev --locked
SWITCH_SOURCE_ROOT="$PWD/.render/switch" python runtime/apply-gateway-ui.py
npm --prefix .render/switch/gateway ci --no-audit --no-fund
npm --prefix .render/switch/gateway run build
