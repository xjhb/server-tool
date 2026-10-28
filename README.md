# ServerTool - Linux 服务器连接工具

一个类似 Xshell 的跨平台 Linux 服务器连接工具，基于 Electron + Vue 3 构建。

## 功能特性

- **SSH 终端连接** - 完整的终端模拟，支持颜色、光标移动等
- **SFTP 文件管理** - 浏览、上传、下载服务器文件
- **会话管理** - 保存连接信息，支持分组管理
- **多标签页** - 同时打开多个终端或文件管理器
- **密码认证** - 支持用户名密码登录，凭据本地加密存储

## 技术栈

- **框架**: Electron 28 + Vue 3.4 + TypeScript 5.3
- **构建**: Vite 5 + electron-builder
- **UI**: Element Plus 2.5
- **终端**: xterm.js 5.5
- **SSH**: ssh2 1.15
- **状态管理**: Pinia 2.1
- **存储**: electron-store 8.1

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式
npm run electron:dev

# 构建应用
npm run electron:build
```

## 项目结构

```
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   └── preload.ts        # 预加载脚本
├── src/                   # Vue 渲染进程
│   ├── components/       # 组件
│   │   ├── TerminalPanel.vue  # 终端面板
│   │   └── SftpPanel.vue     # SFTP 面板
│   ├── views/            # 页面
│   │   └── HomeView.vue  # 主页面
│   ├── stores/           # Pinia 状态管理
│   │   ├── session.ts    # 会话管理
│   │   └── tab.ts        # 标签页管理
│   ├── router/           # 路由
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── index.html            # HTML 模板
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── package.json          # 项目配置
```

## 使用说明

1. 点击左侧"新建连接"按钮
2. 填写服务器信息（名称、主机、端口、用户名、密码）
3. 可选填分组名称用于分类管理
4. 保存后点击"终端"或"文件"按钮即可连接

## License

MIT
