const { execFileSync } = require('child_process');
const { deleteFolderRecursive } = require('./deleteFolderRecursive.js');

const path = require('path');
const homedir = require('os').homedir();
const mname = require('../package.json').name;
const fs = require('fs');

exports.path = path;
exports.homedir = homedir;
exports.mname = mname;
exports.fs = fs;

//for console logs
exports.green = (s) => '\033[1;32m' + s + '\033[0m';
exports.orange = (s) => '\033[1;33m' + s + '\033[0m';
exports.red = (s) => '\033[1;31m' + s + '\033[0m';
exports.warn = (s) => console.warn(orange(`WARNING: ${s}`));
exports.error = (s) => console.error(red(`ERROR: ${s}`));

exports.yargs = require('yargs/yargs');

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
 * Get the registered snoke modules
 */
exports.reg_modules = {
  path: path.resolve(homedir, `.${mname}`, 'modules.json'),
  getData: () => fs.existsSync(this.reg_modules.path) ? JSON.parse(fs.readFileSync(this.reg_modules.path)) : {}
}

/**
 * Get a substring before the final slash
 * 
 * @param {string} s name of shellscript
 * @param {Object} arg array of shell arguments
 */
exports.runShellFile = (s, arg = []) => String(execFileSync(path.resolve(__dirname, 'shell', s), typeof arg !== 'object' ? [arg] : arg)).trim();

/**
 * Wrapper for unlinkSync to prevent crashes
 * 
 * @param {string} s path of file to remove
 */
exports.tryCatchDelete = (s) => {
  try {
    if (fs.lstatSync(s).isDirectory()) {
      deleteFolderRecursive(s);
      return;
    }
  } catch (err) { }
  try {
    fs.unlinkSync(s);
  } catch (err) { }
}

/**
 * Append an s to a string if a given number is not 1
 * 
 * @param {string} str the string to modify
 * @param {number|Object} num the number or object size to determine the result
 */
exports.pluralise = (str, num) => {
  if (typeof num === 'object') {
    num = Object.keys(num).length;
  }
  return str + (parseInt(num) !== 1 && !str.endsWith('s') ? 's' : '');
}

/**
 * Recursively create a path if it doesn't exist
 * 
 * @param {string} str the path to check and create
 */
exports.mkdirSyncIfMissing = (s) => !fs.existsSync(s) && fs.mkdirSync(s, { recursive: true });
