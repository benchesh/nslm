#!/bin/sh

find "$1" -name "package.json" -not -path "*/.yalc/*"
