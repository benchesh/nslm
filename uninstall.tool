#!/bin/sh

removeFromFile() {
    path=~/"$1"
    if [[ -f "$path" ]]; then
        catpath="$(cat "$path")"
        filteredcatpath="$(echo "$catpath" | sed -e "s/\(alias\).*\(###SNOKE\).*//g")"$'\n'

        if [[ "$catpath"$'\n' != "$filteredcatpath" ]]; then
            printf "%s" "$filteredcatpath" >"$path"
            echo "\033[1;32msnoke has been successfully removed from your \"$1\" file!\033[0m"
            hasUninstalled=true
        fi
    fi
}

removeFromFile .zshrc
removeFromFile .bashrc

if [ ! $hasUninstalled ]; then
    echo "Nothing to remove!"
fi

if [[ $SHELL != *"zsh"* ]] && [[ $SHELL != *"bash"* ]]; then
    echo "WARNING: The \"$SHELL\" shell is unsupported by this uninstaller. If you manually created an alias for snoke, you will need to remove it yourself!"
fi
