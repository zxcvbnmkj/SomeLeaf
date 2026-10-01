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
// 仅用于测试打包是否能编译通过，使用 DCloud 打包会自动执行它，不必先手动执行一次
npm run build:app
```

## 后端开发
- 初始化 python 环境
```commandline
pdm init --python /opt/miniforge3/envs/py312/bin/python
```
- 宝塔上面为服务器新建一个数据库
- 先在本地为刚刚的线上数据库创建表
```commandline
pdm run alembic upgrade head
```
- 本地启动，浅浅测试一下
```bash
pdm run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
## 其它
- svg to png 的[免费网页](https://svgtopng.com/)