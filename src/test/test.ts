import Cropper from "../core/cropper";

new Cropper(document.getElementById("app"), {
  url: "",
  width: 300,
  height: 300,
  cropMode: "cover",
  window: {
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    resizeable: false
  }
});
