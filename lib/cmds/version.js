/**
 * Show version number
 */
exports.run = () => {
  console.log(`v${mver.replace(/^v/g, '')}`);
};
