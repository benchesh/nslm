const { importAll } = require('../importAll.js');
importAll().from('./common.js');

/**
 * Replace all modules for the current project with their snoke versions
 */
exports.run = () => {
  const modules = reg_modules.getData();
  Object.keys(modules).forEach((moduleName) => {
    const localModule = `node_modules/${moduleName}`;
    const localModulePath = path.resolve(localModule);
    if (!fs.existsSync(localModulePath)) {//todo make this optional
      return;
    }

    const localModuleActualPath = fs.existsSync(localModule) && path.resolve(fs.realpathSync(localModule));
    const registeredModulePath = path.resolve(modules[moduleName]);
    if (localModuleActualPath === registeredModulePath) {
      console.log(`${yellow(`"${basename(process.cwd())}/${localModule}"`)} is already pointing to ${yellow(`"${localModuleActualPath}"`)}`);
    } else {
      if (fs.existsSync(localModulePath)) {
        const moduleBackupPath = path.resolve(`.${mname}`, moduleName);
        tryCatchUnlinkSync(moduleBackupPath);
        runShellFile('mv.sh', [localModulePath, path.resolve(dirname(moduleBackupPath))]);
      } else {
        fs.mkdirSync(path.resolve(dirname(localModule)), { recursive: true })
      }

      tryCatchUnlinkSync(localModulePath);//can crash at symlinkSync if  the file isn't deleted first (existsSync may evaluate to false even when the file exists; may occur when there are broken symlinks)
      fs.symlinkSync(registeredModulePath, localModulePath);

      console.log(`${green(`"${basename(process.cwd())}/${localModule}"`)} has been symlinked to: ${yellow(`"${registeredModulePath}"`)}`)
    }
  });
};
