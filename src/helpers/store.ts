import { EmitAble, copy } from "./utils";
// 参考vuex实现的一个简单的状态管理工具

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
  protected mutationByCommit: boolean; // 防止数组在外部被修改(没有处理引用类型,实际没什么卵用)
  protected __state__: State;
  protected __mutations__: MutationMap;
  protected __getters__: GetMap;

  constructor(props: Props) {
    super();
    // 隔离不同实例的数据
    this.__state__ = copy(props.state);
    this.__mutations__ = props.mutations;
    props.getters && (this.__getters__ = props.getters);
    this.defineState();
    this.defineGetters();
  }

  protected defineState(): void {
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
          self.fire("mutation_" + key); // 广播mutation操作,随缘通知.可以实现类似vuex插件订阅的操作
        },
        enumerable: true
      });
    });
  }

  protected defineGetters(): void {
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

  protected mapStore(props: MapProps, target: State): Function {
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

  // 提供给外部的API
  commit(mutationType: string, value: any) {
    this.mutationByCommit = true;
    this.__mutations__[mutationType].call(this, this.state, value);
  }

  // 返回一个function,为function的调用者(函数执行上下文)映射一些store内的属性
  // 使用方式 store.mapState(['abc']).apply(this)
  mapState(props: MapProps) {
    return this.mapStore(props, this.state);
  }

  mapGetters(props: MapProps) {
    return this.mapStore(props, this.getters);
  }
}
// 调用者可以用 ['abc'] 将store内的abc映射为自身的abc属性
// 也可以通过{myBbc: 'abc'} 起个别名
type MapProps = string[] | { [alias: string]: string };
