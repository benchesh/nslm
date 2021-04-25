/**
 * Recursively deregister node modules for use with nslm
 */
exports.run = () => {
  const modules = reg_modules.getData();
  if (!Object.keys(modules).length) {
    error("There are no modules left to deregister!");
    return;
  }

  const deregisterModule = (moduleName) => {
    console.log(green(`Deregistered module: "${moduleName}" at location "${modules[moduleName]}"`));
    delete modules[moduleName];
  }

  argvProcess(
    {
      msg: 'Deregistering',
      modules: modules,
      func: deregisterModule,
      specifiedModulesFunc: ((moduleName) => {
        modules[moduleName] && deregisterModule(moduleName);
      }),
    }
  );

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