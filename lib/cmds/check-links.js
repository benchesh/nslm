/**
 * Replace all modules for the current project with their nslm versions
 */
exports.run = () => {
  const cwdBasename = `${basename(process.cwd())}/`;
  const modules = jsonFileToJSObj(localModuleJsonPath);
  const fixModules = [];
  let checkedModules = 0;

  if (!Object.keys(modules).length) {
    error(`It doesn\'t look like you have linked any ${mname} modules!`);
    return;
  }

  const checkModule = (moduleName) => {
    const localModule = `node_modules/${moduleName}`;
    const localModuleActualPath = fs.existsSync(localModule) && path.resolve(fs.realpathSync(localModule));

    if (localModuleActualPath === modules[moduleName]) {
      console.log(`${green(`"${cwdBasename}${localModule}"`)} is pointing to ${green(`"${localModuleActualPath}"`)} as expected!`);
    } else {
      fixModules.push(moduleName);
      console.log(`${orange(`"${cwdBasename}${localModule}"`)} is NOT pointing to ${orange(`"${modules[moduleName]}"`)} and will need relinking!`);
    }
    checkedModules++;
  }

  argvProcess(
    {
      msg: 'Checking',
      defaultAll: true,
      modules: modules,
      func: checkModule,
      specifiedModulesFunc: ((moduleName) => {
        checkModule(moduleName);
      }),
    },
  );

  if (fixModules.length) {
    if (argv.fix) {
      argv.allowmissing = true;
      argv.pathscontainingevery = false;
      argv.pathscontainingsome = false;
      argv.all = false;
      argv.modules = fixModules;
      warn(`${fixModules.length} of ${checkedModules} checked modules need relinking! Fixing...`);
      require('./link.js').run(true);
    } else {
      warn(`${fixModules.length} of ${checkedModules} checked modules need relinking! To fix, simply run this command again with the --fix argument.`);
    }
  } else {
    console.log(`The symlinks for all ${checkedModules} checked modules are OK!`);
  }
};
