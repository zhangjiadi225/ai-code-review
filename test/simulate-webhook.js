const fs = require('fs');
const path = require('path');
const aiService = require('../src/services/ai');
const { simpleProcessGitHubCommit } = require('../src/routes/webhook');
require('dotenv').config();

// 命令行参数处理
const args = process.argv.slice(2);
const serviceType = args[0] || 'siliconflow'; // 默认使用硅基流动AI

// 切换到指定的AI服务
try {
  aiService.switchService(serviceType);
  console.log(`使用 ${serviceType} 服务进行测试`);
} catch (error) {
  console.error(`切换到 ${serviceType} 服务失败:`, error.message);
  process.exit(1);
}

// 模拟仓库信息
const mockRepository = {
  name: 'test-repo',
  owner: {
    login: 'test-user'
  },
  html_url: 'https://github.com/test-user/test-repo'
};

// 从测试文件读取diff
function loadTestDiff() {
  try {
    const diffPath = path.join(__dirname, 'test-ai-response.js');
    const content = fs.readFileSync(diffPath, 'utf8');
    
    return [
      {
        oldPath: 'test/test-ai-response.js',
        newPath: 'test/test-ai-response.js',
        diff: content,
        newFile: false,
        deletedFile: false,
        renamedFile: false,
        status: 'modified'
      }
    ];
  } catch (error) {
    console.error('读取测试文件失败:', error);
    process.exit(1);
  }
}

// 模拟提交
const mockCommit = {
  id: 'test' + Date.now().toString().substring(5),
  message: `测试提交 - ${serviceType} 服务`,
  author: {
    name: '测试用户',
    email: 'test@example.com'
  },
  branch: 'main',
  repository_name: mockRepository.name,
  repository_url: mockRepository.html_url,
  repository_owner: mockRepository.owner.login,
  ref: 'refs/heads/main',
  added: [],
  modified: ['test/test-ai-response.js'],
  removed: []
};

// 模拟webhook处理
async function simulateWebhook() {
  try {
    console.log(`模拟GitHub webhook处理 (服务类型: ${serviceType})`);
    console.log(`提交ID: ${mockCommit.id}`);
    console.log(`提交信息: ${mockCommit.message}`);
    
    // 处理提交
    await simpleProcessGitHubCommit(mockRepository, mockCommit);
    
    console.log('模拟完成，请查看reviews目录中的审查结果');
  } catch (error) {
    console.error('模拟webhook处理失败:', error);
  }
}

// 执行模拟
simulateWebhook();