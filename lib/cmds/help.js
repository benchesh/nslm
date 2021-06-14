/**
 * Show help
 */
exports.run = () => {
  const fileOrder = [
    'register',
    'deregister',
    'link',
    'delink',
    'check-links',
    'help',
    'version',
  ];

  let fileOutput = [];
  fileOrder.forEach((file) => {
    let output = (() => {
      let output = file;
      for (let alias in aliases[file]) {
        output += ` / ${aliases[file][alias]}`;
      }
      for (let i = output.length; i < 60; i++) {
        output += ' ';
      }
      return output;
    })();

    fileOutput.push(
      '\n  nslm ' +
      output +
      fs.readFileSync(path.resolve(__dirname, `${file}.js`), 'utf8')
        .split('exports.')[0].split('/**')[1]
        .split('*/')[0].replace(/\*/g, '')
        .trim()
        .replace(/\n/g, '. ')
        .replace(/[ ]{2,}/g, ' ')
        .replace(/[.]{2,}/g, '.')
        .trim()
    );
  });

  const output = 'Commands:';
  console.log(`${output}${fileOutput.join('')}`);
};
