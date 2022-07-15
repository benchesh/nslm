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
        .array(['modules', 'pathscontainingevery', 'pathscontainingsome', 'subdirs'])
        .boolean(['all', 'allowmissing', 'fix', 'simulate', 'watch', 'verbose', 'relink'])
        .choices('linktype', ['symbolic', 'copy'])
        .alias('pathcontainingsome', 'pathscontainingsome')
        .alias('path-containing-some', 'pathscontainingsome')
        .alias('pathcontainingany', 'pathscontainingsome')
        .alias('path-containing-any', 'pathscontainingsome')
        .alias('pathcontaining', 'pathscontainingsome')
        .alias('path-containing', 'pathscontainingsome')
        .alias('pathscontaining', 'pathscontainingsome')
        .alias('paths-containing', 'pathscontainingsome')
        .alias('pathcontainingevery', 'pathscontainingevery')
        .alias('path-containing-every', 'pathscontainingevery')
        .alias('pathcontainingall', 'pathscontainingevery')
        .alias('path-containing-all', 'pathscontainingevery')
        .alias('pathscontainingall', 'pathscontainingevery')
        .alias('paths-containing-all', 'pathscontainingevery')
        .alias('module', 'modules')
        .alias('a', 'all')
        .alias('w', 'watch')
        .alias('s', 'simulate')
        .alias('linksubdirs', 'subdirs')
        .alias('link-subdirs', 'subdirs')
        .alias('subdir', 'subdirs')
        .alias('sub-dir', 'subdirs')
        .alias('linksubdir', 'subdirs')
        .alias('link-subdir', 'subdirs')
        .alias('link-sub-dir', 'subdirs')
        .alias('subdirectories', 'subdirs')
        .alias('sub-directories', 'subdirs')
        .alias('linksubdirectories', 'subdirs')
        .alias('link-subdirectories', 'subdirs')
        .alias('link-sub-directories', 'subdirs')
        .alias('subdirectory', 'subdirs')
        .alias('sub-directory', 'subdirs')
        .alias('linksubdirectory', 'subdirs')
        .alias('link-subdirectory', 'subdirs')
        .alias('link-sub-directory', 'subdirs')
        .alias('link-type', 'linktype')
        .alias('linkmode', 'linktype')
        .alias('link-mode', 'linktype')
        .alias('mode', 'linktype')
        .alias('type', 'linktype')
        .alias('allow-missing', 'allowmissing')
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
