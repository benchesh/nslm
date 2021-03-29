#!/bin/sh

deleteDirIfIncludesNoFiles() {
    if [[ "$(find $1 -type f -not -path "*.DS_Store")" == "" ]]; then
        echo "Deleting $1"
        rm -r "$1"
    fi
}

echo "Removing snoke..."

if [[ ! -d .snoke ]]; then
    echo ".snoke directory was not found! You have either not used snoke in this directory or have already removed it"
    exit
fi

mkdir -p node_modules

cd .snoke

packages="$(find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.yalc/*")"

SAVEIFS=$IFS         # Save current IFS
IFS=$'\n'            # Change IFS to new line
packages=($packages) # split to array $names
IFS=$SAVEIFS         # Restore IFS

cd ../node_modules

for item in "${packages[@]}"; do
    localpath="$(dirname "$item")"
    if [[ -L "$localpath" ]] || [[ ! -e "$localpath" ]]; then
        if [[ -L "$localpath" ]]; then
            echo "$localpath is a link"
            rm "$localpath"
        fi
        mv "../.snoke/$localpath" "$(dirname "$localpath")"
        deleteDirIfIncludesNoFiles "../.snoke/$(dirname "$localpath")"
    # else
    #     rm -r "../.snoke/$localpath"
    fi
done

deleteDirIfIncludesNoFiles "../.snoke"
