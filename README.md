# nslm - Node Symbolic Link Manager

Symbolically link node packages en masse for local development

NOTE: Some features have not been documented yet!

## Installation

Ensure you have node version 10 or above:

```
node -v
```

Install globally with npm:

```
sudo npm install -g nslm
```

## Usage

### Register

- `nslm register` will recursively search all directories in the current working directory for node modules, saving their locations to `~/.nslm/modules.json`
- The locations registered will be what's used as the source for the given modules when linking.
- As the command searches recursively, you may only need to run it once to capture all of your node projects. For example if you keep all of your node projects within a directory named `Git repos`, you can simply run `nslm register` in that folder and it'll register everything.
- You'll only need to run the command again you wish to register a brand new module or move the location of any of them.
- No additional arguments are required for this command.

### Link

- `nslm link` needs arguments. You have a few options:
  - `--pathscontaining` will link every single module that contains one or more given strings in its path (separated by spaces). For example you can run `nslm link --pathscontaining my-directory-1 my-directory-2` and it will attempt link every module which contains either `my-directory-1` or `my-directory-2` in their paths.
  - `--modules` will only link modules that match the exact name given. For example `nslm link --modules my-node-project` will only link the package with the name `my-node-project`.
  - `--a` or `--all` will link every single module you registered with nslm register. This probably won't be what you want to do most of the time!
- By default it will only link modules that you've already installed. For example let's say you want to link everything in `my-directory-1` to `my-node-project`. If you haven't run `npm install` or `yarn install` (ie. the package isn't yet included in package.json), it will not link anything. To bypass this and link it anyway, add the `--allowmissing` argument. For example `nslm link --pathscontaining my-directory-1 my-directory-2 --allowmissing`
- Be careful about running `npm install` or `yarn install` after you've linked a module to something, as this may unlink one or more modules. To fix, simply relink the module again.

### Delink

- `nslm delink` works in the same way as `npm link`, with most of the same arguments, but in reverse. Use it to put things back to normal. The `--allowmissing` argument won't do anything here.
- You may want to use the `--all` argument most of the time to ensure everything has been reset in the given directory, rather than removing modules one at a time. It'll not only remove the symbolic links but will also try to restore your original local copy of the given module.
  - For example let's say you're working in `my-node-project` and you've nslm linked a module called `excellent-project`. When I run` nslm delink --all` it'll remove that link and replace it with the module that was installed before you linked anything. If the module was missing to begin with (ie. you used the `--allowmissing` arg on `nslm link`) then nothing will be restored as nothing would've been there to back up in the first place.
