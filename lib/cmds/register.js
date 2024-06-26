/**
 * Recursively register all node modules for use with nslm
 */
exports.run = () => {
  process.stdout.write(`Searching directories for package.json... `);

  let modulesRegistered = 0;
  const fullJson = {};
  const fullJsonMod = getRegModules().getData();

  const packages = findPackages(process.cwd(), [`/.${mname}/`, '/node_modules/', '/.yalc/']);
  console.log(`${packages.length} found!`);

  let errs = 0;
  const errKeyPrefix = `${mname}-${Math.floor(Math.random() * 1000000)}-ERR-`;

  packages.forEach((s) => {
    try {
      const { name } = JSON.parse(fs.readFileSync(s));
      if (name) {
        const location = path.dirname(s);
        fullJson[name] = location;
      } else {
        fullJson[`${errKeyPrefix}NAME${errs++}`] = s;
      }
    } catch (e) {
      fullJson[`${errKeyPrefix}PARSE${errs++}`] = s;
    }
  });

  const registerModule = (s) => {
    const location = fullJson[s];

    if (s.startsWith(`${errKeyPrefix}NAME`)) {
      warn(`"${location}" does not have a name field! Skipping!`);
      return
    } else if (s.startsWith(`${errKeyPrefix}PARSE`)) {
      error(`"${location}" failed to parse!`);
      return
    }

    if (fullJsonMod[s] === location) {
      console.log(orange(`Module "${s}" has already been registered at location "${location}"`));
    } else {
      console.log(green(`Registered module "${s}" at location "${location}"`));
      fullJsonMod[s] = location;
      modulesRegistered++;
    }
  }

  argvProcess(
    {
      msg: 'Registering',
      defaultAll: true,
      modules: fullJson,
      func: registerModule,
      specifiedModulesFunc: ((moduleName) => {
        registerModule(moduleName);
      }),
    },
  );


  if (modulesRegistered === 1) {
    process.stdout.write(`${modulesRegistered} new module was registered. Saving modules.json at ${getRegModules().path}... `);
  } else {
    process.stdout.write(`${modulesRegistered} new modules were registered. Saving modules.json at ${getRegModules().path}... `);
  }
  if (!argv.simulate) {
    writeFileSyncRecursive(getRegModules().path, JSON.stringify(sortObject({ ...fullJsonMod }), null, 4));
  }
  console.log('Done!');
};
