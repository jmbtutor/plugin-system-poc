/* This is an example plugin.
 */
class ExamplePlugin {
  /* Core will require some information about the plugin, and it will
   * call the metadata getter at registration time to do so.
   *
   * The metadata getter returns an object that describes the plugin.
   *
   * This getter is required.
   */
  get metadata() {
    return {
      /* The name of the plugin, which will be used as its preferred
       * plugin key, is given by the `name` key. It is recommended that
       * the name be a valid JS identifier and should aim to be globally
       * unique.
       *
       * The actual key used for this plugin can be overridden at
       * registration time.
       */
      name: 'example',
      /* If the plugin can stand in for another (possibly virtual)
       * plugin (i.e. conforms to its interface), the names should be
       * provided here. A plugin implicitly provides itself, so its name
       * does not need to appear here.
       */
      provides: [],
      /* If the plugin has dependencies on other plugins, the names of
       * the plugin dependencies should be listed here. These plugins
       * should be dependencies that must be satisfied by the time `init`
       * is called; if it is required only after `init`, do not add it
       * here. Core will use these to ensure that the dependencies of
       * all plugins are met before initializing the plugins.
       * TODO: should this be called "depends" instead?
       */
      dependencies: [],
    };
  }

  /* The constructor is the first function called in the plugin's
   * lifecycle. The user is responsible for constructing the plugin
   * before registering it with Core.
   *
   * It is recommmended to accept plugin options here.
   */
  constructor(options) {
    console.log('Example plugin constructor called:', options);
    this.options = options;
  }

  /* When Core receives a plugin to be registered, it calls the
   * plugin's `register` function, passing in a reference to the object
   * containing all plugins as the first argument.
   *
   * The return value for this function will be used as the value to
   * expose through Core. In most cases, returning `this` will suffice,
   * but encapsulation can be achieved by returning a separate object.
   *
   * It is recommended to store a reference to the plugins object here.
   *
   * At this point, one cannot assume the existence of other plugins.
   */
  register(plugins) {
    this.core = plugins;
    console.log('Example plugin register called:', plugins);
    return this;
  }

  /* When Core initializes, it calls the `init` function of each plugin.
   * At this point, all plugins registered in a batch will be registered
   * but not necessarily initialized, so one can check for the existence
   * of other plugins here.
   */
  init() {
    console.log('Example plugin init called.');
  }

  /* After Core has initialized all plugins, it calls the `afterInit`
   * function of each plugin.
   * At this point, all plugins have been registered and initialized.
   */
  afterInit() {
    console.log('Example plugin afterInit called.');
  }

  /* When a batch of plugins are registered, Core will call the
   * `onPluginRegister` function to alert already-initialized plugins
   * that other plugins have been registered. This can be used to enable
   * some additional functionality when an optional dependency has been
   * registered.
   *
   * Core will pass in an object whose keys are the exposed names of the
   * plugins and whose values are the metadata objects of the plugins.
   */
  onPluginRegister(plugins) {
    console.log('Example plugin onPluginRegister called:', plugins);
  }

  // Additional plugin-specific methods can go here.
}
