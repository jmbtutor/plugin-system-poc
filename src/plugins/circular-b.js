class CircularDependencyBPlugin {
  get metadata() {
    return {
      name: 'circularDependencyB',
      provides: [],
      depends: ['circularDependencyA'],
    }
  }

  constructor() {}
  register(plugins) {
    this.core = plugins;
    console.log('circularDependencyB constructor');
    return this;
  }
  init() {
    console.log('circularDependencyB init');
  }
  afterInit() {
    console.log('circularDependencyB afterInit');
  }
  onPluginRegister() {
    console.log('circularDependencyB onPluginRegister');
  }
}
