import Store from "../core/store.ts";

const store = new Store({
  state: {
    a: 1,
    b: 2
  },
  mutations: {
    set_a: (state, value) => (state.a = value),
    set_b: (state, value) => (state.b = value)
  },
  getters: {
    c: state => {
      return state.a + state.b;
    }
  },
  modules: {
    App: {
      state: {
        a: 1,
        b: 2
      },
      mutations: {
        set_a: (state, value) => (state.a = value),
        set_b: (state, value) => (state.b = value)
      }
    }
  }
});

console.log(store);

class Test {
  constructor() {
    setTimeout(() => {
      this.init();
    }, 100);
  }

  get a() {
    return store.state.a;
  }

  get c() {
    return store.getters.c;
  }

  init() {
    console.log(this.a, this.c);

    // store.state.a = 23;
    store.commit("set_a", 23);

    console.log(store.getters.c);
  }
}

new Test();
