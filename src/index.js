const express = require('express')
const path = require('path')
require('dotenv').config({ path: './config.env' })

const webhookRoutes = require('./routes/webhook')
const tunnelRoutes = require('./routes/tunnel')
const tunnelService = require('./services/tunnel')

const app = express()
const PORT = process.env.PORT || 3000

// 基本中间件
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')))

// 路由
app.use('/webhook', webhookRoutes)
app.use('/tunnel', tunnelRoutes)

// 健康检查
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// 主页 - 隧道管理界面
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// 错误处理
app.use((err, req, res, next) => {
	console.error('Error:', err)
	res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, async () => {
	console.log(`AI代码审查服务运行在端口 ${PORT}`)

	// 启动内网穿透服务
	try {
		if (process.env.NODE_ENV !== 'production') {
			await tunnelService.startTunnel(PORT)
		}
	} catch (error) {
		console.error('启动内网穿透失败，但服务仍在本地运行:', error)
	}
})

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
