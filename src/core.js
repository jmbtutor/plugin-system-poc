/* Core is the backbone of the whole system. It's what allows the
 * plugins to communicate with each other.
 *
 * Core is only aware of plugins. It does not care what those plugins
 * do: to it, "data source" plugins and "events" plugins and "cache"
 * plugins are all the same.
 *
 * Core communicates with plugins through callbacks. Core expects
 * plugins to have certain 
 *
 * To Core, a plugin:
 *  - is an object with a certain interface (e.g. has methods for
 *    lifecycle callbacks)
 *  - has a value to expose
 *  - may depend on other plugins
 *
 * The structure of a plugin is given in more detail in the Base plugin.
 */
class Core {
  /* To maintain flexibility, Core and the plugins are expected to be
   * instantiated by the user.
   */
  constructor() {
    /* To tell if a plugin can safely be removed, we must know if a
     * plugin is required by any other plugin. We store this in a map
     * from plugin names to the names of the plugins that depend on it.
     */
    this.dependencyMap = {};
    /* Plugins provide a value to Core to expose through Core. To avoid
     * collisions with internal names, we expose them through a
     * `plugins` object, so collisions are limited only between plugins.
     */
    this.plugins = {};
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
   *  1. name registration
   *  2. dependency checking
   *  2. initialization
   *  3. post-initialization
   * Each of these steps will be completed on the entire collection of
   * new plugins before moving on to the next step.
   *
   * After these steps have been completed, plugins that have already
   * been registered will be notified of the new plugins.
   */
  registerPlugins(plugins) {
    /* The first step to registering the plugins is to collect all their
     * names and dependencies. This will help us with dependency
     * checking later on. We will also expose the plugin in the plugin
     * map.
     */
    plugins.forEach((plugin) => {
      /* We first grab the metadata for the plugin. This metadata
       * contains information like the plugin's name, what plugins it
       * "provides" and which plugins it depends on.
       */
      const { metadata } = plugin;
      /* We will then grab the name of the plugin to use for exposing
       * its value.
       * TODO: accept an alternate name as an option to allow multiple
       * instances of the same plugin type.
       */
      const name = metadata.name;
      /* Next we call the plugin's register function with this object.
       * The register function is expected to return a value to expose.
       */
      const value = plugin.register(this);

      /* After all the plugins are registered, we will make sure that
       * all of the dependencies for each of the plugins are satisfied.
       * To help with that, we build a dependency-to-plugins map here.
       */
      metadata.dependencies.forEach((dependency) => {
        /* Multiple instances of a plugin can be registered, so we keep
         * track of all instances in an array instead of using a Set.
         */
        if (!this.dependencyMap[dependency]) {
          this.dependencyMap[dependency] = [];
        }

        this.dependencyMap[dependency].push(name);
      });

      /* Now we expose the plugin value that we got earlier through the
       * plugins map. For each plugin that it provides, expose the
       * plugin through that key. Use a getter so the plugin cannot be
       * accidentally overwritten.
       * TODO: make configurable which plugin is exposed for that key.
       */
      Object.defineProperty(this.plugins, name, {
        configurable: true,
        enumerable: true,
        get() { return value; }
      });
      this.availablePlugins.push(name);
      metadata.provides.forEach((provided) => {
        Object.defineProperty(this.plugins, provided, {
          configurable: true,
          enumerable: true,
          get() { return value; }
        });
        this.availablePlugins.push(provided);
      });
    });

    /* To ensure that all plugins will work as expected, we must check
     * to make sure that all the dependencies across all of the new
     * plugins are satisfied. We can do this by comparing our dependency
     * set against the set of registered plugins (including the ones
     * previously registered), and if we find any dependencies that are
     * not already registered, they are not met and we throw an error.
     */
    const available = new Set(this.availablePlugins);
    const required = new Set(Object.keys(this.dependencyMap));
    const difference = new Set([...required].filter((p) => !available.has(p)));
    if (difference.size) {
      throw new Error('Unmet dependencies: ' + difference.values().sort().join(', '));
    }

    /* At this point, we have ensured that all dependencies are
     * satisfied and we can assume the plugins will work as intended. It
     * is time to initialize them.
     */
    plugins.forEach((p) => p.init());

    /* Now that all the plugins have been initialized, we will call each
     * of the plugins' `afterInit` hook. This allows Plugin B to use the
     * functionality of Plugin A that is only available after it has
     * been initialized.
     *
     * TODO: determine if this should be asynchronous.
     */
    plugins.forEach((p) => p.afterInit());

    /* All plugins should have completed their post-initialization and
     * should be ready to go, so we will notify the existing plugins that
     * there are new plugins available. Plugins may decide to enable
     * optional functionality given the presence of certain plugins.
     *
     * TODO: use the custom name to allow multiple instances of the same
     *       plugin.
     * TODO: make this object immutable.
     * TODO: determine if calling the callback should be asynchronous.
     */
    const pluginData = plugins
      .map(({ metadata }) => metadata)
      .reduce((meta, data) => data[meta.name] = meta, {});
    this.rawPlugins.forEach((p) => p.onPluginRegister(pluginData));

    /* To finish off, we will add the new plugins to the master list.
     * Adding these after we notify the other plugins makes notifying
     * just the existing plugins much easier.
     */
    this.rawPlugins.push.apply(plugins);
  }

  // TODO: provide a way to unregister a plugin. It must check the
  // dependency chart to ensure that there are no plugins that depend on
  // the plugin to unregister. It will call an `unregister` callback on
  // the plugins being unregistered and an `onPluginUnregister` callback
  // on all other plugins.
}
