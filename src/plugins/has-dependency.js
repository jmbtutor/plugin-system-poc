class HasDependencyPlugin {
  get metadata() {
    return {
      name: 'hasDependency',
      provides: [],
      depends: ['example'],
    }
  }

  constructor() {}
  register(plugins) {
    this.core = plugins;
    console.log('HasDependencyPlugin constructor');
    return this;
  }
  init() {
    console.log('HasDependencyPlugin init');
  }
  afterInit() {
    console.log('HasDependencyPlugin afterInit');
  }
  onPluginRegister() {
    console.log('HasDependencyPlugin onPluginRegister');
  }
}
