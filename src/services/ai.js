const axios = require('axios')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

class AIService {
	constructor() {
		this.baseURL = 'https://api.siliconflow.cn/v1/chat/completions'
		this.apiKey = process.env.SILICONFLOW_API_KEY
		this.model = process.env.SILICONFLOW_MODEL || 'deepseek-chat'
	}
	async reviewAll(diffs, commit) {
		const message = [
			{
				role: 'user',
				content: `你是一个专业的代码审查员。先查看文件后缀确认diff的语言是什么。请仔细分析提供的代码diff，找出潜在的问题和改进建议。
        
        请关注以下方面：
        1. 代码质量和最佳实践
        2. 潜在的bug和错误
        3. 性能问题
        4. 安全漏洞
        5. 代码风格和规范
        6. 可读性和维护性
        
        请用中文回复，并提供具体的改进建议。如果代码没有问题，请回复"无建议"。以下是我的diff信息
        
        ${JSON.stringify(diffs)}`,
			},
		]
    this.saveMessageToFile(message)
		const result = await axios.post(
			this.baseURL,
			{
				model: this.model,
				messages: message,
			},
			{
				headers: {
					Authorization: 'Bearer ' + this.apiKey,
					'Content-Type': 'application/json',
				},
			}
		)

		console.log('AI服务测试成功:', result.data.choices[0].message.content)
		console.log('Token使用情况:', result.data.usage)
		const suggestions = result.data.choices[0].message.content
		const review = {
			commitId: commit.id,
			commitMessage: commit.message,
			author: commit.author,
			timestamp: new Date().toISOString(),
			suggestions: suggestions,
		}
		this.saveToFile(review)
	}

	// 保存到txt文件
	async saveToFile(review) {
		try {
			const outputDir = path.join(process.cwd(), 'reviews')
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true })
			}

			const filename = `review_${review.commitId.substring(0, 8)}_${new Date()
				.toISOString()
				.replace(/[:.]/g, '-')}.txt`
			const filepath = path.join(outputDir, filename)

			let content = `代码审查报告\n`
			content += `==========================================\n\n`
			content += `提交ID: ${review.commitId}\n`
			content += `提交信息: ${review.commitMessage}\n`
			content += `作者: ${review.author?.name || 'Unknown'}\n`
			content += `审查时间: ${review.timestamp}\n\n`

			content += `详细建议:\n`
			content += `------------------------------------------\n\n`

			content += review.suggestions

			fs.writeFileSync(filepath, content, 'utf8')
			console.log(`审查报告已保存到: ${filepath}`)
		} catch (error) {
			console.error('保存文件错误:', error)
			throw error
		}
	}

	// 保存请求ai的请求体
	async saveMessageToFile(message) {
		try {
			const outputDir = path.join(process.cwd(), 'messages')
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true })
			}
			const filename = `messages_${review.commitId.substring(0, 8)}_${new Date()
				.toISOString()
				.replace(/[:.]/g, '-')}.txt`
			const filepath = path.join(outputDir, filename)
			let content = `发送到AI的内容
      ${message[0].content}
      `
			fs.writeFileSync(filepath, content, 'utf8')
		} catch (error) {
			console.error('保存文件错误:', error)
			throw error
		}
	}
}

module.exports = new AIService()
