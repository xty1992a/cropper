import { EmitAble, copy } from "./utils";

type State = {
  [prop: string]: any;
};

interface GetFn {
  (state: State, getter: State): any;
}

interface MutationFn {
  (state: State, value?: any): void;
}

type MutationMap = {
  [prop: string]: MutationFn;
};

type GetMap = {
  [prop: string]: GetFn;
};

interface Props {
  state: State;
  mutations: MutationMap;
  getters?: GetMap;
}

export default class Store extends EmitAble {
  state: State;
  getters: State;
  protected mutationByCommit: boolean;
  protected __state__: State;
  protected __mutations__: MutationMap;
  protected __getters__: GetMap;

  constructor(props: Props) {
    super();
    this.__state__ = copy(props.state);
    this.__mutations__ = props.mutations;
    props.getters && (this.__getters__ = props.getters);
    this.defineState();
    this.defineGetters();
  }

  defineState() {
    this.state = {};
    const self = this;
    Object.keys(this.__state__).forEach(key => {
      Object.defineProperty(this.state, key, {
        get() {
          return self.__state__[key];
        },
        set(v) {
          if (!self.mutationByCommit) throw new Error("请通过commit提交变更！");
          self.__state__[key] = v;
          self.mutationByCommit = false;
          self.fire("mutation_" + key);
        },
        enumerable: true
      });
    });
  }

  defineGetters() {
    this.getters = {};
    const self = this;
    Object.keys(this.__getters__).forEach(key => {
      Object.defineProperty(this.getters, key, {
        get() {
          return self.__getters__[key].call(self, self.__state__, self.getters);
        },
        set(v) {
          throw new Error("getter不可编辑！");
        },
        enumerable: true
      });
    });
  }

  commit(mutationType: string, value: any) {
    this.mutationByCommit = true;
    this.__mutations__[mutationType].call(this, this.state, value);
  }

  protected mapStore(props: MapProps, target: State) {
    let maps: { key: string; value: string }[];
    if (Array.isArray(props)) {
      maps = props.map(prop => ({ key: prop, value: prop }));
    } else {
      maps = Object.keys(props).map(key => ({ key, value: props[key] }));
    }
    return function() {
      maps.forEach(map => {
        Object.defineProperty(this, map.key, {
          get() {
            return target[map.value];
          },
          set(v) {},
          enumerable: true
        });
      });
    };
  }

  mapState(props: MapProps) {
    return this.mapStore(props, this.state);
  }

  mapGetters(props: MapProps) {
    return this.mapStore(props, this.getters);
  }
}

type MapProps = string[] | { [prop: string]: string };
