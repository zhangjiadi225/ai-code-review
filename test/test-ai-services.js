const aiService = require('../src/services/ai');
require('dotenv').config();

// 测试数据 - 模拟代码差异
const mockDiffs = [
  {
    oldPath: 'src/example.js',
    newPath: 'src/example.js',
    diff: `@@ -1,10 +1,15 @@
function calculateSum(a, b) {
-  return a + b;
+  // 添加类型检查
+  if (typeof a !== 'number' || typeof b !== 'number') {
+    throw new Error('Parameters must be numbers');
+  }
+  
+  return a + b;
}

-// 测试函数
-console.log(calculateSum(5, 10));
+// 添加错误处理的测试
+try {
+  console.log(calculateSum(5, '10'));
+} catch (error) {
+  console.error('Error:', error.message);
+}`,
    newFile: false,
    deletedFile: false,
    renamedFile: false,
    status: 'modified'
  }
];

// 模拟提交信息
const mockCommit = {
  id: 'abc123456789',
  message: '添加输入验证',
  author: {
    name: '测试用户',
    email: 'test@example.com'
  }
};

// 测试函数
async function testAIService(serviceType) {
  try {
    console.log(`开始测试 ${serviceType} 服务...`);
    
    // 切换到指定的AI服务
    aiService.switchService(serviceType);
    
    // 调用AI服务
    await aiService.reviewAll(mockDiffs, mockCommit);
    
    console.log(`${serviceType} 服务测试完成`);
  } catch (error) {
    console.error(`测试 ${serviceType} 服务时出错:`, error);
    console.error('详细错误:', error.response?.data || error.message);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const serviceType = args[0] || 'siliconflow'; // 默认使用硅基流动AI

// 执行测试
testAIService(serviceType);