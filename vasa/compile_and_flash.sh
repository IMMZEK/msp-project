#!/usr/bin/env bash

BASE_DIR="./build/"
PROGRAMMER="./makedir/__programmer/dslite.sh"
PROGRAMMER_CCXML="./makedir/__ccxml/f28379d.ccxml"
PROJ_NAME="vasa"

cpu_cores=()
core_cnt=0

while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" =~ 28xx ]]; then
    core_number=$(echo "$line" | grep -o '^[0-9]\+')
    cpu_cores+=("$core_number")
    ((core_cnt++))
    if [ "$core_cnt" -eq 2 ]; then
      break
    fi
  fi
done < <("$PROGRAMMER" --flash --config=makedir/__ccxml/f28379d.ccxml -N | tee /dev/tty)

for core in "${cpu_cores[@]}"; do
    echo "Compiling for CPU$core..."
    make CPU_CORE=$core
    if [ $? -eq 0 ]; then
        echo "Successfully compiled for CPU$core."
    else
        echo "Compiling failed for CPU$core. Exiting..."
        exit 1
    fi
    "$PROGRAMMER" --flash \
        --config=makedir/__ccxml/f28379d.ccxml \
        --core "$core" \
        "build/cpu$core/vasa.out"
done

