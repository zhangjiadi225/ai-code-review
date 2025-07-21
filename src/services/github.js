const axios = require('axios')

class GitHubService {
	constructor() {
		this.baseURL = 'https://api.github.com'
		this.token = process.env.GITHUB_TOKEN
		
		// 调试信息
		console.log('GitHub Token 配置:', this.token ? `${this.token.substring(0, 10)}...` : '未设置')
		
		if (!this.token) {
			console.warn('警告: GITHUB_TOKEN 环境变量未设置，GitHub API 功能将受限')
		}
		
		this.client = axios.create({
			baseURL: this.baseURL,
			headers: {
				Authorization: `token ${this.token}`,
				Accept: 'application/vnd.github.v3+json',
			},
		})
	}

	// 获取完整的commit详情
	async getCommitDetails(owner, repo, commitSha) {
		try {
			console.log(`获取完整commit详情: ${commitSha} in ${owner}/${repo}`)
			
			const response = await this.client.get(
				`/repos/${owner}/${repo}/commits/${commitSha}`
			)
			
			return response.data
		} catch (error) {
			console.error(`获取commit详情错误 ${commitSha}:`, error)
			return null
		}
	}
	
	// 获取提交的文件内容
	async getFileContent(owner, repo, path, ref) {
		try {
			console.log(`获取文件内容: ${path} at ${ref} in ${owner}/${repo}`)
			
			// 如果没有token，跳过API调用
			if (!this.token || this.token === 'undefined') {
				console.warn(`跳过文件内容获取 ${path}: GitHub Token 未配置`)
				return null
			}
			
			const response = await this.client.get(
				`/repos/${owner}/${repo}/contents/${path}`,
				{ params: { ref } }
			)
			
			// GitHub API返回的内容是Base64编码的
			if (response.data.content) {
				const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
				return content
			}
			
			return null
		} catch (error) {
			console.error(`获取文件内容错误 ${path}:`, error.response?.status, error.response?.data?.message)
			
			// 如果是认证错误，提供更详细的错误信息
			if (error.response?.status === 401) {
				console.error('GitHub Token 认证失败，请检查 GITHUB_TOKEN 环境变量')
				console.error('当前Token:', this.token ? `${this.token.substring(0, 10)}...` : '未设置')
			}
			
			return null
		}
	}

	// 获取提交的diff信息
	async getCommitDiff(owner, repo, commitSha, filesFromWebhook = null) {
		try {
			// 如果webhook已提供文件信息，直接使用
			if (filesFromWebhook) {
				console.log(`使用webhook提供的文件信息，尝试获取完整内容`)
				
				const files = []
				const parentCommitSha = await this.getParentCommitSha(owner, repo, commitSha)
				
				// 处理添加的文件
				if (filesFromWebhook.added && filesFromWebhook.added.length > 0) {
					for (const filename of filesFromWebhook.added) {
						if (this.isCodeFile(filename)) {
							// 获取新文件内容
							const newContent = await this.getFileContent(owner, repo, filename, commitSha)
							
							files.push({
								oldPath: null,
								newPath: filename,
								diff: newContent ? `+++ b/${filename}\n${newContent}` : null,
								newFile: true,
								deletedFile: false,
								renamedFile: false,
								newContent: newContent,
								oldContent: null
							})
						}
					}
				}
				
				// 处理修改的文件
				if (filesFromWebhook.modified && filesFromWebhook.modified.length > 0) {
					for (const filename of filesFromWebhook.modified) {
						if (this.isCodeFile(filename)) {
							// 获取新旧文件内容
							const newContent = await this.getFileContent(owner, repo, filename, commitSha)
							const oldContent = parentCommitSha ? 
								await this.getFileContent(owner, repo, filename, parentCommitSha) : null
							
							files.push({
								oldPath: filename,
								newPath: filename,
								diff: await this.generateDiff(filename, oldContent, newContent),
								newFile: false,
								deletedFile: false,
								renamedFile: false,
								newContent: newContent,
								oldContent: oldContent
							})
						}
					}
				}
				
				// 处理删除的文件
				if (filesFromWebhook.removed && filesFromWebhook.removed.length > 0) {
					for (const filename of filesFromWebhook.removed) {
						if (this.isCodeFile(filename)) {
							// 获取旧文件内容
							const oldContent = parentCommitSha ? 
								await this.getFileContent(owner, repo, filename, parentCommitSha) : null
							
							files.push({
								oldPath: filename,
								newPath: null,
								diff: oldContent ? `--- a/${filename}\n${oldContent}` : null,
								newFile: false,
								deletedFile: true,
								renamedFile: false,
								newContent: null,
								oldContent: oldContent
							})
						}
					}
				}
				
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

	// 获取父提交SHA
	async getParentCommitSha(owner, repo, commitSha) {
		try {
			console.log(`获取父提交SHA: ${commitSha} in ${owner}/${repo}`)
			
			const response = await this.client.get(
				`/repos/${owner}/${repo}/commits/${commitSha}`
			)
			
			if (response.data.parents && response.data.parents.length > 0) {
				return response.data.parents[0].sha
			}
			
			return null
		} catch (error) {
			console.error(`获取父提交SHA错误 ${commitSha}:`, error)
			return null
		}
	}
	
	// 生成简单的diff
	async generateDiff(filename, oldContent, newContent) {
		if (!oldContent && !newContent) return null
		
		if (!oldContent) {
			return `+++ b/${filename}\n${newContent}`
		}
		
		if (!newContent) {
			return `--- a/${filename}\n${oldContent}`
		}
		
		// 简单的diff格式
		return `--- a/${filename}\n+++ b/${filename}\n${this.simpleDiff(oldContent, newContent)}`
	}
	
	// 简单的行级diff生成
	simpleDiff(oldText, newText) {
		if (!oldText) return `+${newText}`
		if (!newText) return `-${oldText}`
		
		const oldLines = oldText.split('\n')
		const newLines = newText.split('\n')
		let result = ''
		
		// 非常简单的diff算法，实际项目中可以使用更复杂的diff库
		const maxLines = Math.max(oldLines.length, newLines.length)
		
		for (let i = 0; i < maxLines; i++) {
			const oldLine = i < oldLines.length ? oldLines[i] : null
			const newLine = i < newLines.length ? newLines[i] : null
			
			if (oldLine === newLine) {
				result += ` ${oldLine}\n`
			} else {
				if (oldLine !== null) {
					result += `-${oldLine}\n`
				}
				if (newLine !== null) {
					result += `+${newLine}\n`
				}
			}
		}
		
		return result
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
