#!/bin/sh

mkdir -p "$2"

if [[ ! -L "$1" ]]; then
    mv "$1" "$2"
fi
