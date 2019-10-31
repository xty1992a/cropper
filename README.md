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

|             字段 |    类型 |                  默认值 |                           描述 |
| ---------------: | ------: | ----------------------: | -----------------------------: |
|              url |  string |                      "" |             需要截取的图片地址 |
|            width |  number |                     600 |                       容器宽度 |
|           height |  number |                     375 |                       容器高度 |
|           window |  object |                    null |                  截图框的 rect |
|       wheelSpeed |  number |                    0.05 |                       缩放步长 |
|          maxRate |  number |                      10 |                   最大放大倍数 |
|          minRate |  number |                       1 |                   最小放大倍数 |
|         cropMode |  string |                 'cover' |                       截图模式 |
|        maskColor |  string |       'rgba(0,0,0,0.6)' |                       蒙层颜色 |
| devicePixelRatio |  number | window.devicePixelRatio |                            dpr |
|  windowResizable | boolean |                    true | 是否允许改变截图框尺寸[未实现] |
|   windowMoveable | boolean |                    true |     是否允许移动截图框[未实现] |

##### cropMode 详解

- cover, 容器即截图框,图片只能在容器内部移动,最小只能缩小到容器的最长边.
- contain, 容器即截图框,图片移动,缩放不限制
- window, 显示截图框,截图框的移动限制在图片内(图片的缩放移动也受截图框的限制)
- free-window,显示截图框,截图框的移动不受限制
