// 未编译API,需要引入polyfill
import "core-js";
import Cropper from "./packages/main";

const elList = [
  {
    width: 300,
    height: 375,
    url: "static/field.jpg",
    cropMode: "window",
    window: {
      x: 100,
      y: 100,
      width: 200,
      height: 275
    }
  },
  {
    width: 300,
    height: 375,
    url: "static/field.jpg",
    cropMode: "free-window",
    window: {
      width: 200,
      height: 275
    }
  },
  {
    width: 300,
    height: 375,
    url: "static/geralt_of_rivia.jpg",
    cropMode: "cover"
  },
  {
    width: 600,
    height: 190,
    url: "static/geralt_of_rivia.jpg",
    cropMode: "contain"
  },
  {
    width: 300,
    height: 375,
    url: "static/geralt_of_rivia.jpg",
    cropMode: "contain"
  }
];

function main() {
  const frag = document.createDocumentFragment();
  elList.forEach(opt => {
    const el = document.createElement("div");
    el.style.cssText = "margin-bottom: 10px;";
    el.innerHTML = `<h3 style="margin: 0;padding: 10px;">截图模式: ${opt.cropMode}</h3>`;
    frag.appendChild(el);
    new Cropper(el, opt);
  });

  document.body.appendChild(frag);
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

console.log(crop);*/
