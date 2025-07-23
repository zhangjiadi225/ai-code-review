const fs = require('fs');
const path = require('path');

/**
 * AI服务基类，定义通用方法和接口
 */
class BaseAIService {
  constructor() {
    // 子类必须实现review方法
    if (this.constructor === BaseAIService) {
      throw new Error('BaseAIService不能直接实例化，请使用子类');
    }
  }

  /**
   * 代码审查方法（子类必须实现）
   * @param {Array} diffs - 代码差异数组
   * @param {Object} commit - 提交信息对象
   */
  async review(diffs, commit) {
    throw new Error('子类必须实现review方法');
  }

  /**
   * 保存审查结果到文件
   * @param {Object} review - 审查结果对象
   */
  async saveToFile(review) {
    try {
      const outputDir = path.join(process.cwd(), 'reviews');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `review_${review.service}_${review.commitId.substring(0, 8)}_${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.txt`;
      const filepath = path.join(outputDir, filename);

      let content = `代码审查报告 (${review.service})\n`;
      content += `==========================================\n\n`;
      content += `提交ID: ${review.commitId}\n`;
      content += `提交信息: ${review.commitMessage}\n`;
      content += `作者: ${review.author?.name || 'Unknown'}\n`;
      content += `审查时间: ${review.timestamp}\n\n`;

      content += `详细建议:\n`;
      content += `------------------------------------------\n\n`;

      content += review.suggestions;

      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`审查报告已保存到: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('保存文件错误:', error);
      throw error;
    }
  }

  /**
   * 保存请求消息到文件
   * @param {Array|String} message - 请求消息
   * @param {String} service - 服务名称
   */
  async saveMessageToFile(message, service) {
    try {
      const outputDir = path.join(process.cwd(), 'messages');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filename = `messages_${service}_${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.txt`;
      const filepath = path.join(outputDir, filename);
      
      let content = `发送到${service}的内容\n`;
      content += `------------------------------------------\n\n`;
      
      if (typeof message === 'string') {
        content += message;
      } else if (Array.isArray(message) && message.length > 0) {
        content += JSON.stringify(message, null, 2);
      } else {
        content += JSON.stringify(message);
      }
      
      fs.writeFileSync(filepath, content, 'utf8');
      return filepath;
    } catch (error) {
      console.error('保存消息文件错误:', error);
      throw error;
    }
  }
}

module.exports = BaseAIService;