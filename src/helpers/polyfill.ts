// region polyfill
// 简单的对一些用到的API进行polyfill
// @ts-ignore-next-line
window.requestAnimationFrame =
  window.requestAnimationFrame || (fn => setTimeout(fn, 16));

if (!Array.prototype.includes) {
  Array.prototype.includes = function(item: any): boolean {
    return !!~this.indexOf(item);
  };
}
if (!Array.prototype.find) {
  // @ts-ignore-next-line
  Array.prototype.find = function(check) {
    for (var i = 0; i < this.length; i++) {
      if (check(this[i], i, this)) return this[i];
    }
    return;
  };
}

if (typeof Object.assign != "function") {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target: any, varArgs: any) {
      // .length of function is 2
      "use strict";
      if (target == null) {
        // TypeError if undefined or null
        throw new TypeError("Cannot convert undefined or null to object");
      }

      let to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) {
          // Skip over if undefined or null
          for (let nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}
// endregion
