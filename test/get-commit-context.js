// 测试获取GitHub commit内容与上下文
const axios = require('axios');
const { handleGitHubPush, processGitHubCommit } = require('../src/routes/webhook');
const fs = require('fs');
const path = require('path');

// 模拟GitHub webhook的push事件数据
const mockPushEvent = {
  ref: 'refs/heads/main',
  repository: {
    id: 123456789,
    name: 'ai-code-review',
    full_name: 'zhangjiadi225/ai-code-review',
    owner: {
      name: 'zhangjiadi225',
      login: 'zhangjiadi225',
      email: 'jdzhang@in-road.com'
    },
    html_url: 'https://github.com/zhangjiadi225/ai-code-review'
  },
  commits: [
    {
      id: '6c94106f410779a6dd562687fe543b6159a306c4',
      tree_id: 'bcbdd8971300696c02ebee27446cb2826e8a693b',
      distinct: true,
      message: '注释部分',
      timestamp: '2025-07-21T17:31:02+08:00',
      url: 'https://github.com/zhangjiadi225/ai-code-review/commit/6c94106f410779a6dd562687fe543b6159a306c4',
      author: {
        name: 'jdzhang',
        email: 'jdzhang@in-road.com',
        username: 'zhangjiadi-gz'
      },
      committer: {
        name: 'jdzhang',
        email: 'jdzhang@in-road.com',
        username: 'zhangjiadi-gz'
      },
      added: [],
      removed: [],
      modified: ['src/routes/webhook.js']
    }
  ]
};

// 直接测试处理函数
async function testProcessCommit() {
  try {
    console.log('测试处理GitHub commit内容与上下文...');
    
    // 处理push事件
    const processedCommits = await handleGitHubPush(mockPushEvent);
    
    console.log(`处理完成，获取到 ${processedCommits.length} 个提交的详细信息`);
    
    // 将结果保存到文件，方便查看
    if (processedCommits.length > 0) {
      const outputPath = path.join(__dirname, 'commit-context-result.json');
      fs.writeFileSync(
        outputPath, 
        JSON.stringify(processedCommits, null, 2)
      );
      console.log(`结果已保存到: ${outputPath}`);
    }
    
    return processedCommits;
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

// 通过API测试
async function testViaAPI() {
  try {
    console.log('通过API测试获取GitHub commit内容与上下文...');
    
    const response = await axios.post('http://localhost:3000/webhook/github', mockPushEvent, {
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': `mock-${Date.now()}`
      }
    });
    
    console.log('响应状态码:', response.status);
    
    // 将结果保存到文件，方便查看
    if (response.data && response.data.commits) {
      const outputPath = path.join(__dirname, 'api-commit-context-result.json');
      fs.writeFileSync(
        outputPath, 
        JSON.stringify(response.data.commits, null, 2)
      );
      console.log(`API结果已保存到: ${outputPath}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('API测试失败:', error.message);
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

// 执行测试
async function runTests() {
  // 选择测试方式：直接测试处理函数或通过API测试
  const testMode = process.argv[2] || 'direct';
  
  try {
    if (testMode === 'api') {
      console.log('使用API模式测试...');
      await testViaAPI();
    } else {
      console.log('使用直接模式测试...');
      await testProcessCommit();
    }
    console.log('测试完成');
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行测试
runTests();

// 如何使用:
// 1. 直接测试处理函数: node test/get-commit-context.js
// 2. 通过API测试(需要先启动服务器): node test/get-commit-context.js api