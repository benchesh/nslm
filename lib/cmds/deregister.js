/**
 * Recursively deregister node modules for use with nslm
 */
exports.run = () => {
  const modules = getRegModules().getData();
  if (!Object.keys(modules).length) {
    error("There are no modules left to deregister!");
    return;
  }

  const deregisterModule = (moduleName) => {
    if (modules[moduleName]) {
      console.log(green(`Deregistered module: "${moduleName}" at location "${modules[moduleName]}"`));
      delete modules[moduleName];
    } else {
      warn(`"${moduleName}" has already been deregistered!`)
    }
  }

  argvProcess(
    {
      msg: 'Deregistering',
      modules: modules,
      func: deregisterModule,
      specifiedModulesFunc: ((moduleName) => {
        deregisterModule(moduleName);
      })
    }
  );

  if (Object.keys(modules).length) {
    process.stdout.write('Saving modules.json... ');
    writeFileSyncRecursive(getRegModules().path, JSON.stringify(sortObject(modules), null, 4));
  } else {
    process.stdout.write('No registered modules remain! Deleting modules.json... ');
    tryCatchDelete(getRegModules().path);
  }

  deleteFolderIfEmpty(path.dirname(getRegModules().path));
  console.log('Done!');
};
