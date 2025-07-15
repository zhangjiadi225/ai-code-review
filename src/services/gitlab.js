const axios = require('axios');

class GitLabService {
  constructor() {
    this.baseURL = process.env.GITLAB_URL || 'https://gitlab.com';
    this.token = process.env.GITLAB_TOKEN;
    this.client = axios.create({
      baseURL: `${this.baseURL}/api/v4`,
      headers: {
        'Private-Token': this.token
      }
    });
  }

  // 获取提交的diff信息
  async getCommitDiff(projectId, commitSha) {
    try {
      console.log(`获取提交diff: ${commitSha} in project ${projectId}`);
      
      const response = await this.client.get(`/projects/${projectId}/repository/commits/${commitSha}/diff`);
      
      if (!response.data || !Array.isArray(response.data)) {
        console.log(`提交 ${commitSha} 没有diff数据`);
        return [];
      }

      // 过滤代码文件
      const filteredDiffs = response.data.filter(diff => {
        const isCodeFile = this.isCodeFile(diff.new_path || diff.old_path);
        const hasChanges = diff.diff && diff.diff.length > 0;
        return isCodeFile && hasChanges;
      });

      return filteredDiffs.map(diff => ({
        oldPath: diff.old_path,
        newPath: diff.new_path,
        diff: diff.diff,
        newFile: diff.new_file,
        deletedFile: diff.deleted_file,
        renamedFile: diff.renamed_file
      }));
    } catch (error) {
      console.error(`获取提交diff错误 ${commitSha}:`, error);
      throw error;
    }
  }

  // 判断是否为代码文件
  isCodeFile(filePath) {
    if (!filePath) return false;
    
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java', '.cpp', '.c', '.cs', '.php',
      '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sql', '.html', '.css', '.scss',
      '.less', '.json', '.xml', '.yaml', '.yml', '.md', '.sh', '.bash', '.ps1'
    ];
    
    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    return codeExtensions.includes(extension);
  }
}

module.exports = new GitLabService();