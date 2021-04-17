const { importAll } = require('../importAll.js');
importAll().from('./common.js');

/**
 * Recursively register all node modules for use with snoke
 */
exports.run = () => {
  process.stdout.write('Searching directories for package.json... ');

  let fullJson = {};
  const packages = runShellFile('find-packages.sh', process.cwd()).split('\n');
  console.log(`${packages.length} found!`);

  packages.forEach((s) => {
    const { name } = JSON.parse(fs.readFileSync(s));
    if (name) {
      const location = dirname(s);
      console.log(green(`REGISTERING MODULE: "${name}" at location "${location}"`));
      fullJson[name] = location;
    } else {
      warn(`"${s}" does not have a name field! Skipping!`);
    }
  });
  process.stdout.write('Saving modules.json... ');

  writeFileSyncRecursive(reg_modules.path, JSON.stringify(sortObject({ ...reg_modules.getData(), ...fullJson }), null, 4));

  console.log('Done!');
};