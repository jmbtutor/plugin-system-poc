class CircularDependencyAPlugin {
  get metadata() {
    return {
      name: 'circularDependencyA',
      provides: [],
      depends: ['circularDependencyB'],
    }
  }

  constructor() {}
  register(plugins) {
    this.core = plugins;
    console.log('circularDependencyA constructor');
    return this;
  }
  init() {
    console.log('circularDependencyA init');
  }
  afterInit() {
    console.log('circularDependencyA afterInit');
  }
  onPluginRegister() {
    console.log('circularDependencyA onPluginRegister');
  }
}
