// 未编译API,需要引入polyfill
import "core-js";
// import Cropper from "./packages/main";
import Cropper from "./core/cropper";
import { debounce } from "./packages/utils";

const optionList = [
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
      resizeable: false,
      moveable: false
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

function preview(e, index) {
  const { window, offset, model } = e;
  const wrap = document.getElementById("preview" + index);
  const img = wrap.querySelector("img");
  wrap.style.cssText = `width: ${window.width}px;height: ${window.height}px;overflow:hidden;`;
  img.style.cssText = `width: ${model.width}px;height: ${
    model.height
  }px;transform: translate3d(${-offset.x}px,${-offset.y}px,0)`;
}

const output = function(crop, index, e) {
  const output = document.getElementById("output" + index);
  const outputImage = output.querySelector("img");
  crop.output({
    success(data) {
      if (e) {
        output.style.width = e.window.width + "px";
        output.style.height = e.window.height + "px";
      } else {
        output.style.width = crop.window.width + "px";
        output.style.height = crop.window.height + "px";
      }
      if (outputImage.src.includes("blob")) {
        URL.revokeObjectURL(outputImage.src);
      }
      if (data instanceof Blob) {
        data = URL.createObjectURL(data);
      }
      outputImage.src = data;
    },
    fail(e) {
      console.log("something error", e);
    }
  });
};

function createCrop(opt, index) {
  const crop = new Cropper(document.getElementById("crop" + index), opt);
  crop.on("ready", () => {
    console.log("ready", crop);
    output(crop, index);
  });
  crop.on("change", debounce(e => output(crop, index, e)));
  crop.on("change", e => {
    preview(e, index);
  });
}

function main() {
  let htmlStr = "";
  optionList.forEach((opt, index) => {
    htmlStr += `
		  <section>
			<h3>截图模式: ${opt.cropMode}</h3>
			<div class="flex-block">
			  <div class="flex-item crop-wrap">
				<div id="crop${index}"></div>
				<h3>截图窗口</h3>
			  </div>
			  <div class="flex-item preview">
				<div id="preview${index}" style="width: 0;height: 0;overflow:hidden;"><img src="${
      opt.url
    }" alt=""></div>
				<h3>实时预览</h3>
			  </div>
			  <div class="flex-item output">
				<div id="output${index}"><img src="" alt="" style="width: 100%;"></div>
				<h3>截图输出</h3>
			  </div>
			</div>
		  </section>
		  
		  <pre><code class="javascript">const option = ${JSON.stringify(
        opt,
        (k, v) => v,
        4
      )};\nconst crop = new Crop(option);</code></pre>
		  `;
  });
  document.body.innerHTML = htmlStr;
  optionList.forEach((opt, index) => createCrop(opt, index));
  document.querySelectorAll("pre code").forEach(block => {
    window.hljs && window.hljs.highlightBlock(block);
  });
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
