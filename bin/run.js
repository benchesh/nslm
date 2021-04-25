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

const { importAll } = require('../lib/importAll.js');
importAll().from('./common.js');

if (!args[0].includes('..') && moduleExists(cmd)) {//if the cmd exists, run it!
    const yargs = require('yargs/yargs');

    global.argv = yargs(args.splice(1))
        .array(['modules', 'pathscontainingevery', 'pathscontainingsome'])
        .boolean(['all', 'allowmissing', 'fix'])
        .alias('pathcontainingsome', 'pathscontainingsome')
        .alias('pathcontainingany', 'pathscontainingsome')
        .alias('pathcontaining', 'pathscontainingsome')
        .alias('pathscontaining', 'pathscontainingsome')
        .alias('pathcontainingevery', 'pathscontainingevery')
        .alias('pathcontainingall', 'pathscontainingevery')
        .alias('pathscontainingall', 'pathscontainingevery')
        .alias('module', 'modules')
        .alias('a', 'all')
        .argv

    require(cmd).run();
    return;
}

error(`${args[0]} is not a valid ${mname} command!`)
