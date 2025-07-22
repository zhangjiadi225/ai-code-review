const axios = require('axios')
const { createPatch } = require('diff')
require('dotenv').config()

class GitHubService {
	constructor() {
		this.baseURL = 'https://api.github.com'
		this.token = process.env.GITHUB_TOKEN_AI

		// 调试信息
		console.log(
			'GitHub Token 配置:',
			this.token ? `${this.token.substring(0, 10)}...` : '未设置'
		)

		if (!this.token) {
			console.warn(
				'警告: GITHUB_TOKEN_AI 环境变量未设置，GitHub API 功能将受限'
			)
		}

		// 动态设置请求头，仅在token存在时添加认证信息
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
				const content = Buffer.from(response.data.content, 'base64').toString(
					'utf-8'
				)
				return content
			}

			return null
		} catch (error) {
			console.error(
				`获取文件内容错误 ${path}:`,
				error.response?.status,
				error.response?.data?.message
			)

			// 如果是认证错误，提供更详细的错误信息
			if (error.response?.status === 401) {
				console.error('GitHub Token 认证失败，请检查 GITHUB_TOKEN_AI 环境变量')
				console.error(
					'当前Token:',
					this.token ? `${this.token.substring(0, 10)}...` : '未设置'
				)
			}

			return null
		}
	}

	// 获取提交的父节点SHA
	async getParentCommitSha(owner, repo, commitSha) {
		try {
			const response = await this.client.get(
				`/repos/${owner}/${repo}/commits/${commitSha}`
			)
			return response.data.parents?.[0]?.sha || null
		} catch (error) {
			console.error(`获取父提交SHA错误 ${commitSha}:`, error)
			return null
		}
	}

	// 获取提交的diff信息
	async getCommitDiff(owner, repo, commitSha, filesFromWebhook = null) {
		try {
			// 如果webhook已提供文件信息，直接使用
			if (filesFromWebhook) {
				console.log(`使用webhook提供的文件信息，尝试获取完整内容`)

				// 获取父提交SHA用于获取旧版本内容
				const parentSha = await this.getParentCommitSha(owner, repo, commitSha)

				const files = []

				// 处理添加的文件
				if (filesFromWebhook.added && filesFromWebhook.added.length > 0) {
					for (const filename of filesFromWebhook.added) {
						if (this.isCodeFile(filename)) {
							try {
								// 获取新文件内容
								const newContent = await this.getFileContent(
									owner,
									repo,
									filename,
									commitSha
								)

								files.push({
									oldPath: null,
									newPath: filename,
									diff: newContent
										? createPatch(filename, '', newContent)
										: null,
									newFile: true,
									deletedFile: false,
									renamedFile: false,
									newContent: newContent,
									oldContent: null,
								})
							} catch (error) {
								console.error(`处理新增文件 ${filename} 时出错:`, error)
								// 继续处理其他文件
							}
						}
					}
				}

				// 处理修改的文件
				if (filesFromWebhook.modified && filesFromWebhook.modified.length > 0) {
					for (const filename of filesFromWebhook.modified) {
						if (this.isCodeFile(filename)) {
							try {
								// 获取新旧文件内容
								const newContent = await this.getFileContent(
									owner,
									repo,
									filename,
									commitSha
								)
								const oldContent = parentSha
									? await this.getFileContent(owner, repo, filename, parentSha)
									: null

								files.push({
									oldPath: filename,
									newPath: filename,
									diff:
										oldContent !== null && newContent !== null
											? createPatch(filename, oldContent, newContent)
											: null,
									newFile: false,
									deletedFile: false,
									renamedFile: false,
									newContent: newContent,
									oldContent: oldContent,
								})
							} catch (error) {
								console.error(`处理修改文件 ${filename} 时出错:`, error)
								// 继续处理其他文件
							}
						}
					}
				}

				// 处理删除的文件
				if (filesFromWebhook.removed && filesFromWebhook.removed.length > 0) {
					for (const filename of filesFromWebhook.removed) {
						if (this.isCodeFile(filename) && parentSha) {
							try {
								// 获取被删除文件的内容
								const oldContent = await this.getFileContent(
									owner,
									repo,
									filename,
									parentSha
								)

								files.push({
									oldPath: filename,
									newPath: null,
									diff: oldContent
										? createPatch(filename, oldContent, '')
										: null,
									newFile: false,
									deletedFile: true,
									renamedFile: false,
									newContent: null,
									oldContent: oldContent,
								})
							} catch (error) {
								console.error(`处理删除文件 ${filename} 时出错:`, error)
								// 继续处理其他文件
							}
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
