const SiliconFlowService = require('./siliconflow');
const CozeService = require('./coze');
require('dotenv').config();

/**
 * AI服务工厂，根据环境变量选择使用哪个AI服务
 */
class AIServiceFactory {
  constructor() {
    // 根据环境变量初始化服务
    this.initServices();
  }

  /**
   * 初始化AI服务
   */
  initServices() {
    this.services = {
      siliconflow: new SiliconFlowService(),
      coze: new CozeService()
    };
    
    // 默认使用硅基流动AI
    this.defaultService = 'siliconflow';
    
    // 从环境变量获取当前服务类型
    this.currentService = process.env.AI_SERVICE_TYPE || this.defaultService;
    
    console.log(`当前使用的AI服务: ${this.currentService}`);
  }

  /**
   * 获取当前AI服务实例
   * @returns {Object} AI服务实例
   */
  getCurrentService() {
    // 重新读取环境变量，以便动态切换服务
    this.currentService = process.env.AI_SERVICE_TYPE || this.defaultService;
    
    const service = this.services[this.currentService];
    if (!service) {
      console.warn(`未找到服务类型 "${this.currentService}"，使用默认服务 "${this.defaultService}"`);
      return this.services[this.defaultService];
    }
    
    return service;
  }

  /**
   * 使用当前AI服务进行代码审查
   * @param {Array} diffs - 代码差异数组
   * @param {Object} commit - 提交信息对象
   */
  async reviewAll(diffs, commit) {
    const service = this.getCurrentService();
    return service.review(diffs, commit);
  }

  /**
   * 切换AI服务类型
   * @param {String} serviceType - 服务类型名称
   */
  switchService(serviceType) {
    if (!this.services[serviceType]) {
      throw new Error(`未知的服务类型: ${serviceType}`);
    }
    
    process.env.AI_SERVICE_TYPE = serviceType;
    this.currentService = serviceType;
    console.log(`已切换到AI服务: ${serviceType}`);
  }
}

// 导出单例
module.exports = new AIServiceFactory();