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
		this.retrieve = 'https://api.coze.cn/v3/chat/retrieve'
		this.messageListURL = 'https://api.coze.cn/v3/chat/message/list'
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

		try {
			// 向Coze API发送请求，只发送diffs数据
			const result = await axios.post(
				this.baseURL,
				{
					bot_id: this.botId,
					user_id: 1,
					stream: false,
					auto_save_history: true,
					messages: [
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
				}
			)

			console.log('Coze智能体响应成功')

			// 调用查看对话接口，使用conversation_id和chat_id轮询检查状态
			const { conversation_id, chat_id } = result.data

			// 轮询检查聊天是否完成
			let chatStatus = null
			let suggestions = null
			let maxRetries = 30
			let retryCount = 0

			while (
				retryCount < maxRetries &&
				(!chatStatus || chatStatus !== 'completed')
			) {
				try {
					console.log(`正在检查聊天状态，第${retryCount + 1}次尝试...`)
					const statusResponse = await axios.get(this.retrieve, {
						headers: {
							Authorization: 'Bearer ' + this.apiKey,
						},
						params: {
							conversation_id,
							chat_id,
						},
					})

					chatStatus = statusResponse.data.status
					console.log(`聊天状态: ${chatStatus}`)

					if (chatStatus === 'completed') {
						// 当状态为completed时，调用message/list接口获取完整响应
						console.log('聊天已完成，获取完整响应...')
						const messageListResponse = await axios.get(this.messageListURL, {
							headers: {
								Authorization: 'Bearer ' + this.apiKey,
							},
							params: {
								conversation_id,
								chat_id,
							},
						})

						// 从消息列表中获取最新的AI响应
						if (
							messageListResponse.data &&
							messageListResponse.data.messages &&
							messageListResponse.data.messages.length > 0
						) {
							// 找到最新的assistant消息
							const assistantMessages =
								messageListResponse.data.messages.filter(
									(msg) => msg.role === 'assistant'
								)

							if (assistantMessages.length > 0) {
								// 使用最新的assistant消息
								suggestions =
									assistantMessages[assistantMessages.length - 1].content
								console.log('成功获取AI完整响应')
							} else {
								// 如果没有找到assistant消息，使用状态响应
								suggestions = statusResponse.data.choices[0].message.content
								console.log('未找到AI响应消息，使用状态响应')
							}
						} else {
							// 如果消息列表为空，使用状态响应
							suggestions = statusResponse.data.choices[0].message.content
							console.log('消息列表为空，使用状态响应')
						}
						break
					}

					// 等待一段时间再次检查
					await new Promise((resolve) => setTimeout(resolve, 2000))
					retryCount++
				} catch (error) {
					console.error('检查聊天状态失败:', error.message)
					retryCount++
					await new Promise((resolve) => setTimeout(resolve, 3000))
				}
			}

			// 如果轮询结束后仍未完成，使用原始响应
			if (!suggestions) {
				console.log('轮询超时，使用原始响应')
				suggestions = result.data.choices[0].message.content
			}

			const review = {
				commitId: commit.id,
				commitMessage: commit.message,
				author: commit.author,
				timestamp: new Date().toISOString(),
				suggestions: suggestions,
				service: this.serviceName,
			}

			await this.saveToFile(review)
			return review
		} catch (error) {
			console.error('Coze智能体请求失败:', error.message)
			if (error.response) {
				console.error('错误详情:', error.response.data)
			}
			throw error
		}
	}
}

module.exports = CozeService
