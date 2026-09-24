# dsh-memory-plus 测试环境记录

> 本文件记录 2026-09-24 对 **DSH Desktop 2.0.4 / dsh 0.1.5-rc.2** 真机安装验证的完整过程与结果，
> 以及 `observeSession` 兼容性补丁（上游 issue #1）的修复说明。
> 供发布前自查与下游使用者核对环境差异。

## 1. 被测环境（验证机）

| 项目 | 值 |
|---|---|
| OS | Windows 11 (win32 x64) |
| DSH Desktop | 0.15.5（`D:\Deepseek Harness Desktop\deepseek-harness-desktop.exe`） |
| dsh runtime | `0.1.5-rc.2`（Desktop 内置：`AppData\Roaming\io.github.hairyf.deepseek-harness-desktop\dependencies\dsh`） |
| Node.js | v24.9.0 |
| pnpm | v12.4.1（corepack） |
| 基类 `@deepseek-ai/dsh-session-query` | `0.1.5-rc.2`（Desktop 侧 node_modules 自带，**含 `observeSession`**） |
| 仓库 lockfile 锁定的基类 | `0.1.0-rc.7`（**不含 `observeSession`**，见 §3） |

## 2. 安装路径（验证机）

- 仓库源码：`C:\Users\羊\.dsh\dsh-memory-plus`（8 个包目录）
- 派生库（SQLite）：`C:\Users\羊\.dsh\dsh-memory\*.db`
- 安装进 profile：`dsh plugin --profile web add <8 个包目录>`，随后 `pnpm install`
- profile patch 层：`~/.dsh/profiles/web/cordis.patch.yml` 追加绝对路径覆盖

## 3. 发现的 bug 与修复（issue #1）

### 3.1 现象

DSH Desktop 2.0.4 安装 dsh-memory-plus 后，启动时**会话列表加载失败**：

```
TypeError: this.ctx.sessionQuery.observeSession is not a function
```

### 3.2 根因

- Desktop 2.0.4 的 `session-controller` 在 `api-session.list` 中对 cold session 调用
  `ctx.sessionQuery.observeSession(...)`。
- `dsh-session-query-sqlite-cjk` 是官方 `dsh-session-query-sqlite` 的 CJK fork，
  其 `CjkSessionQueryEngine` **继承**基类 `SessionQueryEngine`。
- 仓库 `pnpm-lock.yaml` 将基类 `@deepseek-ai/dsh-session-query` 锁定在 `0.1.0-rc.7`，
  该版本的 `SessionQueryEngine` **尚未实现 `observeSession`**（方法在 `0.1.5-rc.2` 才加入基类）。
- 当 cjk fork 继承自旧基类时，`ctx.sessionQuery` 上没有 `observeSession`，调用即抛
  `is not a function`。

### 3.3 修复

在 `packages/dsh-session-query-sqlite-cjk/lib/index.js` 的 `CjkSessionQueryEngine` 上
**显式补写 `observeSession(sessionId, options)`**：

- 若继承的基类已提供 `_observations.read`（新基类），直接委托；
- 否则走 `observeSessionFallback`，用 `ctx.sessions` + `ctx.sessionPersistence`
  现场构造一个 live/prepared 观察租约（与官方 `SessionObservationReader` 语义对齐，
  含 `[Symbol.dispose]`）。

同步更新 `lib/types/index.d.ts`，声明 `observeSession` 方法签名。

### 3.4 验证

- `node --check lib/index.js` 通过。
- 真实 `Context`（`@deepseek-ai/cordis`）下端到端：
  - live 会话返回正确 lease（`source`/`header`/`events`/`cursor`/`[Symbol.dispose]`）
  - 不存在会话抛 `SESSION_QUERY_SESSION_NOT_FOUND`
  - 类原型链上 `observeSession` 可调用
- 全量单测 **55/55 通过**（`corepack pnpm test`，8 个包）。
- 真机 `dsh --profile web --dump-config`：7 个 memory 插件全部正常装配，
  `session-query-sqlite-cjk` 路径指向 DSH_HOME。

## 4. 兼容性矩阵（发布前自查）

| 基类版本 | 是否有 `observeSession` | 本插件行为 |
|---|---|---|
| `0.1.0-rc.7`（仓库 lock 默认） | 否 | 走 fallback 自实现 ✅ |
| `0.1.5-rc.2`（Desktop 2.0.4 自带） | 是 | 委托基类 `_observations.read` ✅ |

> 建议下游：若宿主机 dsh runtime 的 `@deepseek-ai/dsh-session-query` 版本
> 高于 `0.1.5-rc.2` 且移除了 `SessionObservationReader`，需重新核对 fallback 路径。

## 5. 已知限制

- 自动 recall 注入（`recall.injectBudgetRatio`）未启用，召回靠模型主动调 `memory_search`。
- 嵌入默认 `char-overlap`；生产语义检索需配置 `embedder.kind: transformers` +
  `@huggingface/transformers`。
- 本仓库未发布到 npm，安装走 Git 方式（见 README §安装）。
