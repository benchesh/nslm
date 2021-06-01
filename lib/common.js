const { execFileSync } = require('child_process');
const { deleteFolderRecursive } = require('./deleteFolderRecursive.js');

exports.path = require('path');
exports.homedir = require('os').homedir();
exports.mname = require('../package.json').name;
exports.fs = require('fs');
exports.writeFileSyncRecursive = require('./writeFileSyncRecursive.js').writeFileSyncRecursive;
exports.localModuleJsonPath = exports.path.resolve(`.${exports.mname}`, 'modules.json');

//for console logs
exports.green = (s) => '\033[1;32m' + s + '\033[0m';
exports.orange = (s) => '\033[1;33m' + s + '\033[0m';
exports.red = (s) => '\033[1;31m' + s + '\033[0m';
exports.warn = (s) => console.warn(orange(`WARNING: ${s}`));
exports.error = (s) => console.error(red(`ERROR: ${s}`));

/**
 * Get a substring after the final slash
 * 
 * @param {string} s string to process
 */
exports.basename = (s) => s.substring(s.lastIndexOf('/') + 1);

/**
 * Get a substring before the final slash
 * 
 * @param {string} s string to process
 */
exports.dirname = (s) => s.substring(0, s.lastIndexOf('/'));

/**
 * Convert a JSON file to a JS object. Will return an empty object if the file isn't found
 * 
 * @param {string} path the path to the JSON file
 */
exports.jsonFileToJSObj = (path) => exports.fs.existsSync(path) ? JSON.parse(exports.fs.readFileSync(path)) : {}

/**
 * Get the registered nslm modules
 */
exports.reg_modules = {
  path: exports.path.resolve(exports.homedir, `.${exports.mname}`, 'modules.json'),
  getData: () => exports.jsonFileToJSObj(this.reg_modules.path)
}

/**
 * Get a substring before the final slash
 * 
 * @param {string} s name of shellscript
 * @param {Object} arg array of shell arguments
 */
exports.runShellFile = (s, arg = []) => String(execFileSync(exports.path.resolve(__dirname, 'shell', s), typeof arg !== 'object' ? [arg] : arg)).trim();

/**
 * Wrapper for unlinkSync to prevent crashes
 * 
 * @param {string} s path of file to remove
 */
exports.tryCatchDelete = (s) => {
  try {
    if (exports.fs.lstatSync(s).isDirectory()) {
      deleteFolderRecursive(s);
      return;
    }
  } catch (err) { }
  try {
    exports.fs.unlinkSync(s);
  } catch (err) { }
}

/**
 * Recursively create a path if it doesn't exist
 * 
 * @param {string} str the path to check and create
 */
exports.mkdirSyncIfMissing = (s) => !exports.fs.existsSync(s) && exports.fs.mkdirSync(s, { recursive: true });

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
      console.log(`${obj.msg} all ${exports.mname} ${obj.msg === 'Delinking' || obj.msg === 'Checking' ? 'linked' : 'registered'} modules (${Object.keys(obj.modules).length} total)...`);
    }
    Object.keys(obj.modules).forEach(obj.func);
  } else {
    if (!argv.modules && !argv.pathscontainingevery && !argv.pathscontainingsome) {
      error('No arguments were supplied, so nothing was done!');
      return
    }

    if (argv.modules && argv.modules.length) {
      if (argv.modules.length === 1) {
        console.log(`${obj.msg} ${exports.mname} module with name "${argv.modules}"...`)
      } else {
        console.log(`${obj.msg} ${exports.mname} modules with names ["${argv.modules.join('", "')}"] (${argv.modules.length} total)...`)
      }
      argv.modules.forEach(obj.specifiedModulesFunc);
    }

    modulePathsContainingProcess(obj.msg, obj.modules, obj.func);
  }
}
