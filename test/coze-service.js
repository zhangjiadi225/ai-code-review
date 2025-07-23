const coze = require('../src/services/ai/coze')

const diff = [
	{
		oldPath: 'src/routes/webhook.js',
		newPath: 'src/routes/webhook.js',
		diff: '@@ -207,5 +207,5 @@ function createBasicDiffFromWebhook(commit) {\n module.exports = {\n \trouter,\n \thandleGitHubPush,\n-\tsimpleProcessGitHubCommit\n+\tsimpleProcessGitHubCommit,\n }',
		newFile: false,
		deletedFile: false,
		renamedFile: false,
	},
	{
		oldPath: 'test/test-ai-services.js',
		newPath: 'test/test-ai-services.js',
		diff: "@@ -0,0 +1,68 @@\n+const aiService = require('../src/services/ai');\n+require('dotenv').config();\n+\n+// 测试数据 - 模拟代码差异\n+const mockDiffs = [\n+  {\n+    oldPath: 'src/example.js',\n+    newPath: 'src/example.js',\n+    diff: `@@ -1,10 +1,15 @@\n+function calculateSum(a, b) {\n+-  return a + b;\n++  // 添加类型检查\n++  if (typeof a !== 'number' || typeof b !== 'number') {\n++    throw new Error('Parameters must be numbers');\n++  }\n++  \n++  return a + b;\n+}\n+\n+-// 测试函数\n+-console.log(calculateSum(5, 10));\n++// 添加错误处理的测试\n++try {\n++  console.log(calculateSum(5, '10'));\n++} catch (error) {\n++  console.error('Error:', error.message);\n++}`,\n+    newFile: false,\n+    deletedFile: false,\n+    renamedFile: false,\n+    status: 'modified'\n+  }\n+];\n+\n+// 模拟提交信息\n+const mockCommit = {\n+  id: 'abc123456789',\n+  message: '添加输入验证',\n+  author: {\n+    name: '测试用户',\n+    email: 'test@example.com'\n+  }\n+};\n+\n+// 测试函数\n+async function testAIService(serviceType) {\n+  try {\n+    console.log(`开始测试 ${serviceType} 服务...`);\n+    \n+    // 切换到指定的AI服务\n+    aiService.switchService(serviceType);\n+    \n+    // 调用AI服务\n+    await aiService.reviewAll(mockDiffs, mockCommit);\n+    \n+    console.log(`${serviceType} 服务测试完成`);\n+  } catch (error) {\n+    console.error(`测试 ${serviceType} 服务时出错:`, error);\n+    console.error('详细错误:', error.response?.data || error.message);\n+  }\n+}\n+\n+// 命令行参数处理\n+const args = process.argv.slice(2);\n+const serviceType = args[0] || 'siliconflow'; // 默认使用硅基流动AI\n+\n+// 执行测试\n+testAIService(serviceType);\n\\ No newline at end of file",
		newFile: true,
		deletedFile: false,
		renamedFile: false,
	},
]

const Coze = new coze()
const commit = {
	id: '1',
	author: '2',
	message: '3',
}
Coze.review(diff, commit)
