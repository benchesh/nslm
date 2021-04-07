#!/bin/sh

path="$1"
while [[ -L ${path} && "$(ls -l "${path}")" =~ -\>\ (.*) ]]; do
    path="${BASH_REMATCH[1]}"
    cd "$PWD/$1/.."
    cd "${BASH_REMATCH[1]}"
    pwd
    break
done
