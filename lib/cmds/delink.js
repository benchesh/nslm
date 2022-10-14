/**
 * Remove all nslm modules from the current project
 */
exports.run = () => {
  if (!fs.existsSync(`.${mname}`)) {
    error(`.${mname} directory was not found! You have either not used ${mname} in this directory or have already removed it`);
    return;
  }
  mkdirSyncIfMissing('node_modules');

  const moduleBackupsPath = path.resolve(`.${mname}`);
  const modules = jsonFileToJSObj(localModuleJsonPath);

  const cwdBasename = path.basename(process.cwd());
  process.chdir('node_modules');

  const deleteIfEmpty = (p) => {//todo rename func
    if (fs.existsSync(p) && findPackages(p)) {//directory exists and is NOT empty!
      return;
    }
    const thisModulesJson = path.resolve(p, 'modules.json');
    if (thisModulesJson !== localModuleJsonPath || !fs.existsSync(thisModulesJson)) {
      tryCatchDelete(p);
    }
  }

  let delinkModuleCount = 0;

  const delinkModule = (moduleName) => {
    const localModule = path.join('node_modules', moduleName);
    const localModuleBasenamePath = path.join(cwdBasename, localModule);
    const pkgPath = path.resolve(moduleName);
    const moduleBackupPath = path.resolve(moduleBackupsPath, 'node_modules', moduleName);

    if (!fs.existsSync(pkgPath) || fs.lstatSync(pkgPath).isSymbolicLink() || fs.existsSync(path.resolve(pkgPath, `.${mname}-copied-dir`))) {
      tryCatchDelete(pkgPath);//will error if it doesn't exist but existsSync may fail if the symbolic link is broken, so try catch!
      if (fs.existsSync(moduleBackupPath)) {
        moveFileOrDirIntoDirSync(moduleBackupPath, path.resolve(path.dirname(moduleName)));//move module backup to the local node_modules dir
        console.log(`${green(`"${localModuleBasenamePath}"`)} has been delinked & restored from backup`);
      } else {
        tryCatchDelete(moduleBackupPath);//delete anyway in case it's a broken symlink
        console.log(`${orange(`"${localModuleBasenamePath}"`)} has been delinked but has not been restored as it has no backup`);
      }
    } else {
      tryCatchDelete(moduleBackupPath);
      console.log(`${orange(`"${localModuleBasenamePath}"`)} has been delinked but has not been restored from backup as a directory already exists in the expected location`);
    }

    if (fs.existsSync(localModuleJsonPath)) {
      const localModuleJson = jsonFileToJSObj(localModuleJsonPath);
      delete localModuleJson[moduleName];

      if (Object.keys(localModuleJson).length) {
        writeFileSyncRecursive(localModuleJsonPath, JSON.stringify(localModuleJson, null, 4));
        deleteIfEmpty(path.resolve(path.dirname(moduleBackupPath)));//moduleBackupPath parent
      } else {
        tryCatchDelete(moduleBackupsPath);
      }
    } else {
      tryCatchDelete(moduleBackupsPath);
    }

    delinkModuleCount++;
  }

  const localModuleJson = jsonFileToJSObj(localModuleJsonPath);

  argvProcess(
    {
      msg: 'Delinking',
      modules: modules,
      func: delinkModule,
      specifiedModulesFunc: ((moduleName) => {
        localModuleJson[moduleName] && delinkModule(moduleName);
      }),
    }
  );

  deleteIfEmpty(moduleBackupsPath);

  if (delinkModuleCount === 1) {
    console.log(`${delinkModuleCount} module was delinked successfully!`);
  } else if (delinkModuleCount) {
    console.log(`${delinkModuleCount} modules were delinked successfully!`);
  } else {
    error(`No modules were delinked! If you wish to delink all ${mname} modules, use the --all arg`);
  }
};
