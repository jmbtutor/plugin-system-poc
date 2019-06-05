/* One type of plugin is an events plugin that acts as a mediator for
 * communication between other plugins or plugins and the outside world.
 */
class WindowEvents {
  get metadata() {
    return {
      name: 'windowEvents',
      provides: ['events'],
      dependencies: [],
    };
  }

  constructor(options) {
    /* This is a map of event names to lists of callback objects.
     * Each callback object tracks the provided callback and the actual
     * callback that was given to addEventListener. This is to allow the
     * removal of event listeners.
     */
    this.listeners = {};
  }

  register(core) {
    this.core = core;
    return this;
  }

  init() {}
  afterInit() {}
  onPluginRegister(plugins) {}

  dispatch(name, payload) {
    const event = new CustomEvent(name, { detail: payload });
    window.document.dispatchEvent(new CustomEvent(WindowEvents.internalEvents.DISPATCHED, { detail: event }));
    window.document.dispatchEvent(event);
  }

  subscribe(eventName, listener, once = false) {
    const callback = (event) => {
      listener(event.type, event.detail);
    };
    window.document.addEventListener(eventName, callback);

    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push({ callback, original: listener });
  }

  subscribeAll(listener) {
    const callback = (event) => {

    };
    window.document.addEventListener(WindowEvents.internalEvents.DISPATCHED, callback);

    if (!this.listeners[WindowEvents.internalEvents.DISPATCHED]) {
      this.listeners[WindowEvents.internalEvents.DISPATCHED] = [];
    }
    this.listeners[WindowEvents.internalEvents.DISPATCHED].push({ callback, original: listener });
  }

  unsubscribe(eventName, listener) {
  }

  unsubscribeAll(listener) {
  }

  static get internalEvents() {
    return {
      DISPATCHED: '@@windowEvent-dispatched',
    };
  }
}
