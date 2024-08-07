const { moveSync } = require('fs-extra');
const { path: appRoot } = require('app-root-path');

exports.path = require('path');

const pkg = require(exports.path.resolve(appRoot, 'package.json'));
exports.mname = pkg.name;
exports.mver = pkg.version;

exports.aliases = {
  'check-links': ['checklinks', 'check-link', 'checklink', 'check'],
  delink: ['unlink'],
  deregister: ['unregister'],
  help: ['h'],
  version: ['v']
}

exports.fs = require('fs');
exports.localModuleJsonPath = exports.path.resolve(`.${exports.mname}`, 'modules.json');

//for console logs
exports.green = (s) => '\033[1;32m' + s + '\033[0m';
exports.orange = (s) => '\033[1;33m' + s + '\033[0m';
exports.red = (s) => '\033[1;31m' + s + '\033[0m';
exports.warn = (s) => console.warn(orange(`WARNING: ${s}`));
exports.error = (s) => console.error(red(`ERROR: ${s}`));

/**
 * Convert a JSON file to a JS object. Will return an empty object if the file isn't found
 * 
 * @param {string} path the path to the JSON file
 */
exports.jsonFileToJSObj = (path) => fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : {}

/**
 * Get the registered nslm modules
 */
exports.getRegModules = () => {
  const path = exports.path.resolve(
    require('yargs/yargs')(argsJson).argv.homedir || require('os').homedir(),
    `.${exports.mname}`, 'modules.json'
  )

  return {
    path,
    getData: () => exports.jsonFileToJSObj(path)
  }
}

/**
 * Wrapper for unlinkSync to prevent crashes
 * 
 * @param {string} s path of file to remove
 */
exports.tryCatchDelete = (s) => {
  try {
    if (fs.lstatSync(s).isDirectory()) {
      fs.rmSync(s, { recursive: true }, (e) => { e && console.warn(e) });
      return;
    }
  } catch (err) { }
  try {
    fs.unlinkSync(s);
  } catch (err) { }
}

/**
 * Safe method to delete an empty directory
 * 
 * @param {string} s path of directory to remove
 */
exports.deleteFolderIfEmpty = (s) => !fs.readdirSync(s).length && fs.rmSync(s, { recursive: true }, (e) => { e && console.warn(e) });

/**
 * Recursively create a path if it doesn't exist
 * 
 * @param {string} str the path to check and create
 */
exports.mkdirSyncIfMissing = (s) => !fs.existsSync(s) && fs.mkdirSync(s, { recursive: true });

/**
 * Write to a file. Will create the file & destination folder if they don't exist
 * 
 * BASED ON https://gist.github.com/drodsou/de2ba6291aea67ffc5bc4b52d8c32abd?permalink_comment_id=4137595#gistcomment-4137595
 * 
 * @param {string} filepath the path of the file to write to
 * @param {string} content the contents to write to the file
 */
exports.writeFileSyncRecursive = (filepath, content = '') => {
  mkdirSyncIfMissing(path.dirname(filepath));
  fs.writeFileSync(filepath, content);
};

/**
 * Move a directory into another directory. Will create the destination folder if it doesn't exist
 * 
 * @param {string} source the directory to move
 * @param {string} dest the path to move the source directory into
 */
exports.moveFileOrDirIntoDirSync = (source, dest) => {
  dest = path.resolve(dest, path.basename(source));
  if (fs.lstatSync(source).isDirectory()) {
    mkdirSyncIfMissing(dest);
  } else {
    mkdirSyncIfMissing(path.dirname(dest));
  }
  moveSync(source, dest, { overwrite: true });
}

/**
 * Sort an object relative to the alphabetical order of its' keys
 * 
 * @param {Object} obj the object to sort
 */
exports.sortObject = obj => Object.keys(obj).sort().reduce((res, key) => (res[key] = obj[key], res), {});

/**
 * Executes the callback func when the module path satisfies the given string match conditions
 * 
 * @param {Object} msg the prefix to the console message
 * @param {Object} modules the modules object to match against the argv
 * @param {requestCallback} callback the callback to execute for successful matches
 */
const modulePathsContainingProcess = (msg, modules, callback) => {
  const pathscontaining = (array, searchmode) => {
    if (!array || !array.length) {
      return;
    }

    let modulesToProcess = [];
    Object.keys(modules).forEach((moduleName) => {
      const modulePath = modules[moduleName];
      if (searchmode === 'every') {
        if (!array.every(el => modulePath.includes(el))) {
          return;
        }
      } else if (!array.some(el => modulePath.includes(el))) {
        return;
      }
      modulesToProcess.push(moduleName);
    });

    if (array.length === 1) {
      console.log(`${msg} all ${mname} modules that contain the string "${array}" in their paths (${modulesToProcess.length} total)...`);
    } else {
      console.log(`${msg} all ${mname} modules that contain ${searchmode === 'every' ? 'all' : 'any'} of the strings ["${array.join('", "')}"] in their paths (${modulesToProcess.length} total)...`);
    }

    if (modulesToProcess.length) {
      modulesToProcess.forEach((moduleName) => {
        callback(moduleName);
      });
    } else if (array.length === 1) {
      warn(`No modules were found containing the path: "${array}"`);
    } else {
      warn(`No modules were found containing the paths: ["${array.join('", "')}"]`);
    }
  }

  pathscontaining(argv.pathscontainingevery, 'every');
  pathscontaining(argv.pathscontainingsome, 'some');
}

/**
 * Process the argv
 * 
 * @param {Object} obj an object containing the conditions for argv.all, argv.modules, argv.pathscontainingevery & argv.pathscontainingsome
 */
exports.argvProcess = (obj) => {
  if (argv.all || (obj.defaultAll && !argv.modules && !argv.pathscontainingevery && !argv.pathscontainingsome && argv.all !== false)) {
    if (!argv.all) {//must be executing by default!
      console.log('NOTE: The --all argument is automatically used for this command unless specified otherwise (see readme for more details)')
    }
    if (obj.msg === 'Registering') {
      console.log(`Registering all modules (${Object.keys(obj.modules).length} total)...`);
    } else {
      console.log(`${obj.msg} all ${mname} ${obj.msg === 'Delinking' || obj.msg === 'Checking' ? 'linked' : 'registered'} modules (${Object.keys(obj.modules).length} total)...`);
    }
    Object.keys(obj.modules).forEach(obj.func);
  } else {
    if (!argv.modules && !argv.pathscontainingevery && !argv.pathscontainingsome) {
      error('No arguments were supplied, so nothing was done!');
      return
    }

    if (argv.modules?.length) {
      if (argv.modules.length === 1) {
        console.log(`${obj.msg} ${mname} module with name "${argv.modules}"...`)
      } else {
        console.log(`${obj.msg} ${mname} modules with names ["${argv.modules.join('", "')}"] (${argv.modules.length} total)...`)
      }
      argv.modules.forEach(obj.specifiedModulesFunc);
    }

    modulePathsContainingProcess(obj.msg, obj.modules, obj.func);
  }
}

/**
 * Recursively walk through all files within a directory
 * 
 * @param {string} dir the directory to walk through
 * @param {requestCallback} callback the callback to execute for every file
 * @param {Object} ignorePaths array of strings to ignore in filepaths
 */
exports.walkSync = (dir, callback, ignorePaths = []) => {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filepath = path.join(dir, file);

    for (const ignorePath of ignorePaths) {
      if (filepath.includes(ignorePath)) {
        return;
      }
    }

    if (!fs.existsSync(filepath)) {
      return;
    }

    try {
      const stats = fs.statSync(filepath);

      if (stats.isDirectory()) {
        walkSync(filepath, callback, ignorePaths);
      } else if (stats.isFile()) {
        callback(filepath, stats);
      }
    } catch (err) {
      console.log(err)
    }
  });
};

/**
 * Returns an array of package.json file locations within a directory
 * 
 * @param {string} dir the directory to walk through
 * @param {Object} ignorePaths array of strings to ignore in filepaths
 * @returns {Object} array of package.json paths
 */
exports.findPackages = (dir, ignorePaths) => {
  const output = [];

  walkSync(dir, (path) => {
    if (path.endsWith('package.json')) {
      output.push(path);
    }
  }, ignorePaths);

  return output;
};
