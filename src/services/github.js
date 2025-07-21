const axios = require('axios')

class GitHubService {
	constructor() {
		this.baseURL = 'https://api.github.com'
		this.token = process.env.GITHUB_TOKEN
		this.client = axios.create({
			baseURL: this.baseURL,
			headers: {
				Authorization: `token ${this.token}`,
				Accept: 'application/vnd.github.v3+json',
			},
		})
	}

	// 获取提交的diff信息
	async getCommitDiff(owner, repo, commitSha, filesFromWebhook = null) {
		try {
			// 如果webhook已提供文件信息，直接使用
			if (filesFromWebhook) {
				console.log(`使用webhook提供的文件信息，无需API调用`)
				
				const files = []
				
				// 处理添加的文件
				filesFromWebhook.added?.forEach(filename => {
					if (this.isCodeFile(filename)) {
						files.push({
							oldPath: null,
							newPath: filename,
							diff: null, // webhook不提供diff内容
							newFile: true,
							deletedFile: false,
							renamedFile: false
						})
					}
				})
				
				// 处理修改的文件
				filesFromWebhook.modified?.forEach(filename => {
					if (this.isCodeFile(filename)) {
						files.push({
							oldPath: filename,
							newPath: filename,
							diff: null, // webhook不提供diff内容
							newFile: false,
							deletedFile: false,
							renamedFile: false
						})
					}
				})
				
				// 处理删除的文件
				filesFromWebhook.removed?.forEach(filename => {
					if (this.isCodeFile(filename)) {
						files.push({
							oldPath: filename,
							newPath: null,
							diff: null, // webhook不提供diff内容
							newFile: false,
							deletedFile: true,
							renamedFile: false
						})
					}
				})
				
				return files
			}
			
			// 如果没有webhook文件信息，则通过API获取
			console.log(`获取提交diff: ${commitSha} in ${owner}/${repo}`)

			const response = await this.client.get(
				`/repos/${owner}/${repo}/commits/${commitSha}`
			)

			if (!response.data.files) {
				console.log(`提交 ${commitSha} 没有文件变更`)
				return []
			}

			// 过滤代码文件
			const filteredFiles = response.data.files.filter((file) => {
				return this.isCodeFile(file.filename) && file.patch
			})

			return filteredFiles.map((file) => ({
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

	// 判断是否为代码文件
	isCodeFile(filePath) {
		if (!filePath) return false

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
			'.html',
			'.css',
			'.scss',
			'.less',
			'.json',
			'.xml',
			'.yaml',
			'.yml',
			'.md',
			'.sh',
			'.bash',
			'.ps1',
		]

		const extension = filePath
			.toLowerCase()
			.substring(filePath.lastIndexOf('.'))
		return codeExtensions.includes(extension)
	}
}

module.exports = new GitHubService()
