const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    this.baseURL = 'https://api.siliconflow.cn/v1/chat/completions';
    this.apiKey = process.env.SILICONFLOW_API_KEY;
    this.model = process.env.SILICONFLOW_MODEL || 'deepseek-chat';
  }

  // 代码审查
  async reviewCode(diffs, commit) {
    try {
      console.log(`开始AI代码审查，提交: ${commit.id}`);

      const suggestions = [];
      
      // 对每个文件进行审查
      for (const diff of diffs) {
        const fileSuggestions = await this.reviewSingleFile(diff, commit);
        if (fileSuggestions.length > 0) {
          suggestions.push(...fileSuggestions);
        }
      }

      const review = {
        commitId: commit.id,
        commitMessage: commit.message,
        author: commit.author,
        timestamp: new Date().toISOString(),
        suggestions: suggestions,
        summary: this.generateSummary(suggestions)
      };

      // 保存到txt文件
      await this.saveToFile(review);

      console.log(`AI审查完成，共发现 ${suggestions.length} 个建议`);
      return review;
    } catch (error) {
      console.error('AI代码审查错误:', error);
      throw error;
    }
  }

  // 审查单个文件
  async reviewSingleFile(diff, commit) {
    try {
      const filePath = diff.newPath || diff.oldPath;
      console.log(`正在审查文件: ${filePath}`);

      const prompt = this.buildReviewPrompt(diff, commit);
      
      const response = await axios.post(this.baseURL, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `你是一个专业的代码审查员。请仔细分析提供的代码diff，找出潜在的问题和改进建议。
            
            请关注以下方面：
            1. 代码质量和最佳实践
            2. 潜在的bug和错误
            3. 性能问题
            4. 安全漏洞
            5. 代码风格和规范
            6. 可读性和维护性
            
            请用中文回复，并提供具体的改进建议。如果代码没有问题，请回复"无建议"。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const reviewContent = response.data.choices[0].message.content;
      
      if (reviewContent.includes('无建议') || reviewContent.includes('没有问题')) {
        return [];
      }

      return [{
        file: filePath,
        message: reviewContent,
        timestamp: new Date().toISOString()
      }];
    } catch (error) {
      console.error(`审查文件错误 ${diff.newPath || diff.oldPath}:`, error);
      return [];
    }
  }

  // 构建审查提示
  buildReviewPrompt(diff, commit) {
    const filePath = diff.newPath || diff.oldPath;
    const fileExtension = filePath.split('.').pop();
    
    let prompt = `请审查以下${fileExtension}文件的代码变更：\n\n`;
    prompt += `文件路径: ${filePath}\n`;
    prompt += `提交信息: ${commit.message}\n`;
    prompt += `作者: ${commit.author?.name || 'Unknown'}\n\n`;
    
    if (diff.newFile) {
      prompt += '这是一个新文件：\n';
    } else if (diff.deletedFile) {
      prompt += '这是一个被删除的文件：\n';
    } else {
      prompt += '代码变更如下：\n';
    }
    
    prompt += '```diff\n';
    prompt += diff.diff;
    prompt += '\n```\n\n';
    
    prompt += '请提供详细的审查意见和改进建议。';
    
    return prompt;
  }

  // 生成审查总结
  generateSummary(suggestions) {
    if (suggestions.length === 0) {
      return '代码审查完成，未发现问题。';
    }

    return `代码审查完成，共发现 ${suggestions.length} 个建议需要关注。`;
  }

  // 保存到txt文件
  async saveToFile(review) {
    try {
      const outputDir = path.join(process.cwd(), 'reviews');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `review_${review.commitId.substring(0, 8)}_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      const filepath = path.join(outputDir, filename);

      let content = `代码审查报告\n`;
      content += `==========================================\n\n`;
      content += `提交ID: ${review.commitId}\n`;
      content += `提交信息: ${review.commitMessage}\n`;
      content += `作者: ${review.author?.name || 'Unknown'}\n`;
      content += `审查时间: ${review.timestamp}\n\n`;
      content += `总结: ${review.summary}\n\n`;

      if (review.suggestions.length > 0) {
        content += `详细建议:\n`;
        content += `------------------------------------------\n\n`;
        
        review.suggestions.forEach((suggestion, index) => {
          content += `${index + 1}. 文件: ${suggestion.file}\n`;
          content += `   时间: ${suggestion.timestamp}\n`;
          content += `   建议: ${suggestion.message}\n\n`;
        });
      }

      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`审查报告已保存到: ${filepath}`);
    } catch (error) {
      console.error('保存文件错误:', error);
      throw error;
    }
  }
}

module.exports = new AIService();