const { spawn } = require('child_process');
const path = require('path');
const { path: appRoot } = require('app-root-path');
const fs = require('fs');

const pkg = require(path.resolve(appRoot, 'package.json'));

const homedir = path.resolve(appRoot, 'tests');

const mocksDir = path.resolve(appRoot, 'tests', 'mocks');

const registeredPath = path.resolve(homedir, '.nslm', 'modules.json');

async function runNslmCmd(cmd, module = '') {
  const logs = [];

  const spawnProcess = spawn('bash', ['-c',
    [
      'node',
      `"${path.resolve(pkg.bin.nslm)}"`,
      cmd,
      `--homedir="${homedir}"`
    ].join(' '),
  ], { cwd: path.resolve(mocksDir, module) });

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

describe('nslm', () => {
  afterEach(() => {
    if (fs.existsSync(registeredPath)) fs.rmSync(registeredPath);
  });

  describe('register', () => {

    it('registers the mock node modules', async () => {
      await runNslmCmd('register');

      const json = JSON.parse(fs.readFileSync(registeredPath));

      expect(Object.values(json)).toHaveLength(2);

      expect(json.mock_repo1).toBe(path.resolve(mocksDir, 'mock_repo1'));
      expect(json.mock_repo2).toBe(path.resolve(mocksDir, 'mock_repo2'));
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
  });

  describe('deregister', () => {
    it('delete the specified node module indexes', async () => {
      await runNslmCmd('register');
      const output = await runNslmCmd('deregister --modules mock_repo1');
      const json = JSON.parse(fs.readFileSync(registeredPath));

      expect(Object.values(json)).toHaveLength(1);

      expect(json.mock_repo2).toBe(path.resolve(mocksDir, 'mock_repo2'));
    });

    it('delete the register file when deregistering all node modules', async () => {
      await runNslmCmd('register');
      await runNslmCmd('deregister -a');

      expect(fs.existsSync(registeredPath)).toBe(false);
    });
  });

  describe('link', () => {
    it('delete the specified node module indexes', async () => {
      const output = await runNslmCmd('link');

      expect(Object.values(json)).toHaveLength(1);

      expect(json.mock_repo2).toBe(path.resolve(mocksDir, 'mock_repo2'));
    });

    it('delete the register file when deregistering all node modules', async () => {
      await runNslmCmd('register');
      await runNslmCmd('deregister -a');

      expect(fs.existsSync(registeredPath)).toBe(false);
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
