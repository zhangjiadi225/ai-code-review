const express = require('express');
const crypto = require('crypto');
const githubService = require('../services/github');
const gitlabService = require('../services/gitlab');
const aiService = require('../services/ai');

const router = express.Router();

// GitHub webhook处理 - GET请求用于测试连接
router.get('/github', (req, res) => {
  console.log('收到GitHub webhook测试连接');
  res.status(200).send('GitHub Webhook endpoint is working!');
});

// GitHub webhook处理 - POST请求用于实际事件
router.post('/github', async (req, res) => {
  try {
    // 详细记录请求信息，帮助调试
    console.log('收到GitHub webhook POST请求');
    console.log('请求头:', JSON.stringify(req.headers, null, 2));
    console.log('请求体预览:', JSON.stringify(req.body).substring(0, 500) + '...');
    
    const eventType = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];
    
    console.log(`收到GitHub webhook: ${eventType}, ID: ${deliveryId || '未知'}`);

    // 处理ping事件
    if (eventType === 'ping') {
      console.log('收到GitHub ping事件，webhook配置成功');
      return res.status(200).json({ 
        status: 'success',
        message: 'Webhook received successfully!'
      });
    }
    
    // 处理push事件
    if (eventType === 'push') {
      await handleGitHubPush(req.body);
    }

    // 确保返回200状态码
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('处理GitHub webhook错误:', error);
    // 即使出错也返回200状态码，避免GitHub重试
    return res.status(200).json({ 
      status: 'error',
      message: '处理webhook时出错，但已收到请求'
    });
  }
});

// GitLab webhook处理 - GET请求用于测试连接
router.get('/gitlab', (req, res) => {
  console.log('收到GitLab webhook测试连接');
  res.status(200).send('GitLab Webhook endpoint is working!');
});

// GitLab webhook处理 - POST请求用于实际事件
router.post('/gitlab', async (req, res) => {
  try {
    const { object_kind } = req.body;
    
    console.log(`收到GitLab webhook: ${object_kind}`);

    // 处理系统钩子测试
    if (object_kind === 'test') {
      console.log('收到GitLab测试事件，webhook配置成功');
      return res.json({ 
        status: 'success',
        message: 'Webhook received successfully!'
      });
    }
    
    // 处理push事件
    if (object_kind === 'push') {
      await handleGitLabPush(req.body);
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('处理GitLab webhook错误:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 处理GitHub push事件
async function handleGitHubPush(payload) {
  const { repository, commits } = payload;
  
  console.log(`处理GitHub push事件，仓库: ${repository.name}`);

  // 过滤有效提交
  const validCommits = commits.filter(commit => 
    commit.added.length > 0 || 
    commit.modified.length > 0 || 
    commit.removed.length > 0
  );

  if (validCommits.length === 0) {
    console.log('没有有效的提交需要审查');
    return;
  }

  // 处理每个提交
  for (const commit of validCommits) {
    try {
      await processGitHubCommit(repository, commit);
    } catch (error) {
      console.error(`处理GitHub提交错误 ${commit.id}:`, error);
    }
  }
}

// 处理GitLab push事件
async function handleGitLabPush(payload) {
  const { project, commits } = payload;
  
  console.log(`处理GitLab push事件，项目: ${project.name}`);

  // 过滤有效提交
  const validCommits = commits.filter(commit => 
    commit.added.length > 0 || 
    commit.modified.length > 0 || 
    commit.removed.length > 0
  );

  if (validCommits.length === 0) {
    console.log('没有有效的提交需要审查');
    return;
  }

  // 处理每个提交
  for (const commit of validCommits) {
    try {
      await processGitLabCommit(project, commit);
    } catch (error) {
      console.error(`处理GitLab提交错误 ${commit.id}:`, error);
    }
  }
}

// 处理GitHub单个提交
async function processGitHubCommit(repository, commit) {
  console.log(`处理GitHub提交: ${commit.id}`);
  console.log('commit', commit)

  // // 获取提交的diff
  // const diff = await githubService.getCommitDiff(
  //   repository.owner.login || repository.owner.name,
  //   repository.name,
  //   commit.id
  // );
  
  // if (!diff || diff.length === 0) {
  //   console.log('提交没有代码变更');
  //   return;
  // }

  // // 构造提交对象
  // const commitObj = {
  //   id: commit.id,
  //   message: commit.message,
  //   author: commit.author,
  //   timestamp: commit.timestamp,
  //   url: commit.url
  // };

  // // AI代码审查
  // await aiService.reviewCode(diff, commitObj);
}

// 处理GitLab单个提交
async function processGitLabCommit(project, commit) {
  console.log(`处理GitLab提交: ${commit.id}`);

  // 获取提交的diff
  const diff = await gitlabService.getCommitDiff(project.id, commit.id);
  
  if (!diff || diff.length === 0) {
    console.log('提交没有代码变更');
    return;
  }

  // 构造提交对象
  const commitObj = {
    id: commit.id,
    message: commit.message,
    author: commit.author,
    timestamp: commit.timestamp,
    url: commit.url
  };

  // AI代码审查
  await aiService.reviewCode(diff, commitObj);
}

module.exports = router;