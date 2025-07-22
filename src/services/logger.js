const fs = require('fs')
const path = require('path')

class Logger {
	constructor() {
		this.logsDir = path.join(process.cwd(), 'logs')
		this.diffLogsDir = path.join(this.logsDir, 'diff')
		this.webhookLogsDir = path.join(this.logsDir, 'webhook')
		this.commitLogsDir = path.join(this.logsDir, 'commit')
		this.ensureLogsDirectories()
	}

	// 确保日志目录存在
	ensureLogsDirectories() {
		const directories = [
			this.logsDir,
			this.diffLogsDir,
			this.webhookLogsDir,
			this.commitLogsDir
		]
		
		directories.forEach(dir => {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true })
			}
		})
	}

	// 生成日志文件名
	generateLogFileName(type, timestamp = new Date()) {
		const date = timestamp.toISOString().split('T')[0] // YYYY-MM-DD
		const time = timestamp.toISOString().split('T')[1].replace(/[:.]/g, '-').split('Z')[0] // HH-MM-SS-mmm
		return `${type}_${date}_${time}.json`
	}

	// 保存 webhook 数据
	async saveWebhookData(type, data) {
		try {
			const timestamp = new Date()
			const fileName = this.generateLogFileName(`webhook_${type}`, timestamp)
			const filePath = path.join(this.webhookLogsDir, fileName)

			const logData = {
				timestamp: timestamp.toISOString(),
				type: type,
				data: data
			}

			await fs.promises.writeFile(filePath, JSON.stringify(logData, null, 2), 'utf8')
			console.log(`Webhook 数据已保存到: ${fileName}`)
			return fileName
		} catch (error) {
			console.error('保存 webhook 数据失败:', error)
			throw error
		}
	}

	// 保存 diff 数据
	async saveDiffData(commitId, repository, diff, additionalData = {}) {
		try {
			const timestamp = new Date()
			const fileName = this.generateLogFileName(`diff_${commitId.substring(0, 8)}`, timestamp)
			const filePath = path.join(this.diffLogsDir, fileName)

			const logData = {
				timestamp: timestamp.toISOString(),
				commitId: commitId,
				repository: repository,
				diff: diff,
				...additionalData
			}

			await fs.promises.writeFile(filePath, JSON.stringify(logData, null, 2), 'utf8')
			console.log(`Diff 数据已保存到: ${this.diffLogsDir}/${fileName}`)
			return fileName
		} catch (error) {
			console.error('保存 diff 数据失败:', error)
			throw error
		}
	}

	// 保存完整的提交处理数据
	async saveCommitProcessData(commitObj) {
		try {
			const timestamp = new Date()
			const fileName = this.generateLogFileName(`commit_${commitObj.id.substring(0, 8)}`, timestamp)
			const filePath = path.join(this.commitLogsDir, fileName)

			const logData = {
				timestamp: timestamp.toISOString(),
				processedCommit: commitObj
			}

			await fs.promises.writeFile(filePath, JSON.stringify(logData, null, 2), 'utf8')
			console.log(`提交处理数据已保存到: ${this.commitLogsDir}/${fileName}`)
			return fileName
		} catch (error) {
			console.error('保存提交处理数据失败:', error)
			throw error
		}
	}

	// 获取日志文件列表
	async getLogFiles(type = null, pattern = null) {
		try {
			let logDir = this.logsDir
			
			// 根据类型选择目录
			if (type === 'diff') {
				logDir = this.diffLogsDir
			} else if (type === 'webhook') {
				logDir = this.webhookLogsDir
			} else if (type === 'commit') {
				logDir = this.commitLogsDir
			}
			
			const files = await fs.promises.readdir(logDir)
			if (pattern) {
				return files.filter(file => file.includes(pattern))
			}
			return files.filter(file => file.endsWith('.json'))
		} catch (error) {
			console.error('获取日志文件列表失败:', error)
			return []
		}
	}

	// 读取日志文件
	async readLogFile(fileName, type = null) {
		try {
			let logDir = this.logsDir
			
			// 根据类型选择目录
			if (type === 'diff') {
				logDir = this.diffLogsDir
			} else if (type === 'webhook') {
				logDir = this.webhookLogsDir
			} else if (type === 'commit') {
				logDir = this.commitLogsDir
			}
			
			const filePath = path.join(logDir, fileName)
			const content = await fs.promises.readFile(filePath, 'utf8')
			return JSON.parse(content)
		} catch (error) {
			console.error(`读取日志文件失败 ${fileName}:`, error)
			throw error
		}
	}
}

module.exports = new Logger()