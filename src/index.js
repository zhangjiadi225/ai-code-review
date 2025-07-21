const express = require('express')
const path = require('path')
require('dotenv').config({ path: './config.env' })

const webhookRoutes = require('./routes/webhook')
const tunnelRoutes = require('./routes/tunnel')
const debugRoutes = require('./routes/debug')
const tunnelService = require('./services/tunnel')

const app = express()
const PORT = process.env.PORT || 3000

// 基本中间件
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // 保存原始请求体，用于验证GitHub签名
    req.rawBody = buf;
  }
}))
app.use(express.urlencoded({ extended: true }))

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
})

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')))

// 路由
app.use('/webhook', webhookRoutes)
app.use('/tunnel', tunnelRoutes)
app.use('/debug', debugRoutes)

// 添加webhook测试页面
app.get('/test-webhook', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-webhook.html'))
})

// 健康检查
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// 主页 - 隧道管理界面
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// 捕获所有404错误
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `路径 ${req.url} 不存在`,
    timestamp: new Date().toISOString()
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误',
    timestamp: new Date().toISOString()
  });
})

const server = app.listen(PORT, () => {
	console.log(`AI代码审查服务运行在端口 ${PORT}`)
})

// 服务器启动后延迟启动ngrok
setTimeout(async () => {
	try {
		console.log('开始启动内网穿透服务...')
		if (process.env.NODE_ENV !== 'production') {
			await tunnelService.startTunnel(PORT)
		}
	} catch (error) {
		console.error('启动内网穿透失败，但服务仍在本地运行:', error)
	}
}, 2000) // 延迟2秒启动

// 优雅关闭
process.on('SIGINT', async () => {
	console.log('正在关闭服务...')
	await tunnelService.stopTunnel()
	process.exit(0)
})

process.on('SIGTERM', async () => {
	console.log('正在关闭服务...')
	await tunnelService.stopTunnel()
	process.exit(0)
})

module.exports = app
