const chokidar = require('chokidar');

/**
 * Replace all modules for the current project with their nslm versions
 */
exports.run = (relink) => {
  const modules = reg_modules.getData();
  if (!Object.keys(modules).length) {
    error("You need to register at least one module before you can link anything!");
    return;
  }

  const cwdBasename = path.basename(process.cwd());

  let linkModuleCount = 0;
  let linkModuleSkips = [];
  let argvModuleSkips = [];
  let allowMissingModules = [];
  let linkModuleCountTotal;
  let copiedModuleCount = 0;
  const watch = !relink && argv.watch;
  const verboseLogging = argv.verbose;

  const linkDir = (moduleName, subdir = '') => {
    const localModule = path.join('node_modules', moduleName, subdir);
    const localModulePath = path.resolve(localModule);
    const localModuleBasenamePath = path.join(cwdBasename, localModule);
    const nameInJson = path.join(moduleName, subdir);
    const copiedModuleFilepath = path.resolve(localModulePath, `.${mname}-copied-dir`);
    const modulePathInJson = jsonFileToJSObj(localModuleJsonPath)[nameInJson];
    const linktype = (() => {
      if (!relink) return argv.linktype;
      return fs.existsSync(copiedModuleFilepath) ? 'copy' : 'symbolic';
    })();

    if (!relink && !fs.existsSync(localModulePath)) {
      if (!argv.allowmissing) {
        linkModuleSkips.push(moduleName);
        return;
      }
      allowMissingModules.push(moduleName);
    }

    const localModuleActualPath = fs.existsSync(localModule) && path.resolve(fs.realpathSync(localModule));
    const registeredModulePath = path.resolve(modules[moduleName], subdir);

    if (!fs.existsSync(registeredModulePath)) {
      error(`"${localModuleBasenamePath}" cannot be linked as the source module "${registeredModulePath}" doesn't exist!`);
      return;
    }

    if (linktype !== 'copy' && fs.existsSync(copiedModuleFilepath)) {
      if (modulePathInJson) {
        error(`"${localModuleBasenamePath}" seems to have already been linked by --linktype=copy! This module needs to be delinked first. If you want to delink everything, run: nslm delink -a`);
        return;
      }

      warn(`"${localModuleBasenamePath}" seems to have already been linked by --linktype=copy, however as it doesn't exist in the list of linked modules, it'll be considered delinked.`);
    }

    if (localModuleActualPath === registeredModulePath && linktype !== 'copy') {
      console.log(`${orange(`"${localModuleBasenamePath}"`)} is already pointing to ${orange(`"${localModuleActualPath}"`)}${modulePathInJson ? '' : ` (not via ${mname})`}`);
    } else {
      if (linktype === 'copy' && modulePathInJson && fs.lstatSync(localModuleActualPath).isSymbolicLink()) {
        error(`"${localModuleBasenamePath}" seems to have already been linked by --linktype=symbolic! This module needs to be delinked first. If you want to delink everything, run: nslm delink -a`);
        return;
      }

      if (fs.existsSync(localModulePath)) {
        if (!fs.existsSync(copiedModuleFilepath)) {
          const moduleBackupPath = path.resolve(`.${mname}`, localModule);
          tryCatchDelete(moduleBackupPath);
          moveDirIntoDirSync(localModulePath, path.resolve(path.dirname(moduleBackupPath)));
        }
      } else {
        warn(`"${localModuleBasenamePath}" cannot be backed up as it doesn't exist within node_modules`);
        mkdirSyncIfMissing(path.resolve(path.dirname(localModule)));//for when allowmissing is active
      }

      if (linktype !== 'copy') {
        tryCatchDelete(localModulePath);//can crash at symlinkSync if the file isn't deleted first (existsSync may evaluate to false even when the file exists; may occur when there are broken symlinks)
        fs.symlinkSync(registeredModulePath, localModulePath);

        console.log(`${green(`"${localModuleBasenamePath}"`)} has been symlinked to: ${green(`"${registeredModulePath}"`)}`);
      }

      if (!modulePathInJson) {
        writeFileSyncRecursive(localModuleJsonPath, JSON.stringify(sortObject({ ...jsonFileToJSObj(localModuleJsonPath), ...JSON.parse(`{"${nameInJson}":"${registeredModulePath}"}`) }), null, 4));
      }

      linkModuleCount++;
    }

    if (linktype !== 'copy') {
      return;
    }

    tryCatchDelete(localModulePath);

    console.log(`${green(`"${registeredModulePath}"`)} is being copied to: ${green(`"${localModuleBasenamePath}"`)}...`);

    writeFileSyncRecursive(copiedModuleFilepath);

    let waiting = false;

    const changes = {
      addDir: 0,
      unlink: 0,
      unlinkDir: 0,
      create: 0,
      change: 0,
    }

    let tout;

    const reportChange = (event) => {
      changes[event]++;

      clearTimeout(tout);
      tout = setTimeout(() => {
        const date = new Date();

        let str = `[${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}:${('0' + date.getSeconds()).slice(-2)}] Changes detected at "${registeredModulePath}":\n`;

        if (changes.unlinkDir) {
          if (changes.unlinkDir === 1) {
            str += `  1 directory deleted\n`;
          } else {
            str += `  ${changes.unlinkDir} directories deleted\n`;
          }
        }

        if (changes.unlink) {
          if (changes.unlink === 1) {
            str += `  1 file deleted\n`;
          } else {
            str += `  ${changes.unlink} files deleted\n`;
          }
        }

        if (changes.addDir) {
          if (changes.addDir === 1) {
            str += `  1 directory created\n`;
          } else {
            str += `  ${changes.addDir} directories created\n`;
          }
        }

        if (changes.create) {
          if (changes.create === 1) {
            str += `  1 file created\n`;
          } else {
            str += `  ${changes.create} files created\n`;
          }
        }

        if (changes.change) {
          if (changes.change === 1) {
            str += `  1 file changed\n`;
          } else {
            str += `  ${changes.change} files changed\n`;
          }
        }

        console.log(str);

        Object.keys(changes).forEach(change => {
          changes[change] = 0;
        });
      }, 3000);
    }

    const chokidarInstance = chokidar.watch('.', {
      awaitWriteFinish: true,
      cwd: registeredModulePath,
      followSymlinks: true,
      ignored: /\.(git|DS_Store)/,
      persistent: true,//watch for file changes. Ready event is buggy when set to false, so we instead manually call chokidarInstance.close()
    }).on('all', (event, filepath) => {
      if (!jsonFileToJSObj(localModuleJsonPath)[nameInJson]) {
        error(waiting ? `"${registeredModulePath}" is no longer being watched for changes as "${localModuleBasenamePath}" has been delinked` : `Copy operation has been cancelled as "${localModuleBasenamePath}" has been delinked`);
        chokidarInstance.close();
        return;
      }

      const destPath = path.resolve(localModuleActualPath, filepath);
      const srcPath = path.resolve(registeredModulePath, filepath);

      // process.stdout.write(event + ' ');

      switch (event) {
        case 'addDir':
          mkdirSyncIfMissing(destPath);
          if (waiting) {
            if (verboseLogging) console.log(`Directory created: "${srcPath}"`);
            reportChange(event);
          }
          return;
        case 'unlink':
          if (destPath === copiedModuleFilepath) return;//failsafe
          tryCatchDelete(destPath);
          if (waiting) {
            if (verboseLogging) console.log(`File deleted: "${srcPath}"`);
            reportChange(event);
          }
          return;
        case 'unlinkDir':
          if (destPath === localModulePath) return;//failsafe
          tryCatchDelete(destPath);
          if (waiting) {
            if (verboseLogging) console.log(`Directory deleted: "${srcPath}"`);
            reportChange(event);
          }
          return;
        default:
          mkdirSyncIfMissing(path.dirname(destPath));

          if (waiting) {
            const newFile = !fs.existsSync(destPath);

            fs.copyFileSync(srcPath, destPath);

            if (verboseLogging) console.log(`File ${newFile ? 'created' : 'changed'}: "${srcPath}"`);
            reportChange(newFile ? 'create' : 'change');

            return;
          }

          // if (fs.lstatSync(srcPath).isSymbolicLink()) {
          //   console.log('isSymbolicLink', srcPath, destPath);
          // }
          // try {
          //   fs.copyFileSync(srcPath, destPath);
          // } catch (err) {
          //   console.log('copy error', srcPath, destPath);
          // }

          fs.copyFileSync(srcPath, destPath);
      }
    }).on('ready', () => {
      console.log(`${green(`"${registeredModulePath}"`)} has been copied to ${green(`"${localModuleBasenamePath}"`)}${watch ? '. Watching for changes...' : ''}`);

      if (++copiedModuleCount === linkModuleCountTotal) {
        console.log(`All directories have been copied${watch ? ' and are now watching for changes' : ''}!`);
      }

      if (!watch) {
        chokidarInstance.close();
        clearTimeout(tout);
        return;
      }

      waiting = true;
    });
  }

  const linkModule = (moduleName) => {
    if (argv.subdirs?.length) {
      argv.subdirs.forEach(subdir => {
        linkDir(moduleName, subdir);
      });
      return;
    }
    linkDir(moduleName);
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

  linkModuleCountTotal = linkModuleCount;

  if (linkModuleSkips.length === 1) {
    warn(`Module "${linkModuleSkips}" doesn't exist in ${path.join(cwdBasename, 'node_modules')} and has been skipped as a result`);
  } else if (linkModuleSkips.length) {
    warn(`Modules ["${linkModuleSkips.join('", "')}"] don't exist in ${path.join(cwdBasename, 'node_modules')} and have been skipped as a result`);
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
    error('No modules were linked!');
  }
};
