// GitHub webhook push事件测试
const axios = require('axios');
const githubService = require('../src/services/github');

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

// 测试获取commit详情
async function testGetCommitDetails() {
  console.log('测试获取commit详情...');
  
  try {
    // 模拟GitHub API响应
    const originalAxiosGet = axios.get;
    axios.get = jest.fn().mockImplementation((url) => {
      if (url.includes('/commits/')) {
        return Promise.resolve({
          data: {
            sha: '6c94106f410779a6dd562687fe543b6159a306c4',
            commit: {
              author: {
                name: 'jdzhang',
                email: 'jdzhang@in-road.com',
                date: '2025-07-21T17:31:02+08:00'
              },
              committer: {
                name: 'jdzhang',
                email: 'jdzhang@in-road.com',
                date: '2025-07-21T17:31:02+08:00'
              },
              message: '注释部分',
              tree: {
                sha: 'bcbdd8971300696c02ebee27446cb2826e8a693b'
              },
              parents: [
                {
                  sha: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
                  url: 'https://api.github.com/repos/zhangjiadi225/ai-code-review/commits/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0'
                }
              ]
            },
            files: [
              {
                filename: 'src/routes/webhook.js',
                status: 'modified',
                additions: 10,
                deletions: 5,
                changes: 15,
                patch: '@@ -1,5 +1,10 @@\n const express = require(\'express\');\n+// 添加注释\n const router = express.Router();'
              }
            ]
          }
        });
      }
      return Promise.reject(new Error('未模拟的URL'));
    });

    // 测试获取commit详情
    const commitDetails = await githubService.getCommitDetails(
      'zhangjiadi225',
      'ai-code-review',
      '6c94106f410779a6dd562687fe543b6159a306c4'
    );
    
    console.log('获取到的commit详情:', JSON.stringify(commitDetails, null, 2));
    
    // 恢复原始axios.get
    axios.get = originalAxiosGet;
    
    return commitDetails;
  } catch (error) {
    console.error('测试失败:', error);
    return null;
  }
}

// 测试处理webhook
async function testProcessWebhook() {
  console.log('测试处理webhook...');
  
  try {
    // 直接调用webhook处理函数
    const webhookModule = require('../src/routes/webhook');
    
    if (typeof webhookModule.handleGitHubPush === 'function') {
      await webhookModule.handleGitHubPush(mockPushEvent);
      console.log('webhook处理完成');
    } else {
      console.error('handleGitHubPush不是一个函数，请检查导出方式');
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
async function runTests() {
  await testGetCommitDetails();
  await testProcessWebhook(); // 现在已经导出handleGitHubPush函数
}

// 执行测试
runTests().catch(console.error);

// 如何使用:
// 1. 确保设置了环境变量 GITHUB_TOKEN
// 2. 运行: node test/1.js