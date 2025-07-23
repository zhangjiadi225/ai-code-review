const axios = require('axios');
const BaseAIService = require('./base');
require('dotenv').config();

/**
 * 硅基流动AI服务实现
 */
class SiliconFlowService extends BaseAIService {
  constructor() {
    super();
    this.baseURL = 'https://api.siliconflow.cn/v1/chat/completions';
    this.apiKey = process.env.SILICONFLOW_API_KEY;
    this.model = process.env.SILICONFLOW_MODEL || 'deepseek-chat';
    this.serviceName = 'siliconflow';
  }

  /**
   * 使用硅基流动AI进行代码审查
   * @param {Array} diffs - 代码差异数组
   * @param {Object} commit - 提交信息对象
   */
  async review(diffs, commit) {
    console.log('使用硅基流动AI进行代码审查');
    
    const message = [
      {
        role: 'user',
        content: `你是一个专业的代码审查员。先查看文件后缀确认diff的语言是什么。请仔细分析提供的代码diff，找出潜在的问题和改进建议。
        
        请关注以下方面：
        1. 代码质量和最佳实践
        2. 潜在的bug和错误
        3. 性能问题
        4. 安全漏洞
        5. 代码风格和规范
        6. 可读性和维护性
        
        请用中文回复，并提供具体的改进建议。如果代码没有问题，请回复"无建议"。以下是我的diff信息
        
        ${JSON.stringify(diffs)}`,
      },
    ];
    
    // 保存请求消息
    await this.saveMessageToFile(message, this.serviceName);
    
    try {
      const result = await axios.post(
        this.baseURL,
        {
          model: this.model,
          messages: message,
        },
        {
          headers: {
            Authorization: 'Bearer ' + this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('硅基流动AI响应成功');
      console.log('Token使用情况:', result.data.usage);
      
      const suggestions = result.data.choices[0].message.content;
      const review = {
        commitId: commit.id,
        commitMessage: commit.message,
        author: commit.author,
        timestamp: new Date().toISOString(),
        suggestions: suggestions,
        service: this.serviceName
      };
      
      await this.saveToFile(review);
      return review;
    } catch (error) {
      console.error('硅基流动AI请求失败:', error.message);
      if (error.response) {
        console.error('错误详情:', error.response.data);
      }
      throw error;
    }
  }
}

module.exports = SiliconFlowService;