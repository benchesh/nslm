const { importAll } = require('../importAll.js');
importAll().from('./common.js');

/**
 * Replace all modules for the current project with their nslm versions
 */
exports.run = (argv) => {
  const modules = reg_modules.getData();
  const cwdBasename = basename(process.cwd());

  let linkModuleCount = 0;
  let linkModuleSkips = [];
  let argvModuleSkips = [];
  let allowMissingModules = [];

  const linkModule = (moduleName) => {
    const localModule = `node_modules/${moduleName}`;
    const localModulePath = path.resolve(localModule);
    if (!fs.existsSync(localModulePath)) {
      if (!argv.allowmissing) {
        linkModuleSkips.push(moduleName);
        return;
      } else {
        allowMissingModules.push(moduleName);
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

      const localModuleJsonPath = path.resolve(`.${mname}`, 'modules.json');
      writeFileSyncRecursive(localModuleJsonPath, JSON.stringify(sortObject({ ...jsonFileToJSObj(localModuleJsonPath), ...JSON.parse(`{"${moduleName}":"${registeredModulePath}"}`) }), null, 4));

      console.log(`${green(`"${cwdBasename}/${localModule}"`)} has been symlinked to: ${green(`"${registeredModulePath}"`)}`);
      linkModuleCount++;
    }
  }

  if (argv.allowmissing) {
    console.log('--allowmissing flag is active. Any module that is not present in the node_modules directory will still be linked');
  }

  if (argv.all) {
    console.log(`Linking all ${mname} registered modules (${Object.keys(modules).length} total)...`);
    Object.keys(modules).forEach((moduleName) => {
      linkModule(moduleName);
    });
  } else {
    if (argv.modules && argv.modules.length) {
      if (argv.modules.length === 1) {
        console.log(`Linking ${mname} module with name "${argv.modules}"...`)
      } else {
        console.log(`Linking ${mname} modules with names ["${argv.modules.join('", "')}"]...`)
      }
      argv.modules.forEach((moduleName) => {
        if (!modules[moduleName]) {
          argvModuleSkips.push(moduleName);
        } else {
          linkModule(moduleName);
        }
      });
    }

    const pathscontaining = (array, searchmode) => {
      if (!array || !array.length) {
        return;
      }

      if (array.length === 1) {
        console.log(`Linking all ${mname} modules that contain the following string in their registered paths: "${array}"...`);
      } else {
        console.log(`Linking all ${mname} modules that contain ${searchmode === 'every' ? 'all' : 'any'} of the following strings in their registered paths: ["${array.join('", "')}"]...`);
      }

      modulePathsContainingProcess(modules, array, searchmode, linkModule)
    }
    pathscontaining(argv.pathscontainingevery, 'every');
    pathscontaining(argv.pathscontainingsome, 'some');
  }

  if (linkModuleSkips.length) {
    if (linkModuleSkips.length === 1) {
      warn(`Module "${linkModuleSkips}" doesn't exist in ${cwdBasename}/node_modules and has been skipped as a result`);
    } else {
      warn(`Modules ["${linkModuleSkips.join('", "')}"] don't exist in ${cwdBasename}/node_modules and have been skipped as a result`);
    }
  }

  if (argvModuleSkips.length) {
    if (argvModuleSkips.length === 1) {
      warn(`Module "${argvModuleSkips}" hasn't been registered to ${mname} and has been skipped as a result`);
    } else {
      warn(`Modules ["${argvModuleSkips.join('", "')}"] haven't been registered to ${mname} and have been skipped as a result`);
    }
  }

  if (allowMissingModules.length) {
    if (allowMissingModules.length === 1) {
      warn(`Module "${allowMissingModules}" was added due to the --allowmissing flag; it hasn't been backed up as it hasn't been installed locally`);
    } else {
      warn(`Modules ["${allowMissingModules.join('", "')}"] were added due to the --allowmissing flag; they haven't been backed up as they haven't been installed locally`);
    }
  }

  if (linkModuleCount) {
    console.log(`${linkModuleCount} modules were linked successfully!`);
  } else {
    error('No modules were linked. Check your arguments!');
  }
};
