# SomeLeaf（三叶）

一款轻量级多平台阅读软件。

## 功能一览
1. 书架静态页面
2. 本地 TXT 导入
3. 阅读器和进度保存
4. Python 后端基础工程
5. 注册登录和云端书架
6. 上传、分享和下载图

## 架构选择
- 采用前后端分离形式，前端使用 uniapp + Vue 3；后端使用 python 的 fastAPI 框架
- 数据库采用 mysql，数据迁移使用 `Alembic`

## 前端开发

```bash
npm install
// 本地启动 H5 页面
npm run dev:h5
// 打包 dist
npm run build:h5
// 本地启动 APP
npm run dev:app
```