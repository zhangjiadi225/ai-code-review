# AI代码审查工具 - 精简版

一个简洁的AI代码审查工具，支持GitHub和GitLab的webhook，使用硅基流动AI进行代码审查，结果输出到本地txt文件。

## 功能特点

- 🔍 支持GitHub和GitLab的push事件webhook
- 🤖 使用硅基流动AI进行智能代码审查
- 📝 审查结果保存到本地txt文件
- 🚀 轻量级，依赖少，易于部署

## 安装

```bash
npm install
```

## 配置

复制`config.env`文件并修改相应配置：

```bash
cp config.env .env
```

### 配置项说明

```env
# 服务器端口
PORT=3000

# GitHub配置 (可选，如果使用GitHub)
GITHUB_TOKEN=your-github-token

# GitLab配置 (可选，如果使用GitLab)
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your-gitlab-token

# 硅基流动AI配置 (必须)
SILICONFLOW_API_KEY=your-siliconflow-api-key
SILICONFLOW_MODEL=deepseek-chat

# 环境配置
NODE_ENV=development
```

### 获取配置信息

1. **硅基流动API Key**：
   - 访问 [https://siliconflow.cn](https://siliconflow.cn)
   - 注册并获取API Key

2. **GitHub Token**（如果使用GitHub）：
   - 访问 GitHub Settings > Developer settings > Personal access tokens
   - 创建token，需要`repo`权限

3. **GitLab Token**（如果使用GitLab）：
   - 访问 GitLab Settings > Access Tokens
   - 创建token，需要`read_repository`权限

## 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 配置Webhook

### GitHub设置

1. 进入你的GitHub仓库
2. 点击 Settings > Webhooks > Add webhook
3. 设置Payload URL: `http://your-domain.com/webhook/github`
4. Content type: `application/json`
5. 选择 `Just the push event`
6. 点击 Add webhook

### GitLab设置

1. 进入你的GitLab项目
2. 点击 Settings > Webhooks
3. 设置URL: `http://your-domain.com/webhook/gitlab`
4. 选择 `Push events`
5. 点击 Add webhook

## 使用方法

1. 配置好webhook后，每次push代码时会自动触发审查
2. 审查结果会保存在`reviews/`目录下
3. 文件名格式：`review_[commit前8位]_[时间戳].txt`

## 输出示例

```text
代码审查报告
==========================================

提交ID: abc123def456
提交信息: 修复用户登录bug
作者: 张三
审查时间: 2024-01-01T10:00:00.000Z

总结: 代码审查完成，共发现 2 个建议需要关注。

详细建议:
------------------------------------------

1. 文件: src/auth/login.js
   时间: 2024-01-01T10:00:00.000Z
   建议: 建议在密码验证前添加输入验证，防止SQL注入攻击...

2. 文件: src/utils/helper.js
   时间: 2024-01-01T10:00:00.000Z
   建议: 建议使用try-catch包装异步操作，提高错误处理能力...
```

## 项目结构

```
ai-code-review/
├── src/
│   ├── index.js          # 主服务器
│   ├── routes/
│   │   └── webhook.js    # Webhook路由处理
│   └── services/
│       ├── ai.js         # AI服务（硅基流动）
│       ├── github.js     # GitHub API服务
│       └── gitlab.js     # GitLab API服务
├── reviews/              # 审查结果目录（自动创建）
├── package.json
└── README.md
```

## 注意事项

1. 确保有足够的硅基流动API额度
2. 审查结果文件会随时间积累，建议定期清理
3. 只审查代码文件，忽略二进制文件
4. 大文件diff可能影响AI审查效果

## 常见问题

**Q: 为什么没有生成审查报告？**
A: 检查是否配置了正确的硅基流动API Key，以及提交是否包含代码文件变更。

**Q: 支持哪些编程语言？**
A: 支持常见的编程语言文件，如.js, .ts, .py, .java, .cpp等。

**Q: 如何自定义审查规则？**
A: 可以修改`src/services/ai.js`中的审查提示词。

## 许可证

MIT License