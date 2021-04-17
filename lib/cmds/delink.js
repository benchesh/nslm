const { importAll } = require('../importAll.js');
importAll().from('./common.js');

/**
 * Remove all snoke modules from the current project
 */
exports.run = (argv) => {
  if (!fs.existsSync(`.${mname}`)) {
    error(`.${mname} directory was not found! You have either not used ${mname} in this directory or have already removed it`);
    return;
  }
  mkdirSyncIfMissing('node_modules');

  process.chdir(`.${mname}`);
  const moduleBackupsPath = process.cwd();
  const localModuleJsonPath = path.resolve('modules.json');
  const modules = jsonFileToJSObj(localModuleJsonPath);

  process.chdir('..');
  const cwdBasename = `${basename(process.cwd())}/node_modules`;
  process.chdir('node_modules');

  const deleteIfEmpty = (p) => {
    if (fs.existsSync(p) && runShellFile('find-packages.sh', [p])) {//directory exists and is NOT empty!
      return;
    }
    const thisModulesJson = path.resolve(p, 'modules.json');
    if (thisModulesJson !== localModuleJsonPath || !fs.existsSync(thisModulesJson)) {
      tryCatchDelete(p);
    }
  }

  let delinkModuleCount = 0;

  const delinkModule = (moduleName) => {
    const pkgPath = path.resolve(moduleName);
    const moduleBackupPath = path.resolve(moduleBackupsPath, moduleName);

    if (!fs.existsSync(pkgPath) || fs.lstatSync(pkgPath).isSymbolicLink()) {
      tryCatchDelete(pkgPath);//will error if it doesn't exist but existsSync may fail if the symbolic link is broken, so try catch!
      if (fs.existsSync(moduleBackupPath)) {
        runShellFile('mv.sh', [moduleBackupPath, path.resolve(dirname(moduleName))]);//move module backup to the local node_modules dir
        console.log(`${green(`"${cwdBasename}/${moduleName}"`)} has been delinked & restored from backup`);
      } else {
        tryCatchDelete(moduleBackupPath);
        console.log(`${orange(`"${cwdBasename}/${moduleName}"`)} has been delinked but has not been restored as it has no backup`);
      }
      delinkModuleCount++;
    } else {
      tryCatchDelete(moduleBackupPath);
    }

    if (fs.existsSync(localModuleJsonPath)) {
      const localModuleJson = jsonFileToJSObj(localModuleJsonPath);
      delete localModuleJson[moduleName];

      if (Object.keys(localModuleJson).length) {
        writeFileSyncRecursive(localModuleJsonPath, JSON.stringify(localModuleJson, null, 4));
        deleteIfEmpty(path.resolve(dirname(moduleBackupPath)));//moduleBackupPath parent
      } else {
        tryCatchDelete(moduleBackupsPath);
      }
    } else {
      tryCatchDelete(moduleBackupsPath);
    }
  }

  if (argv.all) {
    console.log(`Delinking all ${mname} modules (${Object.keys(modules).length} total)...`);
    Object.keys(modules).forEach((s) => {
      delinkModule(s)
    });
  } else {
    if (argv.modules) {
      const localModuleJson = jsonFileToJSObj(localModuleJsonPath);
      argv.modules.forEach((moduleName) => {
        localModuleJson[moduleName] && delinkModule(moduleName);
      });
    }

    const pathscontaining = (array, searchmode) => {
      if (!array || !array.length) {
        return;
      }

      if (array.length === 1) {
        console.log(`Delinking all ${mname} modules that contain the following string in their registered paths: "${array}"...`);
      } else {
        console.log(`Delinking all ${mname} modules that contain ${searchmode === 'every' ? 'all' : 'any'} of the following strings in their registered paths: ["${array.join('", "')}"]...`);
      }

      modulePathsContainingProcess(modules, array, searchmode, delinkModule);
    }
    pathscontaining(argv.pathscontainingevery, 'every');
    pathscontaining(argv.pathscontainingsome, 'some');
  }

  deleteIfEmpty(moduleBackupsPath);

  if (delinkModuleCount) {
    console.log(`${delinkModuleCount} modules were delinked successfully!`);
  } else {
    error(`No modules were delinked. Check your arguments! If you wish to delink all ${mname} modules, use the --all arg`);
  }
};