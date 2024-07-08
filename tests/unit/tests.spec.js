const { spawn } = require('child_process');
const path = require('path');
const { path: appRoot } = require('app-root-path');
const fs = require('fs-extra');

const pkg = require(path.resolve(appRoot, 'package.json'));

const homedir = path.resolve(appRoot, 'tests');

const mocksDir = path.resolve(appRoot, 'tests', 'mocks');

const registeredPath = path.resolve(homedir, '.nslm', 'modules.json');

const deleteTempFiles = (dir) => {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filepath = path.join(dir, file);

    if (!fs.existsSync(filepath)) {
      return;
    }

    if (filepath.endsWith('node_modules') || filepath.endsWith('.nslm')) {
      fs.rmSync(filepath, { recursive: true });
      return;
    }

    const stats = fs.statSync(filepath);

    if (stats.isDirectory()) {
      deleteTempFiles(filepath);
    }
  });
};

// const dirBuffer = (dir) => {
//   const files = fs.readdirSync(dir);

//   const arr = [];

//   files.forEach((file) => {
//     const filepath = path.join(dir, file);

//     if (!fs.existsSync(filepath)) {
//       return;
//     }

//     const stats = fs.statSync(filepath);

//     if (stats.isDirectory()) {
//       arr.concat(dirBuffer(filepath));
//       return;
//     }

//     arr.push(fs.readFileSync(filepath));
//   });

//   return arr;
// }

async function runNslmCmd(cmd, subdir = '') {
  const logs = [];

  const spawnProcess = spawn('bash', ['-c',
    [
      'node',
      `"${path.resolve(pkg.bin.nslm)}"`,
      cmd,
      `--homedir="${homedir}"`
    ].join(' '),
  ], { cwd: path.resolve(mocksDir, subdir) });

  spawnProcess.stdout.on('data', (data) => {
    logs.push(data.toString());
  });

  spawnProcess.stderr.on('data', (data) => {
    logs.push(data.toString());
  });

  return new Promise((resolve, reject) => {
    spawnProcess.on('close', async () => {
      const logStr = logs.join('').trim();

      if (logStr.includes('SystemError')) {
        reject(logStr);
      } else {
        resolve(logStr);
      }
    });
  }).catch(e => {
    throw new Error(e)
  });
}

const fakeNpmInstall = (dest, modules) => {
  modules.forEach((module) => {
    fs.copySync(path.resolve(mocksDir, module), path.resolve(mocksDir, dest, 'node_modules', module));

    // create an extra file to simulate a published module with different contents
    fs.writeFileSync(path.resolve(mocksDir, dest, 'node_modules', module, 'folder', 'extra-file.txt'), 'hello world');
  });
}

describe('nslm', () => {
  beforeAll(() => {
    deleteTempFiles(path.dirname(mocksDir));
  });

  beforeEach(() => {
    expect(fs.existsSync(registeredPath)).toBe(false);
  });

  afterEach(() => {
    deleteTempFiles(path.dirname(mocksDir));
  });

  describe('register', () => {
    describe('does nothing', () => {
      it('if a module has already been registered', async () => {
        await runNslmCmd('register');
        const json1 = JSON.parse(fs.readFileSync(registeredPath));

        const output = await runNslmCmd('register');
        const json2 = JSON.parse(fs.readFileSync(registeredPath));

        expect(JSON.stringify(json1)).toBe(JSON.stringify(json2));

        expect(output.includes('Module "mock_repo1" has already been registered at location')).toBe(true);
        expect(output.includes('Module "mock_repo2" has already been registered at location')).toBe(true);
      });

      it('if package.json doesn\'t exist', async () => {
        const output = await runNslmCmd('register', 'empty_folder');

        const json = JSON.parse(fs.readFileSync(registeredPath));

        expect(output.includes('Searching directories for package.json... 0 found!')).toBe(true);
        expect(output.includes('0 new modules were registered')).toBe(true);
        expect(Object.values(json)).toHaveLength(0);
      });
    })

    it('registers all node modules by default', async () => {
      const output = await runNslmCmd('register');

      expect(output.includes('The --all argument is automatically used for this command')).toBe(true);
      expect(output.includes('4 new modules were registered')).toBe(true);

      const json = JSON.parse(fs.readFileSync(registeredPath));

      expect(Object.values(json)).toHaveLength(4);

      expect(json.mock_repo1).toBe(path.resolve(mocksDir, 'mock_repo1'));
      expect(json.mock_repo2).toBe(path.resolve(mocksDir, 'mock_repo2'));
      expect(json.mock_repo3).toBe(path.resolve(mocksDir, 'mock_repo3'));
      expect(json.mock_repo_in_a_subfolder).toBe(path.resolve(mocksDir, 'subfolder', 'mock_repo_in_a_subfolder'));
    });

    it('registers only specific node modules when given', async () => {
      const output = await runNslmCmd('register --modules mock_repo1');

      expect(output.includes('The --all argument is automatically used for this command')).toBe(false);
      expect(output.includes('1 new module was registered')).toBe(true);

      const json = JSON.parse(fs.readFileSync(registeredPath));

      expect(Object.values(json)).toHaveLength(1);

      expect(json.mock_repo1).toBe(path.resolve(mocksDir, 'mock_repo1'));
    });

    it('doesn\'t register the module if it doesn\'t have a name field', async () => {
      const output = await runNslmCmd('register', 'mock_repo_missing_name');

      const json = JSON.parse(fs.readFileSync(registeredPath));

      expect(output.includes('does not have a name field! Skipping')).toBe(true);
      expect(output.includes('0 new modules were registered')).toBe(true);
      expect(Object.values(json)).toHaveLength(0);
    });

    it('doesn\'t register a module if it\'s a child of node_modules', async () => {
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);
      await runNslmCmd('register', 'mock_repo1');

      const json = JSON.parse(fs.readFileSync(registeredPath));

      expect(Object.values(json)).toHaveLength(1);
      expect(json.mock_repo1).toBe(path.resolve(mocksDir, 'mock_repo1'));
    });
  });

  describe('deregister', () => {
    it('deletes the specified node module indexes', async () => {
      await runNslmCmd('register');
      const json1 = JSON.parse(fs.readFileSync(registeredPath));

      expect(Object.values(json1)).toHaveLength(4);
      expect(json1.mock_repo1).toBe(path.resolve(mocksDir, 'mock_repo1'));

      await runNslmCmd('deregister --modules mock_repo1');
      const json2 = JSON.parse(fs.readFileSync(registeredPath));

      expect(Object.values(json2)).toHaveLength(3);
      expect(json2.mock_repo1).toBeUndefined();
    });

    it('deletes the register file when deregistering all node modules', async () => {
      await runNslmCmd('register');
      await runNslmCmd('deregister -a');

      expect(fs.existsSync(registeredPath)).toBe(false);
    });

    it('deletes the register file when no node modules remain', async () => {
      await runNslmCmd('register --modules mock_repo1');
      await runNslmCmd('deregister --modules mock_repo1');

      expect(fs.existsSync(registeredPath)).toBe(false);
    });
  });

  describe('link', () => {
    describe('does nothing', () => {
      it('if nothing has been registered', async () => {

        const output = await runNslmCmd('link');

        expect(output.includes('You need to register at least one module')).toBe(true)
      });

      it('if no arguments are given', async () => {
        await runNslmCmd('register');
        const output = await runNslmCmd('link');

        expect(output.includes('No arguments were supplied')).toBe(true);
        expect(output.includes('No modules were linked')).toBe(true);
      });

      it('if the specified node modules don\'t exist', async () => {
        await runNslmCmd('register');
        const output = await runNslmCmd('link --modules does-not-exist');

        expect(output.includes('Module "does-not-exist" hasn\'t been registered to nslm and has been skipped as a result')).toBe(true);
        expect(output.includes('No modules were linked')).toBe(true);
      });

      it('if the module isn\'t already installed within the recipient module', async () => {
        await runNslmCmd('register');
        const output = await runNslmCmd('link --modules mock_repo1', 'mock_repo2');

        expect(output.includes('Module "mock_repo1" doesn\'t exist in mock_repo2/node_modules and has been skipped as a result')).toBe(true);
        expect(output.includes('No modules were linked')).toBe(true);
      });
    });

    it('links the specified modules if they\'re installed within the recipient module', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      const output = await runNslmCmd('link --modules mock_repo2 mock_repo3', 'mock_repo1');
      expect(output.includes('2 modules were linked successfully')).toBe(true);
      expect(output.includes('All directories have been copied')).toBe(false);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(mock_repo2).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo2)).toBe(path.resolve(mocksDir, 'mock_repo2'));

      const mock_repo3 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo3');
      expect(fs.lstatSync(mock_repo3).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo3)).toBe(path.resolve(mocksDir, 'mock_repo3'));
    });

    it('links the specified modules if the --allowmissing flag is given', async () => {
      await runNslmCmd('register');

      const output = await runNslmCmd('link --modules mock_repo2 mock_repo3 --allowmissing', 'mock_repo1');
      expect(output.includes('--allowmissing flag is active')).toBe(true);
      expect(output.includes('2 modules were linked successfully')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(mock_repo2).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo2)).toBe(path.resolve(mocksDir, 'mock_repo2'));

      const mock_repo3 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo3');
      expect(fs.lstatSync(mock_repo3).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo3)).toBe(path.resolve(mocksDir, 'mock_repo3'));
    });

    it('links the specified subdirectories if they\'re installed within the recipient module', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      const output = await runNslmCmd('link --modules mock_repo2 mock_repo3 --subdirs folder folder2', 'mock_repo1');
      expect(output.includes('4 subdirs were linked successfully')).toBe(true);
      expect(output.includes('mocks/mock_repo2/folder"')).toBe(true);
      expect(output.includes('mocks/mock_repo3/folder"')).toBe(true);
      expect(output.includes('mocks/mock_repo2/folder2"')).toBe(true);
      expect(output.includes('mocks/mock_repo3/folder2"')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(path.resolve(mock_repo2, 'folder')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.resolve(mock_repo2, 'folder2')).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(path.resolve(mock_repo2, 'folder'))).toBe(path.resolve(mocksDir, 'mock_repo2', 'folder'));
      expect(fs.realpathSync(path.resolve(mock_repo2, 'folder2'))).toBe(path.resolve(mocksDir, 'mock_repo2', 'folder2'));

      const mock_repo3 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo3');
      expect(fs.lstatSync(path.resolve(mock_repo3, 'folder')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.resolve(mock_repo3, 'folder2')).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(path.resolve(mock_repo3, 'folder'))).toBe(path.resolve(mocksDir, 'mock_repo3', 'folder'));
      expect(fs.realpathSync(path.resolve(mock_repo3, 'folder2'))).toBe(path.resolve(mocksDir, 'mock_repo3', 'folder2'));
    });

    it('links the specified modules in copy mode', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      const output = await runNslmCmd('link --modules mock_repo2 mock_repo3 --linktype copy', 'mock_repo1');
      expect(output.includes('2 modules were linked successfully')).toBe(true);
      expect(output.includes('All directories have been copied')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(mock_repo2).isSymbolicLink()).toBe(false);
      expect(fs.existsSync(path.resolve(mock_repo2, '.nslm-copied-dir'))).toBe(true);
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', 'extra-file.txt'))).toBe(false);

      const mock_repo3 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo3');
      expect(fs.lstatSync(mock_repo3).isSymbolicLink()).toBe(false);
      expect(fs.existsSync(path.resolve(mock_repo3, '.nslm-copied-dir'))).toBe(true);
      expect(fs.existsSync(path.resolve(mock_repo3, 'folder', 'extra-file.txt'))).toBe(false);
    });

    it('links the specified subdirectories in copy mode', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      const output = await runNslmCmd('link --modules mock_repo2 mock_repo3 --linktype copy --subdirs folder folder2', 'mock_repo1');
      expect(output.includes('4 subdirs were linked successfully')).toBe(true);
      expect(output.includes('All directories have been copied')).toBe(true);
      expect(output.includes('mocks/mock_repo2/folder"')).toBe(true);
      expect(output.includes('mocks/mock_repo3/folder"')).toBe(true);
      expect(output.includes('mocks/mock_repo2/folder2"')).toBe(true);
      expect(output.includes('mocks/mock_repo3/folder2"')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(mock_repo2).isSymbolicLink()).toBe(false);
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', '.nslm-copied-dir'))).toBe(true);
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', 'extra-file.txt'))).toBe(false);

      const mock_repo3 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo3');
      expect(fs.lstatSync(mock_repo3).isSymbolicLink()).toBe(false);
      expect(fs.existsSync(path.resolve(mock_repo3, 'folder', '.nslm-copied-dir'))).toBe(true);
      expect(fs.existsSync(path.resolve(mock_repo3, 'folder', 'extra-file.txt'))).toBe(false);
    });
  });

  describe('delink', () => {
    describe('does nothing', () => {
      it('if nothing\'s been linked', async () => {
        const output = await runNslmCmd('delink -a', 'mock_repo1');

        expect(output.includes('.nslm directory was not found')).toBe(true);
      });

      it('if no arguments are provided', async () => {
        await runNslmCmd('register');
        fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);
        await runNslmCmd('link --modules mock_repo2 mock_repo3', 'mock_repo1');

        const output = await runNslmCmd('delink', 'mock_repo1');
        expect(output.includes('No arguments were supplied, so nothing was done')).toBe(true);
        expect(output.includes('No modules were delinked')).toBe(true);
      });

      it('if an invalid module is provided', async () => {
        await runNslmCmd('register');
        fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);
        await runNslmCmd('link --modules mock_repo2 mock_repo3', 'mock_repo1');

        const output = await runNslmCmd('delink --modules not_a_repo', 'mock_repo1');
        expect(output.includes('Delinking nslm module with name "not_a_repo"')).toBe(true);
        expect(output.includes('No modules were delinked')).toBe(true);
      });
    });

    it('delinks the specified modules', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      await runNslmCmd('link --modules mock_repo2 mock_repo3', 'mock_repo1');

      const output = await runNslmCmd('delink --modules mock_repo2', 'mock_repo1');
      expect(output.includes('"mock_repo1/node_modules/mock_repo2"')).toBe(true);
      expect(output.includes('delinked & restored from backup')).toBe(true);
      expect(output.includes('1 module was delinked successfully')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(mock_repo2).isSymbolicLink()).toBe(false);

      const mock_repo3 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo3');
      expect(fs.lstatSync(mock_repo3).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo3)).toBe(path.resolve(mocksDir, 'mock_repo3'));
    });

    it('deletes the backups folder if everything\'s been delinked', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      await runNslmCmd('link --modules mock_repo2 mock_repo3', 'mock_repo1');
      expect(fs.existsSync(path.resolve(mocksDir, 'mock_repo1', '.nslm'))).toBe(true);

      await runNslmCmd('delink -a', 'mock_repo1');
      expect(fs.existsSync(path.resolve(mocksDir, 'mock_repo1', '.nslm'))).toBe(false);
    });

    it('delinks but doesn\'t restore from backup if the backup has been deleted', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      await runNslmCmd('link --modules mock_repo2', 'mock_repo1');

      // simulate a user deleting the backup manually
      fs.rmSync(path.resolve(mocksDir, 'mock_repo1', '.nslm', 'node_modules', 'mock_repo2'), { recursive: true });

      const output = await runNslmCmd('delink -a', 'mock_repo1');
      expect(output.includes('"mock_repo1/node_modules/mock_repo2"')).toBe(true);
      expect(output.includes('delinked but has not been restored as it has no backup')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.existsSync(mock_repo2)).toBe(false);
    });

    it('delinks the specified modules when linked in copy mode', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');

      // extra file should be present in the npm installed module
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', 'extra-file.txt'))).toBe(true);

      await runNslmCmd('link --modules mock_repo2 --linktype copy', 'mock_repo1');

      // extra file should NOT be present in the nslm linked module
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', 'extra-file.txt'))).toBe(false);

      const output = await runNslmCmd('delink -a', 'mock_repo1');
      expect(output.includes('"mock_repo1/node_modules/mock_repo2"')).toBe(true);
      expect(output.includes('delinked & restored from backup')).toBe(true);
      expect(output.includes('1 module was delinked successfully')).toBe(true);

      // extra file should be present in the npm installed module
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', 'extra-file.txt'))).toBe(true);
    });

    it('delinks the specified subdirectories when linked in copy mode', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');

      // extra file should be present in the npm installed module
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', 'extra-file.txt'))).toBe(true);

      await runNslmCmd('link --modules mock_repo2 --linktype copy --subdirs folder folder2', 'mock_repo1');

      // extra file should NOT be present in the npm installed module
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', 'extra-file.txt'))).toBe(false);

      const output = await runNslmCmd('delink -a', 'mock_repo1');
      expect(output.includes('"mock_repo1/node_modules/mock_repo2/folder"')).toBe(true);
      expect(output.includes('delinked & restored from backup')).toBe(true);
      expect(output.includes('2 modules were delinked successfully')).toBe(true);

      // extra file should be present in the npm installed module
      expect(fs.existsSync(path.resolve(mock_repo2, 'folder', 'extra-file.txt'))).toBe(true);
    });
  });

  describe('check-links', () => {
    describe('does nothing', () => {
      it('if nothing has been linked', async () => {
        const output = await runNslmCmd('check');
        expect(output.includes('It doesn\'t look like you have linked any nslm modules')).toBe(true)
      });
    });

    it('verifies working links', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      await runNslmCmd('link --modules mock_repo2', 'mock_repo1');

      const output = await runNslmCmd('check', 'mock_repo1');
      expect(output.includes('"mock_repo1/node_modules/mock_repo2"')).toBe(true);
      expect(output.includes('is pointing to')).toBe(true);
      expect(output.includes('The links for all 1 checked modules are OK')).toBe(true);
    });

    it('verifies broken links', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      await runNslmCmd('link --modules mock_repo2', 'mock_repo1');

      // simulate a user deleting the link
      fs.rmSync(path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2'), { recursive: true });

      const output = await runNslmCmd('check', 'mock_repo1');
      expect(output.includes('"mock_repo1/node_modules/mock_repo2"')).toBe(true);
      expect(output.includes('is NOT pointing to')).toBe(true);
      expect(output.includes('1 of 1 checked modules need relinking')).toBe(true);
      expect(output.includes('1 of 1 checked modules need relinking! Fixing...')).toBe(false);
    });

    it('fixes broken links if the fix argument is given', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      await runNslmCmd('link --modules mock_repo2', 'mock_repo1');

      // simulate a user deleting the link
      fs.rmSync(path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2'), { recursive: true });

      const output = await runNslmCmd('check --fix', 'mock_repo1');
      expect(output.includes('1 of 1 checked modules need relinking! Fixing...')).toBe(true);
      expect(output.includes('1 module was linked successfully')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(mock_repo2).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo2)).toBe(path.resolve(mocksDir, 'mock_repo2'));
    });
  });

  describe('help', () => {
    it('matches the snapshot', async () => {
      const output = await runNslmCmd('help');
      expect(output).toMatchSnapshot();
    });
  });

  describe('version', () => {
    it('return the version number', async () => {
      const output = await runNslmCmd('version');
      expect(output).toBe(`v${pkg.version}`);
    });
  });
});
