const express = require('express');
const crypto = require('crypto');
const githubService = require('../services/github');
const gitlabService = require('../services/gitlab');
const aiService = require('../services/ai');

const router = express.Router();

// GitHub webhook处理
router.post('/github', async (req, res) => {
  try {
    const eventType = req.headers['x-github-event'];
    
    console.log(`收到GitHub webhook: ${eventType}`);

    // 只处理push事件
    if (eventType === 'push') {
      await handleGitHubPush(req.body);
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('处理GitHub webhook错误:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GitLab webhook处理
router.post('/gitlab', async (req, res) => {
  try {
    const { object_kind } = req.body;
    
    console.log(`收到GitLab webhook: ${object_kind}`);

    // 只处理push事件
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

  // 获取提交的diff
  const diff = await githubService.getCommitDiff(
    repository.owner.login || repository.owner.name,
    repository.name,
    commit.id
  );
  
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