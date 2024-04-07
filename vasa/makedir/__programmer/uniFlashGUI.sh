#!/bin/bash

# directory of script
SCRIPT=$(readlink -f "$0")
SCRIPT_PATH=$(dirname "$SCRIPT")

"$SCRIPT_PATH/node-webkit/nw" "$SCRIPT_PATH"
