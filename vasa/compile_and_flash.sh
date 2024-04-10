#!/usr/bin/env bash

BASE_DIR="./build/"
PROGRAMMER="./makedir/__programmer/dslite.sh"
PROGRAMMER_CCXML="./makedir/__ccxml/f28379d.ccxml"
PROJ_NAME="vasa"

# --- Available Cores ---
# 0: Texas Instruments XDS100v2 USB Debug Probe_0/C28xx_CPU1
# 1: Texas Instruments XDS100v2 USB Debug Probe_0/CPU1_CLA1
# 2: Texas Instruments XDS100v2 USB Debug Probe_0/C28xx_CPU2
# 3: Texas Instruments XDS100v2 USB Debug Probe_0/CPU2_CLA1

CPU_CORES=("0" "2")

for CPU in "${CPU_CORES[@]}"; do
    echo "Compiling for CPU$CPU..."
    make CPU_CORE=$CPU
    if [ $? -eq 0 ]; then
        echo "Successfully compiled for CPU$CPU."
    else
        echo "Compiling failed for CPU$CPU. Exiting..."
        exit 1
    fi
done

for CPU in "${CPU_CORES[@]}"; do
    echo "Flashing for CPU$CPU..."
    make flash CPU_CORE=$CPU
    if [ $? -eq 0 ]; then
        echo "Successfully flashed for CPU$CPU."
    else
        echo "Flashing failed for CPU$CPU. Exiting..."
        exit 1
    fi
done
