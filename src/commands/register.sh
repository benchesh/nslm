#!/bin/sh

getNameFromJsonFile() {
    node <<EOF
const fs = require("fs"); 
fs.readFile("$1/package.json", function(err, data) {
    const pdata=JSON.parse(data);
    pdata.name && console.log('"'+pdata.name+'": "$1",');
});
EOF
}

printf "Searching directories for package.json... "
packages="$(find "$PWD" -name "package.json" -not -path "*/node_modules/*" -not -path "*/.yalc/*")"

SAVEIFS=$IFS         # Save current IFS
IFS=$'\n'            # Change IFS to new line
packages=($packages) # split to array $names
IFS=$SAVEIFS         # Restore IFS

echo "${#packages[@]} found!"
for item in "${packages[@]}"; do
    packagePath="$(dirname "$item")"
    moduleName="$(getNameFromJsonFile "$packagePath")"
    if [[ "$moduleName" != "" ]]; then
        echo "REGISTERING MODULE: $moduleName"
        modules+="$moduleName"
    else
        echo "WARNING: \"$packagePath\" does not have a name field! Skipping!"
    fi
done

printf "Saving modules.json... "

snoke=~/.snoke/modules.json

mkdir -p "$(dirname "$snoke")"

node <<EOF
const fs = require('fs');

const snoke="$snoke";
const data = fs.existsSync(snoke) ? JSON.parse(fs.readFileSync(snoke)) : {}; 

try {
    fs.writeFileSync(snoke, JSON.stringify({...data, $modules}, null, 4));
} catch (err) {
    console.error(err);
}
EOF

echo "Done!"
