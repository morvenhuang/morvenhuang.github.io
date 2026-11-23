# Mem Addr

Morven Huang 的个人博客。源码、文章和图片都在本仓库维护，公开站点由 GitHub Pages 托管。

## 本地写作

安装 Node.js 22 和项目依赖，把环境变量模板复制成 `.env.local`，然后填写自己的 `ADMIN_PASSWORD`。使用后台的 Unsplash 搜索时，再填写 `UNSPLASH_ACCESS_KEY`。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

打开 [本地编辑器](http://127.0.0.1:3000/admin/login)。文章正文和元数据写入 `data/posts/`，图片写入 `uploads/`，分类和个人资料分别保存在 `data/categories.json` 和 `data/profile.json`。也可以直接编辑这些文件。后台更改后的密码保存在本地 `data/password.json` 中，优先于 `.env.local`。

## 预览与发布

```sh
npm run build
npm run preview
```

构建产物位于 `dist/`，包含公开页面、文章数据和图片。文章、分类和标签都有独立的静态入口，可直接打开或刷新。

首次发布时，在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。将文章、图片和源码提交并推送到 `main` 后，工作流会构建并发布到 [morvenhuang.github.io](https://morvenhuang.github.io/)。
