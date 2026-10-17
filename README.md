# SVN Commit Message AI

在 VS Code 的源代码管理（Source Control）面板中，为 **SVN** 仓库一键生成提交信息。基于 GitHub Copilot 的语言模型（`vscode.lm` API），读取当前工作副本的变更并生成提交说明，直接填入提交输入框。

## 功能

- 在 SVN 提交输入框的标题栏添加 ✨ 按钮（命令：`Generate SVN Commit Message`）。
- 通过 `svn diff --git` 收集所有已修改文件的差异，并列出未版本控制（`?`）的新文件。
- 调用 Copilot 语言模型流式生成提交信息，实时写入输入框。
- 可配置输出语言、提交风格、diff 最大长度和模型系列。
- 超长 diff 自动截断，避免超出模型上下文。

## 前置条件

- VS Code `>= 1.95.0`
- 已安装并登录 **GitHub Copilot**（Copilot Chat）
- 已安装 [SVN 扩展](https://marketplace.visualstudio.com/items?itemName=johnstoncode.svn-scm)（`johnstoncode.svn-scm`）
- 本机命令行可用 `svn`

## 安装

### 1. 安装 VSIX

```bash
code --install-extension svn-commit-ai-0.0.4.vsix
```

或在 VS Code 中：扩展面板 → `...` → **从 VSIX 安装…**。

### 2. 手动启用提案 API（必需）

本扩展使用了提案 API `contribSourceControlInputBoxMenu`（在输入框上添加菜单按钮），需要手动允许：

1. 按 `Ctrl+Shift+P`，执行 **Preferences: Configure Runtime Arguments**，打开 `argv.json`
   （通常位于 `~/.vscode/argv.json`）。
2. 添加如下配置（注意扩展 ID 为 `发布者.名称`，即 `local.svn-commit-ai`）：

   ```jsonc
   {
     "enable-proposed-api": ["local.svn-commit-ai"]
   }
   ```

   若已有 `enable-proposed-api` 项，则把该 ID 追加进数组。
3. **完全退出并重启 VS Code**（仅重载窗口无效）。

未配置时，按钮不会显示，或扩展激活时报提案 API 未启用的错误。

## 使用

1. 打开包含 SVN 工作副本的文件夹，进入源代码管理面板。
2. 修改文件后，点击提交输入框右上角的 ✨ 按钮。
3. 等待生成完成，检查并编辑提交信息后提交。

也可在命令面板运行 `Generate SVN Commit Message`。

## 配置

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| `svnCommitAI.language` | `中文` | 提交信息语言 |
| `svnCommitAI.style` | Conventional Commits 风格 | 风格要求（标题 ≤ 72 字符，空行，要点列表） |
| `svnCommitAI.maxDiffChars` | `60000` | 发送给模型的 diff 最大字符数 |
| `svnCommitAI.modelFamily` | 空 | 指定模型系列（如 `gpt-4o`），空则使用第一个可用的 Copilot 模型 |

## 开发 / 打包

```bash
npm i -g @vscode/vsce
vsce package
```

## 注意

- diff 内容会发送给 Copilot 模型，涉密代码请自行评估。
- 提案 API 的扩展无法发布到 Marketplace，仅限本地安装使用。
