exports.importAll = () => {
  return {
    mod: null,
    from(modName) {
      this.mod = require(modName);
      Object.keys(this.mod)
        .forEach(exportedElementId => global[exportedElementId] = this.mod[exportedElementId]);
    }
  }
}
