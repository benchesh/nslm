const { deleteFolderRecursive } = require('../deleteFolderRecursive.js');
const { importAll } = require('../importAll.js');
importAll().from('./common.js');

/**
 * Recursively deregister node modules for use with nslm
 */
exports.run = (argv) => {
  const modules = reg_modules.getData();
  if (!Object.keys(modules).length) {
    error("There are no modules left to deregister!");
    return;
  }

  const deregisterModule = (moduleName) => {
    console.log(green(`Deregistered module: "${moduleName}" at location "${modules[moduleName]}"`));
    delete modules[moduleName];
  }

  if (argv.all) {
    console.log(`Deregistering all ${mname} modules (${Object.keys(modules).length} total)...`);
    Object.keys(modules).forEach((s) => {
      deregisterModule(s);
    });
  } else {
    if (argv.modules) {
      argv.modules.forEach((moduleName) => {
        modules[moduleName] && delinkModule(moduleName);
      });
    }

    modulePathsContainingProcess(argv, 'Deregistering', modules, deregisterModule);
  }

  if (Object.keys(modules).length) {
    process.stdout.write('Saving modules.json... ');
    writeFileSyncRecursive(reg_modules.path, JSON.stringify(sortObject(modules), null, 4));
  } else {
    process.stdout.write('No registered modules remain! Deleting modules.json... ');
    tryCatchDelete(reg_modules.path);
    //tryCatchDelete(dirname(reg_modules.path)); //todo a safer way to do this
  }

  console.log('Done!');
};
