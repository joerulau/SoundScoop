# SoundScoop

一个基于 Web 的音频提取和转录工具，支持从视频文件中提取音频并转换为文字。

## 功能特性

- **视频音频提取**: 基于 FFmpeg WebAssembly 的本地处理，支持多种视频格式
- **多格式输出**: 支持 MP3、WAV、AAC 等多种音频格式导出
- **语音转录**: 采用先进技术，精准识别语音内容并生成文字稿
- **历史记录**: 自动保存处理历史，支持文本折叠和展开功能
- **本地处理**: 音频提取完全在浏览器本地完成，保护用户隐私

## 支持格式

### 输入格式
- MP4, AVI, MOV, MKV, WMV, FLV, WebM
- MP3, WAV, AAC, OGG, M4A

### 输出格式
- MP3 (推荐)
- WAV (无损)
- AAC (高效压缩)

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式框架**: Tailwind CSS
- **路由管理**: React Router DOM
- **状态管理**: Zustand
- **音频处理**: FFmpeg WebAssembly
- **UI 组件**: Lucide React (图标)
- **通知组件**: Sonner (Toast)

## 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
# 使用 pnpm
pnpm install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 启动开发服务器
pnpm dev

# 或
npm run dev
```

访问 `http://localhost:5173` 查看应用。

### 构建生产版本

```bash
# 构建项目
pnpm build

# 预览构建结果
pnpm preview
```

### 代码检查

```bash
# 运行 ESLint 检查
pnpm lint

# 运行类型检查和构建验证
pnpm check
```

## 项目结构

```
src/
├── components/          # 可复用组件
├── hooks/              # 自定义 React Hooks
├── pages/              # 页面组件
│   ├── Home.tsx        # 首页
│   ├── Upload.tsx      # 文件上传页
│   ├── Processing.tsx  # 处理进度页
│   ├── Download.tsx    # 下载页面
│   ├── Transcription.tsx # 转录页面
│   └── History.tsx     # 历史记录页
├── store/              # Zustand 状态管理
├── utils/              # 工具函数
└── App.tsx             # 应用入口
```

## 使用说明

1. **上传文件**: 在首页选择或拖拽视频/音频文件
2. **选择格式**: 选择输出音频格式和质量
3. **提取音频**: 系统自动处理并提取音频
4. **语音转录**: 可选择将音频转换为文字
5. **下载结果**: 下载处理后的音频文件和转录文本
6. **查看历史**: 在历史记录页面查看之前的处理结果

## 开发规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 组件保持单一职责，控制在 300 行以内
- 使用 Tailwind CSS 进行样式开发
- 优先使用组合而非继承

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。
