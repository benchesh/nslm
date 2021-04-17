const { execFileSync } = require('child_process');
const { deleteFolderRecursive } = require('./deleteFolderRecursive.js');

exports.path = require('path');
exports.homedir = require('os').homedir();
exports.mname = require('../package.json').name;
exports.fs = require('fs');
exports.writeFileSyncRecursive = require('./writeFileSyncRecursive.js').writeFileSyncRecursive;

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
 * Get the registered snoke modules
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
 * @param {Object} modules the list of registered modules w/ their full paths
 * @param {Object} array the array of strings to match against the module paths
 * @param {string} searchmode the search condition (match every or match some)
 * @param {requestCallback} callback the callback to execute for successful matches
 */
exports.modulePathsContainingProcess = (modules, array, searchmode, callback) => {
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
    callback(moduleName);
    pathscontainingFound = true;
  });
  if (!pathscontainingFound) {
    if (array.length===1) {
      warn(`No modules were found containing the path: "${array}"`);
    } else {
      warn(`No modules were found containing the paths: ["${array.join('", "')}"]`);
    }
  }
}