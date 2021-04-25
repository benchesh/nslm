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

  const cwdBasename = `${basename(process.cwd())}/node_modules/`;
  process.chdir('node_modules');

  const deleteIfEmpty = (p) => {
    if (fs.existsSync(p) && runShellFile('find-packages.sh', p)) {//directory exists and is NOT empty!
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
    const moduleBackupPath = path.resolve(moduleBackupsPath, 'node_modules', moduleName);
    const moduleBackupPathOLD = path.resolve(moduleBackupsPath, moduleName);//maintain compatibility with older versions of nslm

    if (!fs.existsSync(pkgPath) || fs.lstatSync(pkgPath).isSymbolicLink()) {
      tryCatchDelete(pkgPath);//will error if it doesn't exist but existsSync may fail if the symbolic link is broken, so try catch!
      if (fs.existsSync(moduleBackupPath)) {
        runShellFile('mv.sh', [moduleBackupPath, path.resolve(dirname(moduleName))]);//move module backup to the local node_modules dir
        console.log(`${green(`"${cwdBasename}${moduleName}"`)} has been delinked & restored from backup`);
      } else if (fs.existsSync(moduleBackupPathOLD)) {
        runShellFile('mv.sh', [moduleBackupPathOLD, path.resolve(dirname(moduleName))]);//move module backup to the local node_modules dir
        console.log(`${green(`"${cwdBasename}${moduleName}"`)} has been delinked & restored from backup`);
      } else {
        tryCatchDelete(moduleBackupPath);//delete anyway in case it's a broken symlink
        console.log(`${orange(`"${cwdBasename}${moduleName}"`)} has been delinked but has not been restored as it has no backup`);
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
    error(`No modules were delinked. Check your arguments! If you wish to delink all ${mname} modules, use the --all arg`);
  }
};
