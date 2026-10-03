<div align="center">
  <img src="frontend/src/static/app-icon.png" width="128" height="128" alt="SomeLeaf 三叶应用图标">

  <h1>SomeLeaf · 三叶</h1>

  <p><strong>一款本地优先、为好友共读而生的轻量阅读器。</strong></p>
  <p>从一页文字出发，在阅读中遇见。</p>

  <p>
    <img src="https://img.shields.io/badge/uni--app-Vue_3-42b883?style=flat-square&logo=vuedotjs&logoColor=white" alt="uni-app Vue 3">
    <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI Python">
    <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL 8.0">
    <img src="https://img.shields.io/badge/Android-ready-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android ready">
    <img src="https://img.shields.io/badge/privacy-local_first-315F48?style=flat-square" alt="Local first">
  </p>
</div>

---

**Leaf 既是树叶，也是书页。** SomeLeaf 是片片树叶，也是篇篇书页。叶片承载季节，书页承载文字：一叶可以让人感知秋意，一页也可以让人看见更辽阔的世界。

“三叶”中的“三”并非确数，而是虚指。它指代许多片叶子、许多读者与许多文字，也指代人与人在阅读中发生的许多次思想相遇。

## 功能概览

| 本地阅读 | 好友共读 |
| --- | --- |
| 导入 TXT 与 EPUB，自动兼容常见中文编码 | 一键生成 6 位邀请码，好友凭码加入 |
| 点击左右区域翻页，自动保存阅读进度 | 查看共读成员以及所有公开评论和笔记 |
| 章节目录、进度跳转、字号调节与全文搜索 | 对选中文字直接划线评论，柔和高亮展示 |
| 未开启共读时，评论与笔记仅保存在本机 | 开启共读后，同步已有评论与读书笔记 |

> 本地阅读无需注册。图书默认私有，只有用户主动开启好友共读后，正文与阅读内容才会上传服务器。

## 架构选择
- 采用前后端分离形式，前端使用 uniapp + Vue 3；后端使用 python 的 fastAPI 框架
- 数据库采用 mysql，数据迁移使用 `Alembic`
- 前端负责本地图书、阅读器与离线数据；后端只承载账户、共读房间、共享正文、评论及笔记。

## 前端开发

```bash
cd frontend
npm install

# 本地启动 H5
npm run dev:h5

# 构建 H5
npm run build:h5

# 生成 HBuilderX 真机调试项目
npm run dev:app

# 生成正式 App 构建产物
npm run build:app

# 调试小程序
npm run dev:mp-weixin
npm run build:mp-weixin
```

## 后端开发

初始化 Python 环境：

```bash
cd backend
pdm init --python /opt/miniforge3/envs/py312/bin/python
```

配置数据库连接后执行迁移：

```bash
pdm run alembic upgrade head
```

启动本地开发服务：

```bash
pdm run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

生产环境部署前，将生产配置加载为 `.env`，再执行迁移并启动服务：

```bash
cp .env_prod .env
python -m alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```
## 其它

- [SVG 转 PNG 工具](https://svgtopng.com/)
