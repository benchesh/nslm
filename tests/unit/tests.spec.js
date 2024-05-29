const { spawn } = require('child_process');
const path = require('path');
const { path: appRoot } = require('app-root-path');
const fs = require('fs');

const pkg = require(path.resolve(appRoot,'package.json'));

async function runNslmCmd(cmd) {
  const logs = [];

  const spawnProcess = spawn('bash', ['-c',
    [
      'node',
      pkg.bin.nslm,
      cmd,
      `--homedir="${path.resolve(appRoot, 'tests')}"`
    ].join(' '),
  ], { cwd: appRoot });

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
  // describe('register', () => {

  //   it('should register the mock node modules', async () => {
  //     const test = await runNslmCmd('register');
  //     console.log(test)
  //   });
  // });

  describe('help', () => {
    it('matches the snapshot', async () => {
      const output = await runNslmCmd('help');
      expect(output).toMatchSnapshot();
    });
  });

  describe('version', () => {
    it('should return the version number', async () => {
      const output = await runNslmCmd('version');
      expect(output).toBe(`v${pkg.version}`);
    });
  });
});
