#!/usr/bin/env bash

BASE_DIR="./build/"
PROGRAMMER="./makedir/__programmer/dslite.sh"
PROGRAMMER_CCXML="./makedir/__ccxml/f28379d.ccxml"
PROJ_NAME="vasa"

# Uncomment for dual cpu (/*dual cpu doesnt work */)
#
# cpu_cores=()
# core_cnt=0
# 
# while IFS= read -r line || [[ -n "$line" ]]; do
#   if [[ "$line" =~ 28xx ]]; then
#     core_number=$(echo "$line" | grep -o '^[0-9]\+')
#     cpu_cores+=("$core_number")
#     ((core_cnt++))
#     if [ "$core_cnt" -eq 2 ]; then
#       break
#     fi
#   fi
# done < <("$PROGRAMMER" --config="$PROGRAMMER_CCXML" -N | tee /dev/tty)

cpu_cores=("0")

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
        --config="$PROGRAMMER_CCXML" \
        --core="$core" \
        --verbose \
        "build/cpu$core/$PROJ_NAME.out"
done

