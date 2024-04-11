#!/usr/bin/env bash

# Check if .clang-format file exists in the current directory
if [ ! -f .clang-format ]; then
    echo ".clang-format file not found in the base directory."
    exit 1
fi

# Find and format all .h, .c, .cc, and .cpp files using parallel execution
# Exclude directories named 'makedir' and 'tf-msp'
find . \( -type d \( -name "makedir" -o -name "tf-msp" \) -prune \) -o \
    \( -type f \( -name "*.h" -o -name "*.c" -o -name "*.cc" -o -name "*.cpp" \) -print0 \) | \
    xargs -0 -P8 -I {} sh -c 'echo "Formatting {}"; clang-format -i "{}"'

echo "Formatting complete."

