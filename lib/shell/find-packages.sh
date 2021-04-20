#!/bin/sh

find "$1" -name "package.json" -not -path "*/node_modules/*" -not -path "*/.yalc/*" -not -path "*/.nslm/*"
