const axios = require('axios')
const BaseAIService = require('./base')
require('dotenv').config()

/**
 * Coze智能体服务实现
 */
class CozeService extends BaseAIService {
	constructor() {
		super()
		this.baseURL = process.env.COZE_API_URL || 'https://api.coze.cn/v3/chat'
		this.apiKey = process.env.COZE_API_KEY
		this.botId = process.env.COZE_BOT_ID
		this.serviceName = 'coze'
	}

	/**
	 * 使用Coze智能体进行代码审查
	 * @param {Array} diffs - 代码差异数组
	 * @param {Object} commit - 提交信息对象
	 */
	async review(diffs, commit) {
		console.log('使用Coze智能体进行代码审查')

		// 检查必要的配置
		if (!this.apiKey || !this.botId) {
			throw new Error(
				'Coze智能体配置不完整，请检查COZE_API_KEY和COZE_BOT_ID环境变量'
			)
		}

		// 保存请求消息
		const messageContent = JSON.stringify(diffs)
		await this.saveMessageToFile(messageContent, this.serviceName)

		return new Promise((resolve, reject) => {
			try {
				// 向Coze API发送请求，使用stream流
				axios
					.post(
						this.baseURL,
						{
							bot_id: this.botId,
							user_id: '1',
							stream: true,
							auto_save_history: false,
							additional_messages: [
								{
									role: 'user',
									content: messageContent,
									content_type: 'text',
								},
							],
						},
						{
							headers: {
								Authorization: 'Bearer ' + this.apiKey,
								'Content-Type': 'application/json',
							},
							responseType: 'stream',
						}
					)
					.then((result) => {
						console.log('Coze智能体响应成功，开始处理流数据')
						let buffer = '' // 用于拼接分块数据
						let fullResponse = '' // 完整的AI响应

						// 监听数据事件
						result.data.on('data', (chunk) => {
							buffer += chunk.toString()

							// 按行分割处理SSE数据
							const lines = buffer.split('\n')
							// 保留最后一行，可能不完整
							buffer = lines.pop() || ''

							// 处理每个完整的行
							lines.forEach((line) => {
								const trimmedLine = line.trim()
								if (trimmedLine.startsWith('data:')) {
									const data = trimmedLine.slice(5).trim()
									
									if (data === '[DONE]') {
										console.log('SSE 流结束')
										return
									}

									try {
										const jsonData = JSON.parse(data)
										console.dir(jsonData)
										// 处理消息事件
										if (jsonData.type === 'answer') {
											if (jsonData.type && 
												jsonData.role === 'assistant' && 
												jsonData.type === 'answer') {
												const content = jsonData.content || ''
												fullResponse += content
											}
										}
									} catch (parseError) {
										// 忽略JSON解析错误，继续处理其他数据
										console.log('跳过无效JSON数据:', data.substring(0, 50))
									}
								}
							})
						})

						// 监听流结束事件
						result.data.on('end', async () => {
							console.log('SSE 连接已结束')
							
							try {
								const review = {
									commitId: commit.id,
									commitMessage: commit.message,
									author: commit.author,
									timestamp: new Date().toISOString(),
									suggestions: fullResponse || '未能获取有效的AI响应',
									service: this.serviceName,
								}
                
								await this.saveToFile(review)
								console.log('代码审查完成')
								resolve(review)
							} catch (saveError) {
								console.error('保存审查结果失败:', saveError)
								reject(saveError)
							}
						})

						// 监听错误事件
						result.data.on('error', (streamError) => {
							console.error('SSE 流错误:', streamError)
							reject(streamError)
						})
					})
					.catch((requestError) => {
						console.error('请求失败:', requestError.message)
						reject(requestError)
					})
			} catch (error) {
				console.error('Coze智能体请求失败:', error.message)
				if (error.response) {
					console.error('错误详情:', error.response.data)
				}
				reject(error)
			}
		})
	}
}

module.exports = CozeService