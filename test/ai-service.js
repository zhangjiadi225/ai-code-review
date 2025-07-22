const diffJson = require('../logs/diff/diff_affe896a_2025-07-22_03-18-11-649.json')
const axios = require('axios')
require('dotenv').config()
// 测试AI服务是否正常
this.baseURL = 'https://api.siliconflow.cn/v1/chat/completions'
this.apiKey = process.env.SILICONFLOW_API_KEY
this.model = process.env.SILICONFLOW_MODEL || 'deepseek-chat'
async function testAiService() {
	try {
		const result = await axios.post(
			this.baseURL,
			{
				model: this.model,
				messages: [
					{
						role: 'user',
						content: `你是一个专业的代码审查员。请仔细分析提供的代码diff，找出潜在的问题和改进建议。
            
            请关注以下方面：
            1. 代码质量和最佳实践
            2. 潜在的bug和错误
            3. 性能问题
            4. 安全漏洞
            5. 代码风格和规范
            6. 可读性和维护性
            
            请用中文回复，并提供具体的改进建议。如果代码没有问题，请回复"无建议"。以下是我的diff信息
            
            ${JSON.stringify(diffJson)}`,
					},
				],
			},
			{
				headers: {
					Authorization:
						'Bearer ' + this.apiKey,
					'Content-Type': 'application/json',
				},
			}
		)

		console.log('AI服务测试成功:', result.data.choices[0].message.content)
		console.log('Token使用情况:', result.data.usage)
		return result
	} catch (error) {
		console.error('AI服务测试失败:', error)
		throw error
	}
}

testAiService()
