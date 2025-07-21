const express = require('express')
const path = require('path')
require('dotenv').config()

const { router: webhookRoutes } = require('./routes/webhook')
const debugRoutes = require('./routes/debug')

const app = express()
const PORT = process.env.PORT || 3000

console.log(process.env.PORT, 'PORT')
console.log(process.env.GITHUB_TOKEN_AI, 'token')
// 基本中间件
app.use(
	express.json({
		limit: '10mb',
		verify: (req, res, buf) => {
			// 保存原始请求体，用于验证GitHub签名
			req.rawBody = buf
		},
	})
)
app.use(express.urlencoded({ extended: true }))

// 请求日志中间件
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
	next()
})

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')))

// 路由
app.use('/webhook', webhookRoutes)
app.use('/debug', debugRoutes)

// 健康检查路由

// 健康检查
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// 主页
app.get('/', (req, res) => {
	res.json({
		message: 'AI代码审查服务',
		status: 'running',
		endpoints: {
			health: '/health',
			github_webhook: '/webhook/github',
			gitlab_webhook: '/webhook/gitlab',
		},
	})
})

// 捕获所有404错误
app.use((req, res, next) => {
	res.status(404).json({
		status: 'error',
		message: `路径 ${req.url} 不存在`,
		timestamp: new Date().toISOString(),
	})
})

// 错误处理
app.use((err, req, res, next) => {
	console.error('服务器错误:', err)
	res.status(500).json({
		status: 'error',
		message: '服务器内部错误',
		timestamp: new Date().toISOString(),
	})
})

const server = app.listen(PORT, () => {
	console.log(`AI代码审查服务运行在端口 ${PORT}`)
})

// 启动信息
console.log(`服务器地址: http://localhost:${PORT}`)
console.log(`GitHub Webhook URL: http://localhost:${PORT}/webhook/github`)
console.log(`GitLab Webhook URL: http://localhost:${PORT}/webhook/gitlab`)

// 优雅关闭
process.on('SIGINT', () => {
	console.log('正在关闭服务...')
	process.exit(0)
})

process.on('SIGTERM', () => {
	console.log('正在关闭服务...')
	process.exit(0)
})

module.exports = app
