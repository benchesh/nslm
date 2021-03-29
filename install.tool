#!/bin/sh

loaderFile="$(dirname "$0")/src/snoke.sh"

if [[ ! -f "$loaderFile" ]]; then
    echo "ERROR: snoke install aborted as \"$loaderFile\" does not exist!"
    exit
fi

iload="alias snoke=\"\\\"$loaderFile\\\"\" \"\$@\" ###SNOKE###"

addToFile() {
    path=~/"$1"
    if [[ -f "$path" ]]; then
        catpath="$(cat "$path")"
        filteredcatpath="$(echo "$catpath" | sed -e "s/\(alias\).*\(###SNOKE\).*//g")"$'\n'

        if [[ "$(echo "$filteredcatpath" | head -n1)" != "" ]]; then
            iload+=$'\n'
        fi
    fi

    printf "%s" "$iload$filteredcatpath" >"$path"
    echo "\033[1;32msnoke has been successfully added to your \"$1\" file!\033[0m"
}

if [[ $SHELL == *"zsh"* ]]; then
    addToFile .zshrc
elif [[ $SHELL == *"bash"* ]]; then
    addToFile .bashrc
else
    echo "ERROR: The \"$SHELL\" shell is unsupported by this installer. Switch your shell to either bash or zsh and run this script again. Alternatively, you can manually register an alias to snoke like so:\n$iload"
fi
