#!/bin/sh

here="$PWD"
snokeModules="$(cat ~/.snoke/modules.json)"

snokeModuleNames() {
    node <<EOF
for (const o in JSON.parse(\`$snokeModules\`)) {
    console.log(o);
}
EOF
}

valFromJson() {
    node <<EOF
console.log(JSON.parse(\`$snokeModules\`)['$1'])
EOF
}

realpath() {
    local path="$1"
    while [[ -L ${path} && "$(ls -l "${path}")" =~ -\>\ (.*) ]]; do
        path="${BASH_REMATCH[1]}"
        cd "$PWD/$1/.."
        cd "${BASH_REMATCH[1]}"
        pwd
        cd "$here"
        break
    done
}

currentFolderName="$(basename "$PWD")/"
for snokeModuleName in $(snokeModuleNames); do
    localModulePath="node_modules/$snokeModuleName"
    if [[ -d "$localModulePath" ]]; then
        symlinkPath="$(realpath "$localModulePath")"
        snokeModulePath="$(valFromJson $snokeModuleName)"
        if [[ "$symlinkPath" == "$snokeModulePath" ]]; then
            echo "\033[1;32m$currentFolderName$localModulePath\033[1;33m has already been symlinked to: \033[1;36m$symlinkPath\033[0m"
        else
            if [[ -e ".snoke/$snokeModuleName" ]]; then
                rm -r ".snoke/$snokeModuleName"
            fi
            rootPath=".snoke/$(dirname "$snokeModuleName")"
            mkdir -p "$rootPath"
            mv "$localModulePath" "$rootPath"
            ln -s "$snokeModulePath" "$localModulePath"
            echo "\033[1;32m$currentFolderName$localModulePath\033[0m has been symlinked to: \033[1;36m$snokeModulePath\033[0m"
        fi
    fi
done
