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

  return new Promise((resolve) => {
    spawnProcess.on('close', async () => resolve(logs.join('').trim()));
  });
}

const fakeNpmInstall = (dest, modules) => {
  modules.forEach((module) => {
    fs.copySync(path.resolve(mocksDir, module), path.resolve(mocksDir, dest, 'node_modules', module));
  });
}

describe('nslm', () => {
  beforeEach(() => {
    expect(fs.existsSync(registeredPath)).toBe(false);
  });

  afterEach(() => {
    deleteTempFiles(path.dirname(mocksDir));
  });

  describe('register', () => {

    it('registers the mock node modules', async () => {
      await runNslmCmd('register');

      const json = JSON.parse(fs.readFileSync(registeredPath));

      expect(Object.values(json)).toHaveLength(4);

      expect(json.mock_repo1).toBe(path.resolve(mocksDir, 'mock_repo1'));
      expect(json.mock_repo2).toBe(path.resolve(mocksDir, 'mock_repo2'));
      expect(json.mock_repo3).toBe(path.resolve(mocksDir, 'mock_repo3'));
      expect(json.mock_repo_in_a_subfolder).toBe(path.resolve(mocksDir, 'subfolder', 'mock_repo_in_a_subfolder'));
    });

    it('doesn\'t register the module if it doesn\'t have a name field', async () => {
      const output = await runNslmCmd('register', 'mock_repo_missing_name');

      const json = JSON.parse(fs.readFileSync(registeredPath));

      expect(output.includes('does not have a name field! Skipping')).toBe(true);
      expect(output.includes('0 new modules were registered')).toBe(true);
      expect(Object.values(json)).toHaveLength(0);
    });

    it('does nothing if a module has already been registered', async () => {
      await runNslmCmd('register');
      const json1 = JSON.parse(fs.readFileSync(registeredPath));

      const output = await runNslmCmd('register');
      const json2 = JSON.parse(fs.readFileSync(registeredPath));

      expect(JSON.stringify(json1)).toBe(JSON.stringify(json2));

      expect(output.includes('Module "mock_repo1" has already been registered at location')).toBe(true);
      expect(output.includes('Module "mock_repo2" has already been registered at location')).toBe(true);
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
  });

  describe('link', () => {
    describe('does nothing', () => {
      it('if no arguments are given', async () => {
        const output = await runNslmCmd('link');

        expect(output.includes('You need to register at least one module')).toBe(true)
      });

      it('if nothing has been registered', async () => {
        await runNslmCmd('register');
        const output = await runNslmCmd('link');

        expect(output.includes('No arguments were supplied')).toBe(true);
        expect(output.includes('No modules were linked')).toBe(true);
      });

      it('if no the specified node modules don\'t exist', async () => {
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

    it('links the specified modules', async () => {
      await runNslmCmd('register');
      fakeNpmInstall('mock_repo1', ['mock_repo2', 'mock_repo3']);

      const output = await runNslmCmd('link --modules mock_repo2 mock_repo3', 'mock_repo1');
      expect(output.includes('2 modules were linked successfully')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(mock_repo2).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo2)).toBe(path.resolve(mocksDir, 'mock_repo2'));

      const mock_repo3 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo3');
      expect(fs.lstatSync(mock_repo3).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo3)).toBe(path.resolve(mocksDir, 'mock_repo3'));
    });

    it('links the specified missing modules if the --allowmissing flag is given', async () => {
      await runNslmCmd('register');

      const output = await runNslmCmd('link --modules mock_repo2 mock_repo3 --allowmissing', 'mock_repo1');
      expect(output.includes('2 modules were linked successfully')).toBe(true);

      const mock_repo2 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo2');
      expect(fs.lstatSync(mock_repo2).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo2)).toBe(path.resolve(mocksDir, 'mock_repo2'));

      const mock_repo3 = path.resolve(mocksDir, 'mock_repo1', 'node_modules', 'mock_repo3');
      expect(fs.lstatSync(mock_repo3).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(mock_repo3)).toBe(path.resolve(mocksDir, 'mock_repo3'));
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
