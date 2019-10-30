### 轻量截图库

#### 使用

1. 安装: `npm install @redbuck/cropper` 或者 `yarn add @redbuck/cropper`.
2. 引入:
   1. 模块化
      commonjs: `const Cropper = require('@redbuck/cropper')`.
      ES6 module: `import Cropper from "@redbuck/cropper"`.
   2. CDN
      页面中添加`<script type="text/javascript" src="to/path/cropper.js"></script>`
3. 使用:`const cropper = new Cropper(el, options)`.

#### 参数

|    字段 |             类型 |    默认值 | 描述             |
| ------: | ---------------: | --------: | ---------------- |
|      el | `Element|string` | undefined | 截图组件挂载位置 |
| options |           Object |        {} | 配置对象         |

##### options

|             字段 |    类型 |                  默认值 |                                      描述 |
| ---------------: | ------: | ----------------------: | ----------------------------------------: |
|            width |  number |                     600 |                                  组件宽度 |
|           height |  number |                     375 |                                  组件高度 |
| devicePixelRatio |  number | window.devicePixelRatio |                                       dpr |
|              url |  string |                      "" |                        需要截取的图片地址 |
|         cropMode |  string |                 'cover' |                          截图模式[未实现] |
|          maxSize |  number |                      10 |                      最大放大倍数[未实现] |
|          minSize |  number |                       1 |                      最小放大倍数[未实现] |
|       resizeable | boolean |                   false | 是否允许拖动组件边缘,改变组件尺寸[未实现] |

##### cropMode 详解

> cover 模式表示图片铺满组件,拖拽时,被限制在组件内部.缩放也无法缩小至小于组件**不会拖出空白**

> free 模式表示图片拖拽不受限制,只受缩放限制**会拖出空白**
