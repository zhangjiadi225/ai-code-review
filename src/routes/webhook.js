const express = require('express')
const crypto = require('crypto')
const githubService = require('../services/github')
const gitlabService = require('../services/gitlab')
const aiService = require('../services/ai')
const logger = require('../services/logger')

const router = express.Router()

// GitHub webhook处理 - GET请求用于测试连接
router.get('/github', (req, res) => {
	console.log('收到GitHub webhook测试连接')
	res.status(200).send('GitHub Webhook endpoint is working!')
})

// GitHub webhook处理 - POST请求用于实际事件
router.post('/github', async (req, res) => {
	try {
		// 详细记录请求信息，帮助调试
		console.log('收到GitHub webhook POST请求')
		console.log('请求头:', JSON.stringify(req.headers, null, 2))
		console.log(
			'请求体预览:',
			JSON.stringify(req.body).substring(0, 500) + '...'
		)

		const eventType = req.headers['x-github-event']
		const deliveryId = req.headers['x-github-delivery']

		console.log(`收到GitHub webhook: ${eventType}, ID: ${deliveryId || '未知'}`)

		// 处理ping事件
		if (eventType === 'ping') {
			console.log('收到GitHub ping事件，webhook配置成功')
			return res.status(200).json({
				status: 'success',
				message: 'Webhook received successfully!',
			})
		}

		// 保存原始 webhook 数据
		if (eventType === 'push') {
			await logger.saveWebhookData('github_push', req.body)
		}

		// 处理push事件
		let processedCommits = []
		if (eventType === 'push') {
			processedCommits = await handleGitHubPush(req.body)
		}

		// 确保返回200状态码，同时返回处理后的提交信息
		return res.status(200).json({
			status: 'success',
			commits: processedCommits,
		})
	} catch (error) {
		console.error('处理GitHub webhook错误:', error)
		// 即使出错也返回200状态码，避免GitHub重试
		return res.status(200).json({
			status: 'error',
			message: '处理webhook时出错，但已收到请求',
		})
	}
})

// 处理GitHub push事件
async function handleGitHubPush(payload) {
	const { repository, commits, ref } = payload

	console.log(`处理GitHub push事件，仓库: ${repository.name}，分支: ${ref}`)
	console.log(`收到 ${commits.length} 个提交`)

	// 过滤有效提交
	const validCommits = commits.filter(
		(commit) =>
			commit.added.length > 0 ||
			commit.modified.length > 0 ||
			commit.removed.length > 0
	)

	if (validCommits.length === 0) {
		console.log('没有有效的提交需要审查')
		return []
	}

	console.log(`找到 ${validCommits.length} 个有效提交需要处理`)

	// 存储处理后的提交对象
	const processedCommits = []

	// 处理每个提交
	for (const commit of validCommits) {
		try {
			// 增强commit对象，添加更多上下文信息
			const enhancedCommit = {
				...commit,
				branch: ref.replace('refs/heads/', ''),
				repository_name: repository.name,
				repository_url: repository.html_url,
				repository_owner: repository.owner.login || repository.owner.name,
				ref: ref,
			}

			console.log(`处理提交: ${commit.id}`)
			console.log(`提交信息: ${commit.message}`)
			console.log(`提交者: ${commit.author.name} <${commit.author.email}>`)
			console.log(
				`修改文件数: ${
					commit.added.length + commit.modified.length + commit.removed.length
				}`
			)

			// 处理提交并获取完整的提交对象
			const processedCommit = await processGitHubCommit(
				repository,
				enhancedCommit
			)
			if (processedCommit) {
				processedCommits.push(processedCommit)
			}
		} catch (error) {
			console.error(`处理GitHub提交错误 ${commit.id}:`, error)
		}
	}

	return processedCommits
}

// 处理GitHub单个提交
async function processGitHubCommit(repository, commit) {
	console.log(`处理GitHub提交: ${commit.id}`)
	console.log('commit', commit)

	let commitDetails = null
	let diff = []
	let parentCommitSha = null
	let fileContexts = {}

	try {
		// 获取完整的commit内容
		commitDetails = await githubService.getCommitDetails(
			repository.owner.login || repository.owner.name,
			repository.name,
			commit.id
		)
	} catch (error) {
		console.warn('获取commit详情失败，使用webhook数据:', error.message)
	}

	try {
		// 获取提交的diff
		diff = await githubService.getCommitDiff(
			repository.owner.login || repository.owner.name,
			repository.name,
			commit.id,
			commit // 传递webhook提供的文件信息
		)
	} catch (error) {
		console.warn('获取diff失败，使用基本文件信息:', error.message)
		// 创建基本的diff信息
		diff = createBasicDiffFromWebhook(commit)
	}

	try {
		// 获取父提交SHA，用于获取上下文
		parentCommitSha = await githubService.getParentCommitSha(
			repository.owner.login || repository.owner.name,
			repository.name,
			commit.id
		)
	} catch (error) {
		console.warn('获取父提交SHA失败:', error.message)
	}

	try {
		// 添加文件内容上下文
		fileContexts = await getFileContexts(
			repository.owner.login || repository.owner.name,
			repository.name,
			commit,
			diff,
			parentCommitSha
		)
	} catch (error) {
		console.warn('获取文件上下文失败:', error.message)
	}

	// 构造提交对象，包含更多上下文信息
	const commitObj = {
		id: commit.id,
		message: commit.message,
		author: commit.author,
		timestamp: commit.timestamp,
		url: commit.url,
		details: commitDetails, // 添加完整的commit详情
		diff: diff, // 添加diff信息
		parentCommitSha: parentCommitSha, // 添加父提交SHA
		repository: {
			name: repository.name,
			owner: repository.owner.login || repository.owner.name,
			url: repository.html_url,
		},
		branch:
			commit.branch ||
			(commit.ref ? commit.ref.replace('refs/heads/', '') : 'unknown'),
		files: {
			added: commit.added || [],
			modified: commit.modified || [],
			removed: commit.removed || [],
		},
		fileContexts: fileContexts,
		// 添加API状态信息
		apiStatus: {
			commitDetails: commitDetails !== null,
			diff: diff.length > 0,
			parentCommitSha: parentCommitSha !== null,
			fileContexts: Object.keys(fileContexts).length > 0,
		},
	}

	console.log('完整的提交对象:', JSON.stringify(commitObj, null, 2))

	// 保存 diff 数据到日志文件
	try {
		await logger.saveDiffData(
			commit.id,
			{
				name: repository.name,
				owner: repository.owner.login || repository.owner.name,
				url: repository.html_url,
			},
			diff,
			{
				branch: commitObj.branch,
				message: commit.message,
				author: commit.author,
				timestamp: commit.timestamp,
				files: commitObj.files,
				apiStatus: commitObj.apiStatus,
			}
		)
	} catch (error) {
		console.error('保存 diff 数据失败:', error)
	}

	// 保存完整的提交处理数据
	try {
		await logger.saveCommitProcessData(commitObj)
	} catch (error) {
		console.error('保存提交处理数据失败:', error)
	}

	// 返回完整的提交对象，可以用于后续处理
	// return commitObj

	// AI代码审查
	await aiService.reviewAll(diff, commitObj);
}

// GitLab webhook处理 - GET请求用于测试连接
router.get('/gitlab', (req, res) => {
	console.log('收到GitLab webhook测试连接')
	res.status(200).send('GitLab Webhook endpoint is working!')
})

// GitLab webhook处理 - POST请求用于实际事件
router.post('/gitlab', async (req, res) => {
	try {
		const { object_kind } = req.body

		console.log(`收到GitLab webhook: ${object_kind}`)

		// 处理系统钩子测试
		if (object_kind === 'test') {
			console.log('收到GitLab测试事件，webhook配置成功')
			return res.json({
				status: 'success',
				message: 'Webhook received successfully!',
			})
		}

		// 处理push事件
		if (object_kind === 'push') {
			await handleGitLabPush(req.body)
		}

		res.json({ status: 'success' })
	} catch (error) {
		console.error('处理GitLab webhook错误:', error)
		res.status(500).json({ error: 'Internal Server Error' })
	}
})
// 处理GitLab push事件
async function handleGitLabPush(payload) {
	const { project, commits } = payload

	console.log(`处理GitLab push事件，项目: ${project.name}`)

	// 过滤有效提交
	const validCommits = commits.filter(
		(commit) =>
			commit.added.length > 0 ||
			commit.modified.length > 0 ||
			commit.removed.length > 0
	)

	if (validCommits.length === 0) {
		console.log('没有有效的提交需要审查')
		return
	}

	// 处理每个提交
	for (const commit of validCommits) {
		try {
			await processGitLabCommit(project, commit)
		} catch (error) {
			console.error(`处理GitLab提交错误 ${commit.id}:`, error)
		}
	}
}

// 处理GitLab单个提交
async function processGitLabCommit(project, commit) {
	console.log(`处理GitLab提交: ${commit.id}`)

	// 获取提交的diff
	const diff = await gitlabService.getCommitDiff(project.id, commit.id)

	if (!diff || diff.length === 0) {
		console.log('提交没有代码变更')
		return
	}

	// 构造提交对象
	const commitObj = {
		id: commit.id,
		message: commit.message,
		author: commit.author,
		timestamp: commit.timestamp,
		url: commit.url,
	}

	// AI代码审查
	await aiService.reviewCode(diff, commitObj)
}

// 从webhook数据创建基本的diff信息
function createBasicDiffFromWebhook(commit) {
	const diff = []

	// 处理添加的文件
	if (commit.added && commit.added.length > 0) {
		commit.added.forEach((filename) => {
			diff.push({
				oldPath: null,
				newPath: filename,
				diff: null,
				newFile: true,
				deletedFile: false,
				renamedFile: false,
				status: 'added',
			})
		})
	}

	// 处理修改的文件
	if (commit.modified && commit.modified.length > 0) {
		commit.modified.forEach((filename) => {
			diff.push({
				oldPath: filename,
				newPath: filename,
				diff: null,
				newFile: false,
				deletedFile: false,
				renamedFile: false,
				status: 'modified',
			})
		})
	}

	// 处理删除的文件
	if (commit.removed && commit.removed.length > 0) {
		commit.removed.forEach((filename) => {
			diff.push({
				oldPath: filename,
				newPath: null,
				diff: null,
				newFile: false,
				deletedFile: true,
				renamedFile: false,
				status: 'removed',
			})
		})
	}

	return diff
}

// 获取文件上下文信息
async function getFileContexts(owner, repo, commit, diff, parentCommitSha) {
	const fileContexts = {}

	// 处理修改的文件
	if (commit.modified && commit.modified.length > 0) {
		for (const filename of commit.modified) {
			try {
				// 获取当前版本的文件内容
				const currentContent = await githubService.getFileContent(
					owner,
					repo,
					filename,
					commit.id
				)

				// 获取上一版本的文件内容（如果有父提交）
				const previousContent = parentCommitSha
					? await githubService.getFileContent(
							owner,
							repo,
							filename,
							parentCommitSha
					  )
					: null

				fileContexts[filename] = {
					currentContent,
					previousContent,
					// 找到对应的diff信息
					diffInfo: diff.find((d) => d.newPath === filename),
				}
			} catch (error) {
				console.error(`获取文件上下文错误 ${filename}:`, error)
			}
		}
	}

	// 处理新增的文件
	if (commit.added && commit.added.length > 0) {
		for (const filename of commit.added) {
			try {
				// 获取当前版本的文件内容
				const currentContent = await githubService.getFileContent(
					owner,
					repo,
					filename,
					commit.id
				)

				fileContexts[filename] = {
					currentContent,
					previousContent: null, // 新文件没有上一版本
					// 找到对应的diff信息
					diffInfo: diff.find((d) => d.newPath === filename),
				}
			} catch (error) {
				console.error(`获取文件上下文错误 ${filename}:`, error)
			}
		}
	}

	// 处理删除的文件
	if (commit.removed && commit.removed.length > 0) {
		for (const filename of commit.removed) {
			try {
				// 获取上一版本的文件内容（如果有父提交）
				const previousContent = parentCommitSha
					? await githubService.getFileContent(
							owner,
							repo,
							filename,
							parentCommitSha
					  )
					: null

				fileContexts[filename] = {
					currentContent: null, // 删除的文件没有当前版本
					previousContent,
					// 找到对应的diff信息
					diffInfo: diff.find((d) => d.oldPath === filename),
				}
			} catch (error) {
				console.error(`获取文件上下文错误 ${filename}:`, error)
			}
		}
	}

	return fileContexts
}

// 导出路由和处理函数（用于测试）
module.exports = {
	router,
	handleGitHubPush,
	processGitHubCommit,
	getFileContexts,
	createBasicDiffFromWebhook,
}
