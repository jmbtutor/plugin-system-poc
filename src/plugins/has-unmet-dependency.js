class HasUnmetDependencyPlugin {
  get metadata() {
    return {
      name: 'hasUnmetDependency',
      provides: [],
      depends: ['no-such-dependency-exists'],
    }
  }

  constructor() {}
  register(plugins) { this.core = plugins; return this; }
  init() {}
  afterInit() {}
  onPluginRegister() {}
}
