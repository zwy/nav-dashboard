# nav-dashboard

本地书签导航页，运行于浏览器，适合作为个人常用网址首页或轻量书签管理工具。

## 功能特性

- 分类管理：新建、编辑、删除分类
- 书签管理：新增、编辑、删除书签
- 搜索过滤：按名称、URL、描述、标签搜索
- 深色模式：支持浅色 / 深色主题切换
- JSON 导入导出：支持数据备份与迁移
- Chrome 书签 HTML 导入：可直接导入浏览器导出的 `bookmarks.html`
- 去重检测：新增或导入时识别重复 URL
- 撤销一步：支持撤销最近一次数据变更（⌘Z / Ctrl+Z）
- 单页静态部署：无需后端，适合 GitHub Pages

## 项目结构

```text
nav-dashboard/
├── index.html    # 页面结构
├── style.css     # 样式（Design Tokens + 组件）
├── app.js        # 核心逻辑
├── favicon.svg   # 网站图标
└── README.md
```

## 使用方式

### 直接打开

克隆仓库后，直接用浏览器打开 `index.html` 即可使用。

```bash
git clone https://github.com/zwy/nav-dashboard.git
cd nav-dashboard
open index.html
```

也可部署到 GitHub Pages 作为个人导航页。

### 导入数据

支持两种导入方式：

| 入口 | 说明 |
|---|---|
| JSON | 导入本项目导出的数据文件 |
| 浏览器书签 HTML | 导入浏览器导出的 `bookmarks.html`（Chrome / Edge / Firefox 均可） |

导入时支持两种策略：

- **合并**：跳过重复书签，只新增不存在的内容（推荐）
- **覆盖**：清空现有数据，完整替换为导入内容（可用撤销恢复）

## 数据存储

使用浏览器 `localStorage` 在本地保存数据。不同浏览器和设备之间不会自动同步，建议定期导出 JSON 作为备份。

## 更新记录

### v1.1

- 代码从单 HTML 文件拆分为 `index.html + style.css + app.js`
- 新增撤销上一步操作（⌘Z / Ctrl+Z）
- 新增 URL 去重检测，新增和导入时均生效
- 增强 JSON 导入流程，支持合并 / 覆盖两种策略
- 新增 Chrome / Edge / Firefox 书签 HTML 导入
- 保留 favicon 与侧边栏图标风格一致

### v1.0

- 单 HTML 文件实现分类管理、书签增删改、搜索、JSON 导入导出

## 后续规划

- 引入 LLM 做标题、描述、标签的智能采集
- 自动抓取网页 metadata（title / og:description）
- 批量整理与标签推荐
- 可选云端同步方案

## License

MIT
