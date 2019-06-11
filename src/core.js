/* Core is the backbone of the whole system. It's what allows the
 * plugins to communicate with each other.
 *
 * Core is only aware of plugins. It does not care what those plugins
 * do: to it, "data source" plugins and "events" plugins and "cache"
 * plugins are all the same.
 *
 * Core communicates with plugins through callbacks. Core expects
 * plugins to conform to a certain interface.
 *
 * To Core, a plugin:
 *  - is an object with a certain interface (e.g. has methods for
 *    lifecycle callbacks)
 *  - has a value to expose
 *  - may depend on other plugins
 *
 * The structure of a plugin is given in more detail in the Example plugin.
 */
class Core {
  /* To maintain flexibility, Core and the plugins are expected to be
   * instantiated by the user.
   */
  constructor() {
    /* To tell if a plugin can safely be removed, we must know if a
     * plugin is required by any other plugin. We store this in a map
     * from plugin names to the names of the plugins that depend on it.
     *
     * This is an object with a null prototype to ensure that no
     * properties are inherited. This also protects against plugins that
     * are named `__proto__`.
     *
     * TODO: should the prototype be Object.freeze({}) instead?
     */
    this.dependencyGraph = Object.create(null);
    /* Plugins provide a value to Core to expose through Core. To avoid
     * collisions with internal names, we expose them through a
     * `plugins` object, so collisions are limited only between plugins.
     *
     * This is an object with a null prototype to ensure that no
     * properties are inherited. This also protects against plugins that
     * are named `__proto__`.
     *
     * TODO: should the prototype be Object.freeze({}) instead?
     */
    this.plugins = Object.create(null);
    /* We must also track the list of the names of registered plugins
     * for dependency tracking. This list includes the names of plugins
     * that were "provided" by other plugins. The order happens to be
     * registration order, but it should probably not be significant.
     *
     * TODO: determine if this list should be sorted to allow for
     *       optimizations or if it should instead be a counter object
     *       with the names as keys and the number of plugins that
     *       provide it as values.
     */
    this.availablePlugins = [];
    /* Below is the master list of plugins. Since this.plugins exposes
     * only what the plugin wants to expose, we do not necessarily have
     * a way back to the original plugin object. This array will store
     * the actual objects that were given at registration time. The
     * order is significant: it's the order of registration.
     */
    this.rawPlugins = [];
  }

  /* For Core to be of any use at all, we must provide a way to register
   * plugins. We will do that by providing a `registerPlugins` function
   * that accepts an array of plugins. The order of the array is
   * significant: it is the order in which the plugins will be
   * processed.
   *
   * Registration has the following steps:
   *  1. dependency checking
   *  2. name registration
   *  3. initialization
   *  4. post-initialization
   * Each of these steps will be completed on the entire collection of
   * new plugins before moving on to the next step.
   *
   * After these steps have been completed, plugins that have already
   * been registered will be notified of the new plugins.
   *
   * Such a process allows for circular dependencies between plugins, so
   * long as the plugins with circular dependencies are registered
   * together in the same batch.
   *
   * The items in the array can either be the plugins themselves, or a
   * two element array with the first element being the plugin and the
   * second being the registration options.
   *
   * There are currently two registration options;
   *  - name: the primary name under which to expose the plugin.
   *  - overrides: alternative mappings for the plugin's dependency.
   *               This is an object whose keys are the name to map from
   *               and whose values are the names of the plugins to map
   *               to. This mapping is not recursive. This can be used,
   *               for example, if a plugin was registered under a
   *               custom name, or if you want to use a specific plugin
   *               to satisfy a dependency for that plugin.
   *
   * TODO: allow plugins to omit lifecycle event hooks.
   */
  registerPlugins(plugins) {
    /* This function accepts an array whose items are plugins or a
     * plugin/options pair (array). To simplify things, we'll normalize
     * them all to pairs here.
     */
    const normalizedPlugins = plugins.map((p) => Array.isArray(p) ? p : [p, {}]);
    /* To ensure that all plugins will work as expected, we must check
     * to make sure that all the dependencies across all of the new
     * plugins are satisfied. We can do this by comparing our dependency
     * set against the set of registered and to-be-registered plugins,
     * and if we find any dependencies that are not already registered,
     * they are not met and we throw an error.
     *
     * We will create temporary objects to use for this dependency
     * checking so that the existing structures will not be failed if a
     * dependency is not met.
     */
    const availablePlugins = new Set(this.availablePlugins);
    const requiredDependencies = new Set();
    normalizedPlugins.forEach(([{ metadata }]) => {
      /* Each plugin provides metadata that gives the plugins' name,
       * what plugins it "provides", and which plugins it depends on.
       * We will use the information found in this object to check
       * dependencies.
       *
       * We have destructured the plugin above to extract the metadata.
       */

      /* First we add this plugin's dependencies to the list of required
       * plugins.
       */
      metadata.depends.forEach((dependency) => {
        requiredDependencies.add(dependency);
      });

      /* Next we add this plugin and all the plugins it "provides" to
       * the list of available plugins.
       */
      availablePlugins.add(metadata.name);
      metadata.provides.forEach((provided) => {
        availablePlugins.add(provided);
      });
    });

    /* Now that we have the full list of required and available plugins,
     * we simply have to do a set difference on the two (required \ available).
     * If the resulting set is empty, then all dependencies will be
     * satisfied. If it is not empty, we throw an error and abort the
     * registration.
     */
    const difference = new Set([...requiredDependencies].filter((p) => !availablePlugins.has(p)));
    if (difference.size) {
      throw new Error('Unmet dependencies: ' + [...difference.values()].sort().join(', '));
    }

    /* Once we have determined that all dependencies can be satisfied,
     * we can proceed to register the components.
     */
    normalizedPlugins.forEach(([plugin, options]) => {
      /* We will need the plugin's metadata for registration, so let's
       * extract that here.
       */
      const { metadata } = plugin;
      /* We will then grab the name of the plugin to use for exposing
       * its value. This name will be used as the key in the plugins
       * object.
       */
      const key = options.name || metadata.name;
      /* Next we prepare an overrides object to provide to the plugin's
       * register function. This object will have this.plugins as its
       * prototype so that it inherits all plugins by default, and its
       * own properties are getters that return the proper plugin. This
       * allows for specifying which plugin should satisfy a certain
       * dependency for this plugin.
       *
       * Passing in this object instead of Core itself also protects the
       * internals of Core from being modified by a plugin.
       */
      const pluginsWithOverrides = Object.create(this.plugins);
      if (options.overrides) {
        for (let overrideKey in options.overrides) {
          Object.defineProperty(pluginsWithOverrides, overrideKey, {
            configurable: true,
            enumerable: true,
            get() { return this.plugins[overrideKey]; },
          });
        }
      }

      /* With the overrides object prepared, we can now call the
       * plugin's register function with the overries object. The
       * register function is expected to return a value to expose
       * through this.plugins.
       */
      const value = plugin.register(pluginsWithOverrides);

      /* To help with safely unregistering plugins later, we add to the
       * dependency graph here.
       */
      metadata.depends.forEach((dependency) => {
        /* Multiple instances of a plugin can be registered, so we keep
         * track of all instances in an array instead of using a Set.
         */
        if (!this.dependencyGraph[dependency]) {
          this.dependencyGraph[dependency] = [];
        }

        this.dependencyGraph[dependency].push(metadata.name);
      });

      /* Now we expose the plugin value that we got earlier through the
       * plugins map. For each plugin that it provides, expose the
       * plugin through that key if another plugin does not already
       * provide it. Use a getter so the plugin cannot be accidentally
       * overwritten.
       *
       * We will also add the plugin and its "provided" plugins to the
       * list of available plugins.
       */
      Object.defineProperty(this.plugins, key, {
        configurable: true,
        enumerable: true,
        get() { return value; }
      });
      this.availablePlugins.push(metadata.name);
      metadata.provides.forEach((provided) => {
        if (!(provided in this.plugins)) {
          Object.defineProperty(this.plugins, provided, {
            configurable: true,
            enumerable: true,
            get() { return value; }
          });
        }
        this.availablePlugins.push(provided);
      });
    });

    /* After all plugins have registered their names and values, we can
     * initialize them.
     */
    normalizedPlugins.forEach(([p]) => p.init());

    /* After all the plugins have been initialized, we will call each
     * of the plugins' `afterInit` hook. This allows Plugin B to use the
     * functionality of Plugin A that is only available after it has
     * been initialized.
     *
     * TODO: determine if this should be asynchronous.
     */
    normalizedPlugins.forEach(([p]) => p.afterInit());

    /* All plugins should have completed their post-initialization and
     * should be ready to go, so we will notify the existing plugins that
     * there are new plugins available. Plugins may decide to enable
     * optional functionality given the presence of certain plugins.
     *
     * TODO: make this object immutable.
     * TODO: determine if calling the callback should be asynchronous.
     */
    const pluginData = normalizedPlugins
      .reduce((data, [{ metadata }, { name }]) => data[name || metadata.name] = metadata, {});
    this.rawPlugins
      .forEach(([p]) => p.onPluginRegister(pluginData));

    /* To finish off, we will add the new plugins to the master list.
     * Adding these after we notify the other plugins makes notifying
     * just the existing plugins much easier.
     */
    this.rawPlugins.push.apply(this.rawPlugins, normalizedPlugins);
  }

  // TODO: provide a way to unregister a plugin. It must check the
  // dependency chart to ensure that there are no plugins that depend on
  // the plugin to unregister. It will call an `unregister` callback on
  // the plugins being unregistered and an `onPluginUnregister` callback
  // on all other plugins.
}
