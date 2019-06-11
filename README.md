# plugin-system-poc

A POC demonstrating a plugin system.

The exercise was to build a system with a plugin architecture that that
could support "data source" plugins, an "events" plugin, and a "cache"
plugin, as well as be able to send and receive data to and from a Web
front-end.

## Setup

No setup is required.

## Running

Open `index.html` in any browser that supports ES2015 classes.

Nothing will appear visually, but some objects have been preconstructed
for convenience for you to play around with in the console. Look in
`index.html` for details.

## Design

There are two types of entities recognized in this system: Core, and
plugins. Core is the backbone of the system and serves as a mediator
between plugins, and plugins provide functionality.

The main entity and the most developed entity of this POC is Core. Core
manages plugins and deals with registering plugins, exposing plugins,
and would eventually also allow unregistering plugins (this has not yet
been implemented). Values exposed by plugins are stored in an object by
Core, and this object is given to each plugin to allow it to use other
plugins.

The dependency handling in this system is inspired in part by the
dependency handling of [pacman][], the package manager of [Arch Linux][].
However, the user is responsible for satisfying dependencies; Core
merely ensures that the dependencies are met before attempting
registration.

[pacman]: https://wiki.archlinux.org/index.php/PKGBUILD#Dependencies
[Arch Linux]: https://www.archlinux.org/

Plugins provide functionality. Each plugin provides a metadata object that
describes the plugin's name, what plugins it "provides", and what
plugins it depends on. Core will use this information when the plugin is
registered. Plugins are intended to be configured at construction time.

Plugins are registered in batches to allow for circular dependencies.
At registration time, each step in the registration process is completed
for the batch before the next step is executed.

The registration process currently has four lifecycle hooks for which
callbacks can be defined in a plugin:

- `register`
  - The plugin cannot assume that any other plugin has been registered.
    It is given a reference to the object holding all exposed plugin
    values here, and the function is expected to return a value to expose.
    A plugin could expose itself for simplicity, or it could expose a
    custom object to allow for encapsulation, or even a primitive or a
    function or any other value if it makes more sense to do so.
- `init`
  - At this point, a plugin may assume that the names of all plugins are
    available and their values exposed, but it cannot assume that any
    plugin is fully functional.
- `afterInit`
  - At this point, a plugin may assume that all plugins are fully
    functional and it is safe to use other plugins at this point.
- `onPluginRegister`
  - This is the last step of the registration process and is called on
    any previously-registered plugins to alert them of new plugins that
    are registered. This can be used, for example, to enable optional
    behaviour that requires a certain plugin.

Hooks for unregistering a plugin should also be available to the plugin.

To allow the user more control, the design requires the user to
construct both Core and the plugins. When registering a plugin, Core is
given the instance of a plugin instead of its constructor.

More detailed information about Core and the plugins can be found in the
comments of [`src/core.js`](./src/core.js) and
[`src/plugins/example.js`](./src/example.js) respectively.

## Findings

- Not defining the type of plugins that Core accepts makes the system
  much more flexible.
  - For example, this system allows for a logger plugin, even though it
    was not one of the requirements.
- If there are no defined plugin types, Core cannot assume that an
  "events" plugin will exist and therefore cannot use that to
  communicate with plugins. This led to Core communicating with the
  plugins via known hooks in the plugins.
- Once you allow for plugins to depend on each other, there must be a
  way to handle circular dependencies. This was solved for registration
  by allowing plugins to be registered in a batch. Plugins in a
  dependency cycle must be registered in the same batch.

## Unfinished work

- Unregistering a plugin is not yet possible. Some structures exist in
  Core that will aid in the process (like `dependencyGraph`), but
  others are missing (like a map from exposed plugin keys to the actual
  plugin).
  - Extra care must be taken to allow unregistering plugins for circular
    dependencies. This probably means allowing a batch of plugins to be
    unregistered, similar to how plugins are registered in a batch.
- Suppose Plugin B depends on Plugin A. Plugin A is registered under a
  custom name. Plugin B is not registered with an override for Plugin A.
  Plugin B will be registered successfully, but will be broken because
  Plugin A is not available under the usual name. This needs to be
  fixed.