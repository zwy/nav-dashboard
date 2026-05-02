# nav-dashboard

本地书签导航页，运行于浏览器，适合作为个人常用网址首页或轻量书签管理工具。

## 功能特性

- 分类管理：新建、编辑、删除分类，自定义颜色
- 书签管理：新增、编辑、删除书签，支持标签和描述
- 搜索过滤：按名称、URL、描述、标签搜索（⌘K / Ctrl+K 快捷键）
- 深色模式：支持浅色 / 深色主题切换，跟随系统偏好
- JSON 导入导出：支持数据备份与迁移
- Chrome 书签 HTML 导入：可直接导入浏览器导出的 `bookmarks.html`
- 去重检测：新增或导入时自动识别重复 URL
- 撤销一步：支持撤销最近一次数据变更（⌘Z / Ctrl+Z）
- 安全跳转：仅允许 http/https 协议，防止 XSS
- 单页静态部署：无需后端，适合 GitHub Pages

## 项目结构

```
nav-dashboard/
├── index.html      # 页面结构
├── style.css       # 样式（Design Tokens + 组件）
├── app.js          # 核心逻辑
├── favicon.svg     # 网站图标
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

### 桌面客户端（GitHub Releases）

项目计划使用 **Tauri** 打包为原生桌面应用，发布于 [GitHub Releases](https://github.com/zwy/nav-dashboard/releases)。

| 平台 | 文件格式 |
|------|----------|
| macOS | `.dmg` |
| Windows | `.exe` / `.msi` |
| Linux | `.AppImage` / `.deb` |

> 打包后安装包体积 < 5MB，无需安装 Node.js 或其他运行时。

### 导入数据

支持两种导入方式：

| 入口 | 说明 |
|------|------|
| JSON | 导入本项目导出的数据文件 |
| 浏览器书签 HTML | 导入浏览器导出的 `bookmarks.html`（Chrome / Edge / Firefox 均可） |

导入时支持两种策略：

- **合并**：跳过重复书签，只新增不存在的内容（推荐）
- **覆盖**：清空现有数据，完整替换为导入内容（可用撤销恢复）

## 数据存储

使用浏览器 `localStorage` 在本地保存数据。不同浏览器和设备之间不会自动同步，建议定期导出 JSON 作为备份。

> Tauri 桌面版计划迁移为本地文件存储，彻底脱离浏览器限制。

## 更新记录

### v1.1.1

- 安全修复：`openUrl` 加入 `https?://` 协议白名单，防止 `javascript:` 协议 XSS 攻击
- 安全修复：Chrome 书签解析中 `a.href` 同步加入正则白名单校验
- 代码优化：删除 `normalizeUrl` 中 `u.search = u.search` 无效自赋值
- 添加 `favicon.svg`，使用深青色网格 + 指南针设计，匹配项目风格

### v1.1

- 代码从单 HTML 文件拆分为 `index.html + style.css + app.js`
- 新增撤销上一步操作（⌘Z / Ctrl+Z）
- 新增 URL 去重检测，新增和导入时均生效
- 增强 JSON 导入流程，支持合并 / 覆盖两种策略
- 新增 Chrome / Edge / Firefox 书签 HTML 导入
- 保留 favicon 与侧边栏图标风格一致

### v1.0

- 单 HTML 文件实现分类管理、书签增删改、搜索、JSON 导入导出

## 后续开发计划

> 以下需求按优先级排序，标注具体功能点供参考。

### 🔶 v1.2 — 进阶书签采集

**目标：一键生成高质量书签信息，减少手动填写**

- [ ] **Metadata 自动抠取**
  - 输入 URL 后自动请求目标页，接收 `og:title`、`og:description`、`og:image`
  - 利用 CORS 代理（如 `allorigins.win`）解决跨域问题
  - 自动填充标题和描述字段，可人工修改
- [ ] **LLM 智能标签推荐**
  - 对接 OpenAI / 本地 Ollama API（可配置 API Key）
  - 根据页面标题、描述和域名，自动推荐 2–5 个标签
  - 推荐结果以"一键添加" Chip 形式展示在表单中
- [ ] **批量整理功能**
  - 支持多选书签，批量设置分类 / 标签 / 删除
  - 导入后的未分类书签可一键批量分配分类

### 🔷 v1.3 — 同步与快捷入口

**目标：跨设备 / 跨浏览器使用，降低添加书签的摩擦成本**

- [ ] **浏览器扩展（Tampermonkey 脚本 / 浏览器插件）**
  - 在任意页面一键添加当前页到 nav-dashboard
  - 携带 Metadata 与当前分类，自动写入 localStorage
- [ ] **可选云端同步（Gist / WebDAV）**
  - 支持将 JSON 同步到 GitHub Gist、WebDAV 服务
  - 配置 Token 后手动或定时同步
  - 不依赖外部服务即可完成跨设备同步
- [ ] **深色模式优化与主题定制**
  - 支持根颜色、背景纹理等主题自定义
  - 主题配置存入 localStorage

### 🔸 v1.4 — 信息密度与可用性提升

**目标：让导航页更高效、更个性化**

- [ ] **多层分组 / 文件夹结构**：分类支持嵌套（二级目录），展开 / 折叠左侧栏组
- [ ] **布局模式切换**：网格卡片 / 列表行 / 紧凑小图标三种视图，持久化用户偏好
- [ ] **书签常用度统计**：记录点击次数，按最近使用 / 最常用排序，首页展示「常用书签」区块
- [ ] **快捷键全局增强**：`?` 键弹出帮助面板，`n` 键快速新建书签，`g` 键跨分类跳转

### 🔹 v2.0 — PWA + Tauri 桌面版 + 可选后端

**目标：提升体验上限，跨设备全面支持**

- [ ] **PWA 支持**
  - 添加 `manifest.json` 和 Service Worker
  - 支持"添加到主屏幕"，离线可用
- [ ] **Tauri 桌面版**
  - 使用 Tauri v2 打包为 Windows / macOS / Linux 原生应用
  - 数据存储迁移为本地文件（脱离 localStorage 限制）
  - 发布至 GitHub Releases（`.dmg` / `.exe` / `.AppImage`）
- [ ] **可选后端（自托管 / Docker）**
  - Node.js / Deno 小型后端，封装为 Docker，一键启动
  - 提供 Metadata 抠取 API、LLM 标签推荐 API
  - 数据存入 SQLite，实现真正多设备实时同步

> 上述计划供参考，实际开发顺序可根据使用频率动态调整。欢迎提 Issue 或 PR。

## License

MIT
