// 模拟GitHub webhook请求
const axios = require('axios');

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

// 发送模拟请求
async function sendMockWebhook() {
  try {
    console.log('发送模拟GitHub webhook请求...');
    
    const response = await axios.post('http://localhost:3000/webhook/github', mockPushEvent, {
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': `mock-${Date.now()}`
      }
    });
    
    console.log('响应状态码:', response.status);
    console.log('响应数据:', response.data);
  } catch (error) {
    console.error('请求失败:', error.message);
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 执行模拟请求
sendMockWebhook().catch(console.error);

// 如何使用:
// 1. 确保服务器已启动: node src/index.js
// 2. 运行: node test/simulate-webhook.js