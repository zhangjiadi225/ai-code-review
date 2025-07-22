const express = require('express')
const crypto = require('crypto')
const githubService = require('../services/github')
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

		const eventType = req.headers['x-github-event']
		const deliveryId = req.headers['x-github-delivery']

		console.log(`收到GitHub webhook: ${eventType}, ID: ${deliveryId || '未知'}`)

		// 处理ping事件
		if (eventType === 'ping') {
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
			const processedCommit = await simpleProcessGitHubCommit(
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
// 简单处理GitHub提交
async function simpleProcessGitHubCommit(repository, commit) {
	console.log(`处理GitHub提交: ${commit.id}`)
	console.log('commit', commit)
	let diff = []

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

	// 构造提交对象，包含更多上下文信息
	const commitObj = {
		id: commit.id,
		message: commit.message,
		author: commit.author,
		diff: diff, // 添加diff信息
	}

	// AI代码审查
	await aiService.reviewAll(diff, commitObj)
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

// 导出路由和处理函数（用于测试）
module.exports = {
	router,
	handleGitHubPush,
	simpleProcessGitHubCommit
}
