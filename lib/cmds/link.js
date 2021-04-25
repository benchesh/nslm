/**
 * Replace all modules for the current project with their nslm versions
 */
exports.run = (relink) => {
  const modules = reg_modules.getData();
  if (!Object.keys(modules).length) {
    error("You need to register at least one module before you can link anything!");
    return;
  }

  const cwdBasename = `${basename(process.cwd())}/`;

  let linkModuleCount = 0;
  let linkModuleSkips = [];
  let argvModuleSkips = [];
  let allowMissingModules = [];

  const linkModule = (moduleName) => {
    const localModule = `node_modules/${moduleName}`;
    const localModulePath = path.resolve(localModule);
    if (!relink && !fs.existsSync(localModulePath)) {
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
      console.log(`${orange(`"${cwdBasename}${localModule}"`)} is already pointing to ${orange(`"${localModuleActualPath}"`)}`);
    } else {
      if (fs.existsSync(localModulePath)) {
        const moduleBackupPath = path.resolve(`.${mname}`, 'node_modules', moduleName);
        tryCatchDelete(moduleBackupPath);
        runShellFile('mv.sh', [localModulePath, path.resolve(dirname(moduleBackupPath))]);
      } else {
        mkdirSyncIfMissing(path.resolve(dirname(localModule)));
      }

      tryCatchDelete(localModulePath);//can crash at symlinkSync if  the file isn't deleted first (existsSync may evaluate to false even when the file exists; may occur when there are broken symlinks)
      fs.symlinkSync(registeredModulePath, localModulePath);

      writeFileSyncRecursive(localModuleJsonPath, JSON.stringify(sortObject({ ...jsonFileToJSObj(localModuleJsonPath), ...JSON.parse(`{"${moduleName}":"${registeredModulePath}"}`) }), null, 4));

      console.log(`${green(`"${cwdBasename}${localModule}"`)} has been symlinked to: ${green(`"${registeredModulePath}"`)}`);
      linkModuleCount++;
    }
  }

  if (argv.allowmissing && !relink) {
    console.log('--allowmissing flag is active. Any module that is not present in the node_modules directory will still be linked');
  }

  argvProcess(
    {
      msg: relink ? 'Relinking' : 'Linking',
      modules: modules,
      func: linkModule,
      specifiedModulesFunc: ((moduleName) => {
        if (!modules[moduleName]) {
          argvModuleSkips.push(moduleName);
        } else {
          linkModule(moduleName);
        }
      }),
    },
  );

  if (linkModuleSkips.length === 1) {
    warn(`Module "${linkModuleSkips}" doesn't exist in ${cwdBasename}node_modules and has been skipped as a result`);
  } else if (linkModuleSkips.length) {
    warn(`Modules ["${linkModuleSkips.join('", "')}"] don't exist in ${cwdBasename}node_modules and have been skipped as a result`);
  }

  if (argvModuleSkips.length === 1) {
    warn(`Module "${argvModuleSkips}" hasn't been registered to ${mname} and has been skipped as a result`);
  } else if (argvModuleSkips.length) {
    warn(`Modules ["${argvModuleSkips.join('", "')}"] haven't been registered to ${mname} and have been skipped as a result`);
  }

  if (allowMissingModules.length === 1) {
    warn(`Module "${allowMissingModules}" was added due to the --allowmissing flag; it hasn't been backed up as it hasn't been installed locally`);
  } else if (allowMissingModules.length) {
    warn(`Modules ["${allowMissingModules.join('", "')}"] were added due to the --allowmissing flag; they haven't been backed up as they haven't been installed locally`);
  }

  if (linkModuleCount === 1) {
    console.log(`${linkModuleCount} module was linked successfully!`);
  } else if (linkModuleCount) {
    console.log(`${linkModuleCount} modules were linked successfully!`);
  } else {
    error('No modules were linked. Check your arguments!');
  }
};
