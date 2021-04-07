#!/usr/bin/env node

const args = process.argv.splice(process.execArgv.length + 2);
const cmd = `../lib/cmds/${args[0]}.js`;
const moduleExists = (path) => {
    try {
        require.resolve(path);
        return true;
    } catch (e) {
        return false;
    }
}

if (!args[0].includes('..') && moduleExists(cmd)) {//if the cmd exists, run it!
    require(cmd).run(args.splice(1));
    return;
}

const { importAll } = require('../lib/importAll.js');
importAll().from('./common.js');
error(`${args[0]} is not a valid ${mname} command!`)
