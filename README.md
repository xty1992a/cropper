## 轻量截图库

### 使用

1. 安装: `npm install @redbuck/cropper` 或者 `yarn add @redbuck/cropper`.
2. 引入:
   1. 模块化
      commonjs: `const Cropper = require('@redbuck/cropper')`.
      ES6 module: `import Cropper from "@redbuck/cropper"`.
   2. CDN
      页面中添加`<script type="text/javascript" src="to/path/cropper.js"></script>`
3. 使用:`const cropper = new Cropper(el, options)`.

---

### 参数

|    字段 |              类型 |    默认值 | 描述             |
| ------: | ----------------: | --------: | ---------------- |
|      el | Element 丨 string | undefined | 截图组件挂载位置 |
| options |            Object |        {} | 配置对象         |

#### options

|             字段 |   类型 |                  默认值 |               描述 |
| ---------------: | -----: | ----------------------: | -----------------: |
|              url | string |                      "" | 需要截取的图片地址 |
|            width | number |                     600 |           容器宽度 |
|           height | number |                     375 |           容器高度 |
|           window | object |                    null |      截图框的 rect |
|       wheelSpeed | number |                    0.05 |           缩放步长 |
|          maxRate | number |                      10 |       最大放大倍数 |
|          minRate | number |                       1 |       最小放大倍数 |
|         cropMode | string |                 'cover' |           截图模式 |
|        maskColor | string |       'rgba(0,0,0,0.6)' |           蒙层颜色 |
| devicePixelRatio | number | window.devicePixelRatio |                dpr |

#### window 属性(window 类型可用)

|       字段 |    类型 |          默认值 |               描述 |
| ---------: | ------: | --------------: | -----------------: |
|          x |  number |               0 |     截图框的横坐标 |
|          y |  number |               0 |     截图框的纵坐标 |
|      width |  number | options.width/2 |       截图框的宽度 |
|     height |  number |               0 |       截图框的高度 |
| resizeable | boolean |            true | 是否允许改变截图框 |
|   moveable | boolean |            true | 是否允许移动截图框 |

##### cropMode 详解

- cover, 容器即截图框,图片只能在容器内部移动,最小只能缩小到容器的最长边.
- contain, 容器即截图框,图片移动,缩放不限制
- window, 显示截图框,截图框的移动限制在图片内(图片的缩放移动也受截图框的限制)
- free-window,显示截图框,截图框的移动不受限制

---

### API

#### output 同步输出 window 区域的图片

接口定义: `output(options?: OutputType): string | Blob | Error;`
参数定义:

```javascript
type OutputType = {
  mime?: string,
  type?: string,
  quality?: number
};
```

#### moveTo 移动图片至指定位置

接口定义: `moveTo(x: number, y: number): void;`

#### zoom 在指定位置进行缩放

接口定义: `zoom(origin: { x: number; y: number }, direction: number): void;`
参数定义: origin 指缩放发生的坐标(canvas 坐标),delta 指方向(放大 1,缩小-1)

#### changeImage 更换图片

接口定义: `changeImage(img: HTMLImageElement | string, callback?: Function):void`
