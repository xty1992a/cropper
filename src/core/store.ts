import Store from "../helpers/store";

export default new Store({
  state: {
    options: null
  },
  mutations: {
    SET_OPTIONS: (state, options) => (state.options = options)
  },

  getters: {
    dpr: state => state.options.devicePixelRatio,
    WIDTH: (state, getter) => state.options.width * getter.dpr,
    HEIGHT: (state, getter) => state.options.height * getter.dpr,
    MODE: (state, getter) => state.options.cropMode
  }
});
