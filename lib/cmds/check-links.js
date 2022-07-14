/**
 * Replace all modules for the current project with their nslm versions
 */
exports.run = () => {
  const cwdBasename = `${path.basename(process.cwd())}/`;
  const modules = jsonFileToJSObj(localModuleJsonPath);
  const fixModules = [];
  let checkedModules = 0;

  if (!Object.keys(modules).length) {
    error(`It doesn\'t look like you have linked any ${mname} modules!`);
    return;
  }

  const checkModule = (moduleName) => {
    const localModule = path.join('node_modules', moduleName);
    const localModuleActualPath = fs.existsSync(localModule) && path.resolve(fs.realpathSync(localModule));
    const copiedModuleFilepath = path.resolve(localModule, `.${mname}-copied-dir`);

    if (fs.existsSync(copiedModuleFilepath)) {
      console.log(`${green(`"${cwdBasename}${localModule}"`)} was linked via --linktype=copy. Running this command again with the --fix argument will copy the module again (this won't work with subdirectories... yet!)`);

      if (fs.lstatSync(localModule).isSymbolicLink()) {
        console.log(`${orange(`"${cwdBasename}${localModule}"`)} is a symbolic link, which is unexpected as it was linked via --linktype=copy!`);
      }
    } else {
      if (localModuleActualPath === modules[moduleName]) {
        console.log(`${green(`"${cwdBasename}${localModule}"`)} is pointing to ${green(`"${localModuleActualPath}"`)} as expected!`);
      } else {
        fixModules.push(moduleName);
        console.log(`${orange(`"${cwdBasename}${localModule}"`)} is NOT pointing to ${orange(`"${modules[moduleName]}"`)} and will need relinking!`);
      }
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
    if (!argv.fix) {
      warn(`${fixModules.length} of ${checkedModules} checked modules need relinking! To fix, simply run this command again with the --fix or --relink arguments. The fix argument will only relink modules when a problem has been identified with them, whereas relink will always relink everything.`);
    }
  } else {
    console.log(`The links for all ${checkedModules} checked modules are OK!`);
  }

  if ((fixModules.length && argv.fix) || argv.relink) {
    argv.allowmissing = true;
    argv.pathscontainingevery = false;
    argv.pathscontainingsome = false;
    argv.all = false;
    argv.modules = argv.relink ? Object.keys(modules) : fixModules;
    if (fixModules.length) {
      warn(`${fixModules.length} of ${checkedModules} checked modules need relinking! Fixing...`);
    }
    require('./link.js').run(true);
  }
};
