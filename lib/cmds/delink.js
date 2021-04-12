const { importAll } = require('../importAll.js');
importAll().from('./common.js');

/**
 * Remove all snoke modules from the current project
 */
exports.run = () => {
  console.log(`Removing ${mname}...`);
  if (!fs.existsSync(`.${mname}`)) {
    console.log(`.${mname} directory was not found! You have either not used ${mname} in this directory or have already removed it`);
    return;
  }
  mkdirSyncIfMissing('node_modules');

  process.chdir(`.${mname}`);
  const moduleBackupsPath = process.cwd();
  const packages = runShellFile('find-packages.sh', ['.']).split('\n');
  process.chdir('../node_modules');

  const deleteIfEmpty = (path) => {
    if (fs.existsSync(path) && runShellFile('find-packages.sh', [path])) {//directory exists and is NOT empty!
      return;
    }
    tryCatchDelete(path);
  }

  packages.forEach((s) => {
    const pkgDirname = dirname(s);
    const pkgPath = path.resolve(pkgDirname);
    const moduleBackupPath = path.resolve(moduleBackupsPath, pkgDirname);

    if (!fs.existsSync(pkgPath) || fs.lstatSync(pkgPath).isSymbolicLink()) {
      tryCatchDelete(pkgPath);//will error if it doesn't exist but existsSync may fail if the symbolic link is broken, so try catch!
      runShellFile('mv.sh', [moduleBackupPath, path.resolve(dirname(pkgDirname))]);//move module backup to the local node_modules dir
    } else {
      tryCatchDelete(moduleBackupPath);
    }

    deleteIfEmpty(path.resolve(dirname(moduleBackupPath)));//moduleBackupPath parent
  });

  deleteIfEmpty(moduleBackupsPath);

  console.log('Done!');
};
