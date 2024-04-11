#!/bin/sh

scripting_dir=$(cd -- "$(dirname -- "$0")" && pwd)
"${scripting_dir}/../ccs_base/cloudagent/node" "${scripting_dir}/launcher.mjs" "$@"
