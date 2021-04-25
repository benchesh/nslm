/**
 * Recursively register all node modules for use with nslm
 */
exports.run = () => {
  //change cwd to arg
  {
    const newPWD = path.resolve(argv._.join(' '));
    try {
      process.chdir(newPWD);
    } catch (err) {
      error(`Directory "${newPWD}" does not exist!`);
      return;
    }
    delete argv._;
    delete argv['$0'];
    if (Object.keys(argv).length) {
      warn('This command only accepts a pathname as an argument! You can ensure the pathname is resolved correctly by wrapping it in single/double quotes.');
    }
  }

  process.stdout.write(`PWD: "${process.cwd()}"\nSearching directories for package.json... `);

  let modulesRegistered = 0;
  const fullJson = reg_modules.getData();
  const packages = (() => {
    const output = runShellFile('find-packages.sh', process.cwd());
    return output ? output.split('\n').filter(str => !str.includes(`/.${mname}/`) && !str.includes('/node_modules/')) : [];//filter out nslm backup modules/no output
  })();
  console.log(`${packages.length} found!`);

  packages.forEach((s) => {
    if (!s) {
      return;
    }
    try {
      const { name } = JSON.parse(fs.readFileSync(s));
      if (name) {
        const location = dirname(s);
        if (fullJson[name] === location) {
          console.log(orange(`Module "${name}" has already been registered at location "${location}"`));
        } else {
          console.log(green(`Registered module "${name}" at location "${location}"`));
          fullJson[name] = location;
          modulesRegistered++;
        }
      } else {
        warn(`"${s}" does not have a name field! Skipping!`);
      }
    } catch (e) {
      error(`"${s}" failed to parse!`);
    }
  });

  if (modulesRegistered === 1) {
    process.stdout.write(`${modulesRegistered} new module was registered. Saving modules.json... `);
  } else {
    process.stdout.write(`${modulesRegistered} new modules were registered. Saving modules.json... `);
  }
  writeFileSyncRecursive(reg_modules.path, JSON.stringify(sortObject({ ...fullJson }), null, 4));
  console.log('Done!');
};
