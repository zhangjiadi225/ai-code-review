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

	// 获取提交的文件内容
	async getFileContent(owner, repo, path, ref) {
		try {
			console.log(`获取文件内容: ${path} at ${ref} in ${owner}/${repo}`)

			if (!this.token) {
				console.warn(`跳过文件内容获取 ${path}: GitHub Token 未配置`)
				return null
			}

			const response = await this.client.get(
				`/repos/${owner}/${repo}/contents/${path}`,
				{ params: { ref } }
			)

			if (response.data.content) {
				return Buffer.from(response.data.content, 'base64').toString('utf-8')
			}

			return null
		} catch (error) {
			console.error(
				`获取文件内容错误 ${path}:`,
				error.response?.status,
				error.response?.data?.message
			)

			if (error.response?.status === 401) {
				console.error('GitHub Token 认证失败，请检查配置')
			}

			return null
		}
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
			// 仅在有webhook数据且API失败时，使用简化的webhook处理
			if (webhookFiles) {
				console.warn(`API调用失败，使用webhook数据生成基础diff:`, error.message)
				return this.generateBasicDiffFromWebhook(
					owner,
					repo,
					commitSha,
					webhookFiles
				)
			}

			console.error(`获取提交diff错误 ${commitSha}:`, error)
			throw error
		}
	}

	// 从webhook数据生成最基础的diff信息
	async generateBasicDiffFromWebhook(owner, repo, commitSha, webhookFiles) {
		const files = []

		// 仅处理新增和修改的纯代码文件
		const processFile = async (filename, isNew = false) => {
			if (this.isPureCodeFile(filename)) {
				try {
					const content = await this.getFileContent(
						owner,
						repo,
						filename,
						commitSha
					)
					files.push({
						oldPath: isNew ? null : filename,
						newPath: filename,
						diff: content
							? isNew
								? `新增文件: ${filename}`
								: `修改文件: ${filename}`
							: null,
						newFile: isNew,
						deletedFile: false,
						renamedFile: false,
					})
				} catch (error) {
					console.error(`处理文件 ${filename} 时出错:`, error)
				}
			}
		}

		// 处理新增文件
		if (webhookFiles.added?.length) {
			for (const filename of webhookFiles.added) {
				await processFile(filename, true)
			}
		}

		// 处理修改文件
		if (webhookFiles.modified?.length) {
			for (const filename of webhookFiles.modified) {
				await processFile(filename)
			}
		}

		// 简单标记删除的文件
		if (webhookFiles.removed?.length) {
			for (const filename of webhookFiles.removed) {
				if (this.isPureCodeFile(filename)) {
					files.push({
						oldPath: filename,
						newPath: null,
						diff: `删除文件: ${filename}`,
						newFile: false,
						deletedFile: true,
						renamedFile: false,
					})
				}
			}
		}

		return files
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
