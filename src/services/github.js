const axios = require('axios')
require('dotenv').config()

class GitHubService {
	constructor() {
		this.baseURL = 'https://api.github.com'
		this.token = process.env.GITHUB_TOKEN_AI

		// 动态设置请求头
		this.client = axios.create({
			baseURL: this.baseURL,
			headers: {
				Accept: 'application/vnd.github.v3+json',
				...(this.token ? { Authorization: `token ${this.token}` } : {}),
			},
		})
	}
	// 获取提交的diff信息
	async getCommitDiff(owner, repo, commitSha, webhookFiles = null) {
		try {
			// 优先使用GitHub API获取diff
			console.log(`从GitHub API获取提交diff: ${commitSha} in ${owner}/${repo}`)
			const response = await this.client.get(
				`/repos/${owner}/${repo}/commits/${commitSha}`
			)

			if (!response.data.files) {
				console.log(`提交 ${commitSha} 没有文件变更`)
				return []
			}

			// 过滤并返回纯代码文件的diff
			return response.data.files
				.filter((file) => this.isPureCodeFile(file.filename) && file.patch)
				.map((file) => ({
					oldPath: file.previous_filename || file.filename,
					newPath: file.filename,
					diff: file.patch,
					newFile: file.status === 'added',
					deletedFile: file.status === 'removed',
					renamedFile: file.status === 'renamed',
				}))
		} catch (error) {
			console.error(`获取提交diff错误 ${commitSha}:`, error)
			throw error
		}
	}

	// 判断是否为纯代码文件（排除JSON、XML等配置/数据文件）
	isPureCodeFile(filePath) {
		if (!filePath) return false

		// 只保留纯代码文件扩展名
		const codeExtensions = [
			'.js',
			'.ts',
			'.jsx',
			'.tsx',
			'.vue',
			'.py',
			'.java',
			'.cpp',
			'.c',
			'.cs',
			'.php',
			'.rb',
			'.go',
			'.rs',
			'.swift',
			'.kt',
			'.scala',
			'.sql',
			'.html'
		]

		const extension = filePath
			.toLowerCase()
			.substring(filePath.lastIndexOf('.'))
		return codeExtensions.includes(extension)
	}
}

module.exports = new GitHubService()
