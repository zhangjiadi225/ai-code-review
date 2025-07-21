const ngrok = require('ngrok')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

class TunnelService {
	constructor() {
		this.tunnelUrl = null
		this.isConnected = false
		this.tunnelInstance = null
		this.reconnectAttempts = 0
		this.maxReconnectAttempts = 5
		this.reconnectInterval = 10000 // 10秒
	}

	/**
	 * 启动内网穿透隧道
	 * @param {number} port - 本地服务端口
	 * @returns {Promise<string>} - 返回公网URL
	 */
	async startTunnel(port = 3000) {
		try {
			console.log('正在启动ngrok内网穿透隧道...')

			// 确保没有残留的ngrok进程
			await this.killNgrokProcesses()

			// 尝试启动ngrok
			await this.startNgrok(port)

			this.isConnected = true
			this.reconnectAttempts = 0

			console.log(`✅ 内网穿透已启动！`)
			console.log(`🌐 公网地址: ${this.tunnelUrl}`)
			console.log(`📝 GitHub Webhook URL: ${this.tunnelUrl}/webhook/github`)
			console.log(`📝 GitLab Webhook URL: ${this.tunnelUrl}/webhook/gitlab`)

			return this.tunnelUrl
		} catch (error) {
			console.error('启动内网穿透失败:', error)

			// 尝试重连
			if (this.reconnectAttempts < this.maxReconnectAttempts) {
				this.reconnectAttempts++
				console.log(
					`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
				)

				// 在重试前杀死所有ngrok进程
				await this.killNgrokProcesses()

				setTimeout(() => this.startTunnel(port), this.reconnectInterval)
				return null
			}

			throw error
		}
	}

	/**
	 * 启动Ngrok隧道
	 * @param {number} port - 本地服务端口
	 * @private
	 */
	async startNgrok(port) {
		try {
			// 配置ngrok选项
			const options = {
				addr: port,
				region: 'ap', // 固定使用亚太地区(中国)
				onStatusChange: (status) => {
					console.log(`Ngrok状态变更: ${status}`)
				},
				onLogEvent: (data) => {
					if (data.includes('error') || data.includes('fail')) {
						console.log(`Ngrok日志: ${data}`)
					}
				},
			}

			// 如果有ngrok token，使用认证
			if (process.env.NGROK_TOKEN) {
				options.authtoken = process.env.NGROK_TOKEN
			}

			// 尝试连接
			this.tunnelUrl = await ngrok.connect(options)
			this.tunnelInstance = 'ngrok'
		} catch (error) {
			console.error('Ngrok连接错误:', error)

			// 如果是连接被拒绝错误，可能是端口冲突
			if (error.message && error.message.includes('ECONNREFUSED')) {
				console.log('尝试使用备用方法启动ngrok...')
				await this.startNgrokAlternative(port)
			} else {
				throw error
			}
		}
	}

	/**
	 * 使用备用方法启动ngrok
	 * @param {number} port - 本地服务端口
	 * @private
	 */
	async startNgrokAlternative(port) {
		try {
			// 使用命令行直接启动ngrok
			const cmd = `npx ngrok http ${port} --region ap --log=stdout`
			console.log(`执行命令: ${cmd}`)

			// 执行命令并获取输出
			const { stdout } = await execAsync(cmd)

			// 从输出中提取URL
			const match = stdout.match(/url=https:\/\/[a-z0-9]+\.ngrok\.io/)
			if (match) {
				this.tunnelUrl = match[0].replace('url=', '')
				this.tunnelInstance = 'ngrok-cli'
				return
			}

			throw new Error('无法从ngrok输出中提取URL')
		} catch (error) {
			console.error('备用方法启动ngrok失败:', error)
			throw error
		}
	}

	/**
	 * 杀死所有ngrok进程
	 * @private
	 */
	async killNgrokProcesses() {
		try {
			// 在Windows上使用taskkill
			if (process.platform === 'win32') {
				await execAsync('taskkill /f /im ngrok.exe', { stdio: 'ignore' }).catch(
					() => {}
				)
			} else {
				// 在Linux/Mac上使用pkill
				await execAsync('pkill -f ngrok', { stdio: 'ignore' }).catch(() => {})
			}

			// 使用ngrok库的kill方法
			try {
				await ngrok.kill()
			} catch (e) {
				// 忽略错误
			}

			console.log('已清理ngrok进程')
		} catch (error) {
			// 忽略错误，因为可能没有运行中的ngrok进程
			console.log('清理ngrok进程时出现错误 (可能无进程运行):', error.message)
		}
	}

	/**
	 * 停止隧道
	 */
	async stopTunnel() {
		try {
			if (!this.isConnected) return

			// 尝试断开连接
			try {
				await ngrok.disconnect()
			} catch (e) {
				console.log('断开ngrok连接时出错:', e.message)
			}

			// 杀死所有ngrok进程
			await this.killNgrokProcesses()

			this.isConnected = false
			this.tunnelUrl = null
			this.tunnelInstance = null
			console.log('内网穿透隧道已关闭')
		} catch (error) {
			console.error('关闭隧道错误:', error)
		}
	}

	/**
	 * 获取隧道状态
	 * @returns {Object} 隧道状态信息
	 */
	getStatus() {
		return {
			isConnected: this.isConnected,
			tunnelUrl: this.tunnelUrl,
			tunnelType: 'ngrok',
			reconnectAttempts: this.reconnectAttempts,
		}
	}

	/**
	 * 获取所有活跃隧道
	 * @returns {Promise<Array>} 隧道列表
	 */
	async getTunnels() {
		try {
			if (!this.isConnected) {
				return []
			}

			// 如果使用的是备用方法，返回手动构建的隧道信息
			if (this.tunnelInstance === 'ngrok-cli') {
				return [
					{
						public_url: this.tunnelUrl,
						proto: 'https',
						name: 'cli-tunnel',
					},
				]
			}

			// 否则使用API获取
			return await ngrok
				.getApi()
				.listTunnels()
				.catch(() => {
					// 如果API调用失败，返回手动构建的隧道信息
					return [
						{
							public_url: this.tunnelUrl,
							proto: 'https',
							name: 'fallback-tunnel',
						},
					]
				})
		} catch (error) {
			console.error('获取隧道列表错误:', error)
			return []
		}
	}
}

module.exports = new TunnelService()
