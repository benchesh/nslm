#!/usr/bin/env node

const { importAll } = require('../lib/importAll.js');
importAll().from('./common.js');

const args = process.argv.splice(process.execArgv.length + 2);
args[0] = args[0].replace(/^-*/g, '');
Object.keys(aliases).forEach((cmd) => {
    if (aliases[cmd].includes(args[0])) args[0] = cmd;
});

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
    const yargs = require('yargs/yargs');

    global.argv = yargs(args.splice(1))
        .array(['modules', 'pathscontainingevery', 'pathscontainingsome'])
        .boolean(['all', 'allowmissing', 'fix', 'simulate'])
        .alias('pathcontainingsome', 'pathscontainingsome')
        .alias('pathcontainingany', 'pathscontainingsome')
        .alias('pathcontaining', 'pathscontainingsome')
        .alias('pathscontaining', 'pathscontainingsome')
        .alias('pathcontainingevery', 'pathscontainingevery')
        .alias('pathcontainingall', 'pathscontainingevery')
        .alias('pathscontainingall', 'pathscontainingevery')
        .alias('module', 'modules')
        .alias('a', 'all')
        .alias('s', 'simulate')
        .argv

    //change cwd to arg
    {
        const newPWD = path.resolve(argv._.join(' '));
        try {
            process.chdir(newPWD);
        } catch (err) {
            error(`Directory "${newPWD}" does not exist!`);
            return;
        }
    }
    !['version', 'help'].includes(args[0]) && console.log(`PWD: "${process.cwd()}"`);

    require(cmd).run();
    return;
}

error(`${args[0]} is not a valid ${mname} command!`)
