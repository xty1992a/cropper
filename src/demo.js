// 未编译API,需要引入polyfill
import "core-js";
// import Cropper from "./packages/main";
import Cropper from "./core/cropper";
import { debounce } from "./packages/utils";

const list = (window.cropList = []);

const elList = [
  {
    width: 600,
    height: 375,
    url: "static/field.jpg",
    cropMode: "window",
    minRate: 0.1,
    devicePixelRatio: 3,
    // wheelSpeed: 0.01,
    // windowMoveable: false,
    window: {
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      resizeable: true
    }
  },
  {
    width: 300,
    height: 375,
    url: "static/field.jpg",
    minRate: 0.1,
    cropMode: "free-window",
    window: {
      width: 200,
      height: 275
    }
  },
  {
    width: 300,
    height: 375,
    devicePixelRatio: 2,
    url: "static/geralt_of_rivia.jpg",
    cropMode: "cover"
  },
  {
    width: 300,
    height: 375,
    url: "static/geralt_of_rivia.jpg",
    cropMode: "contain"
  }
];

function preview(opt, index) {
  const div = document.createElement("div");
  const img = new Image();
  img.id = "preview" + index;
  img.src = opt.url;
  const rect = opt.window ? opt.window : opt;
  div.style.cssText = `width: ${rect.width}px;height: ${rect.height}px;overflow:hidden;display:inline-block;`;
  div.appendChild(img);

  return {
    div,
    sync(e) {
      div.style.cssText = `width: ${e.window.width}px;height: ${e.window.height}px;overflow:hidden;display:inline-block;`;
      img.style.cssText = `width: ${e.model.width}px;height: ${e.model.height}px;transform: translate3d(${e.window.x}px,${e.window.y}px,0)`;
    }
  };
}

function main() {
  const frag = document.createDocumentFragment();
  elList.forEach((opt, index) => {
    const section = document.createElement("section");
    const el = document.createElement("div");
    const wrap = document.createElement("div");
    el.innerHTML = `<h3 style="padding: 10px;">截图模式: ${opt.cropMode}</h3>`;
    const btn = document.createElement("btn");
    btn.innerText = "crop";

    const outputEl = document.createElement("div");
    const { div, sync } = preview(opt, index);

    outputEl.style.cssText = div.style.cssText;

    const output = debounce(function(e) {
      crop.output({
        success(data) {
          console.log("output success");
          const img = outputEl.querySelector("#output" + index) || new Image();
          if (e && img.parentNode) {
            img.parentNode.style.width = e.window.width + "px";
            img.parentNode.style.height = e.window.height + "px";
          }
          img.style.cssText = "width:100%;";
          img.id = img.id || "output" + index;
          if (img.src.includes("blob")) {
            URL.revokeObjectURL(img.src);
          }
          if (data instanceof Blob) {
            data = URL.createObjectURL(data);
          }
          img.src = data;
          outputEl.appendChild(img);
        },
        fail(e) {
          console.log("something error", e);
        }
      });
    });

    const crop = new Cropper(wrap, opt);
    list.push(crop);
    // el.appendChild(btn);
    el.appendChild(wrap);
    el.appendChild(div);
    el.appendChild(outputEl);
    btn.addEventListener("click", output);
    crop.on("ready", output);
    crop.on("ready", () => {
      console.log("second ready");
    });
    crop.on("change", e => {
      sync(e);
      output(e);
    });
    section.appendChild(el);
    frag.appendChild(section);
  });

  document.body.appendChild(frag);
  console.log(list[0].$store === list[0].$store);
}

main();

/*
const el = document.getElementById("app");

const crop = new Cropper(el, {
  width: 375,
  height: 200,
  url: "/static/1.jpg",
  // devicePixelRatio: 1
});

console.log(crop);
*/
