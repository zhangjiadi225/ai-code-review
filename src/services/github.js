const axios = require('axios');

class GitHubService {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.token = process.env.GITHUB_TOKEN;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
  }

  // 获取提交的diff信息
  async getCommitDiff(owner, repo, commitSha) {
    try {
      console.log(`获取提交diff: ${commitSha} in ${owner}/${repo}`);
      
      const response = await this.client.get(`/repos/${owner}/${repo}/commits/${commitSha}`);
      
      if (!response.data.files) {
        console.log(`提交 ${commitSha} 没有文件变更`);
        return [];
      }

      // 过滤代码文件
      const filteredFiles = response.data.files.filter(file => {
        return this.isCodeFile(file.filename) && file.patch;
      });

      return filteredFiles.map(file => ({
        oldPath: file.previous_filename || file.filename,
        newPath: file.filename,
        diff: file.patch,
        newFile: file.status === 'added',
        deletedFile: file.status === 'removed',
        renamedFile: file.status === 'renamed'
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

module.exports = new GitHubService();