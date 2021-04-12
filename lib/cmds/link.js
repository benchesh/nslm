const { importAll } = require('../importAll.js');
importAll().from('./common.js');

/**
 * Replace all modules for the current project with their snoke versions
 */
exports.run = (argv) => {
  const modules = reg_modules.getData();
  const cwdBasename = basename(process.cwd());

  let putModuleSkips = [];
  let argvModuleSkips = [];

  const putModule = (moduleName) => {
    const localModule = `node_modules/${moduleName}`;
    const localModulePath = path.resolve(localModule);
    if (!fs.existsSync(localModulePath)) {
      if (!argv.allowmissing) {
        putModuleSkips.push(moduleName);
        return;
      }
    }

    const localModuleActualPath = fs.existsSync(localModule) && path.resolve(fs.realpathSync(localModule));
    const registeredModulePath = path.resolve(modules[moduleName]);
    if (localModuleActualPath === registeredModulePath) {
      console.log(`${orange(`"${cwdBasename}/${localModule}"`)} is already pointing to ${orange(`"${localModuleActualPath}"`)}`);
    } else {
      if (fs.existsSync(localModulePath)) {
        const moduleBackupPath = path.resolve(`.${mname}`, moduleName);
        tryCatchDelete(moduleBackupPath);
        runShellFile('mv.sh', [localModulePath, path.resolve(dirname(moduleBackupPath))]);
      } else {
        mkdirSyncIfMissing(path.resolve(dirname(localModule)));
      }

      tryCatchDelete(localModulePath);//can crash at symlinkSync if  the file isn't deleted first (existsSync may evaluate to false even when the file exists; may occur when there are broken symlinks)
      fs.symlinkSync(registeredModulePath, localModulePath);

      console.log(`${green(`"${cwdBasename}/${localModule}"`)} has been symlinked to: ${green(`"${registeredModulePath}"`)}`)
    }
  }

  if (argv.all) {
    Object.keys(modules).forEach((moduleName) => {
      putModule(moduleName);
    });
  } else {
    if (argv.modules) {
      argv.modules.forEach((moduleName) => {
        if (!modules[moduleName]) {
          argvModuleSkips.push(moduleName);
        } else {
          putModule(moduleName);
        }
      });
    }

    const pathscontaining = (array, searchmode) => {
      if (array && array.length) {
        let pathscontainingFound = false;
        Object.keys(modules).forEach((moduleName) => {
          const modulePath = modules[moduleName];
          if (searchmode === 'every') {
            if (!array.every(el => modulePath.includes(el))) {
              return;
            }
          } else if (!array.some(el => modulePath.includes(el))) {
            return;
          }
          putModule(moduleName);
          pathscontainingFound = true;
        });
        if (!pathscontainingFound) {
          console.log(orange(`No modules were found containing the ${pluralise('path', array)}:`), array);
        }
      }
    }
    pathscontaining(argv.pathscontainingevery, 'every');
    pathscontaining(argv.pathscontainingsome, 'some');
  }

  if (putModuleSkips.length) {
    if (putModuleSkips.length === 1) {
      warn(`Module ${putModuleSkips} doesn't exist in ${cwdBasename}/node_modules and has been skipped as a result`);
    } else {
      warn(`Modules [${putModuleSkips.join(', ')}] don't exist in ${cwdBasename}/node_modules and have been skipped as a result`);
    }
  }

  if (argvModuleSkips.length) {
    if (argvModuleSkips.length === 1) {
      warn(`Module ${argvModuleSkips} hasn't been registered to ${mname} and has been skipped as a result`);
    } else {
      warn(`Modules [${argvModuleSkips.join(', ')}] haven't been registered to ${mname} and have been skipped as a result`);
    }
  }
};
