// 未编译API,需要引入polyfill
import "core-js";
import Cropper from "./packages/main";

const elList = [
  {
    width: 600,
    height: 375,
    url: "static/field.jpg",
    limitRect: {
      x: 100,
      y: 100,
      width: 200,
      height: 275
    }
  }
  /*  {
      width: 600,
      height: 800,
      url: "static/geralt_of_rivia.jpg"
    },
    {
      width: 600,
      height: 300,
      url: "static/geralt_of_rivia.jpg",
    },*/
];

function main() {
  const frag = document.createDocumentFragment();
  elList.forEach(opt => {
    const el = document.createElement("div");
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
