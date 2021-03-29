#!/bin/sh

if [[ -f "$(dirname "$0")/commands/$1.sh" ]]; then
    source "$(dirname "$0")/commands/$1.sh"
else
    echo "Invalid snoke command!"
fi
