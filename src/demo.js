// 未编译API,需要引入polyfill
import 'core-js'
import Cropper from './main'

let crop = new Cropper(document.getElementById('app'), {
  url: '/static/1.jpg',
});

console.log(crop);
