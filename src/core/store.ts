// import Store from "../helpers/store";

export default {
  state: {
    // @ts-ignore
    options: null,
    window: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rect: {}
    },
    model: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rect: {}
    }
  },
  mutations: {
    // @ts-ignore
    SET_OPTIONS: (state, options) => (state.options = options),
    // @ts-ignore
    SET_WINDOW: (state, window) => (state.window = window),
    // @ts-ignore
    SET_MODEL: (state, model) => (state.model = model)
  },

  getters: {
    // @ts-ignore
    dpr: state => state.options.devicePixelRatio,
    // @ts-ignore
    WIDTH: (state, getter) => state.options.width * getter.dpr,
    // @ts-ignore
    HEIGHT: (state, getter) => state.options.height * getter.dpr,
    // @ts-ignore
    MODE: (state, getter) => state.options.cropMode
  }
};
// export default new Store();
