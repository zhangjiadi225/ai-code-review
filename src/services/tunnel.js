const ngrok = require('ngrok');
const localtunnel = require('localtunnel');

class TunnelService {
  constructor() {
    this.tunnelUrl = null;
    this.isConnected = false;
    this.tunnelType = process.env.TUNNEL_TYPE || 'ngrok';
    this.tunnelInstance = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 10000; // 10秒
  }

  /**
   * 启动内网穿透隧道
   * @param {number} port - 本地服务端口
   * @returns {Promise<string>} - 返回公网URL
   */
  async startTunnel(port = 3000) {
    try {
      console.log(`正在启动内网穿透隧道 (${this.tunnelType})...`);
      
      // 根据配置选择隧道类型
      if (this.tunnelType === 'ngrok') {
        await this.startNgrok(port);
      } else if (this.tunnelType === 'localtunnel') {
        await this.startLocaltunnel(port);
      } else {
        throw new Error(`不支持的隧道类型: ${this.tunnelType}`);
      }
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log(`✅ 内网穿透已启动！`);
      console.log(`🌐 公网地址: ${this.tunnelUrl}`);
      console.log(`📝 GitHub Webhook URL: ${this.tunnelUrl}/webhook/github`);
      console.log(`📝 GitLab Webhook URL: ${this.tunnelUrl}/webhook/gitlab`);
      
      return this.tunnelUrl;
    } catch (error) {
      console.error('启动内网穿透失败:', error);
      
      // 尝试重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        // 尝试切换隧道类型
        if (this.reconnectAttempts > 2) {
          const alternativeTunnel = this.tunnelType === 'ngrok' ? 'localtunnel' : 'ngrok';
          console.log(`尝试使用备选隧道类型: ${alternativeTunnel}`);
          this.tunnelType = alternativeTunnel;
        }
        
        setTimeout(() => this.startTunnel(port), this.reconnectInterval);
        return null;
      }
      
      throw error;
    }
  }

  /**
   * 启动Ngrok隧道
   * @param {number} port - 本地服务端口
   * @private
   */
  async startNgrok(port) {
    const options = {
      addr: port,
      region: process.env.TUNNEL_REGION || 'ap', // 默认亚太地区
    };

    // 如果有ngrok token，使用认证
    if (process.env.NGROK_TOKEN) {
      options.authtoken = process.env.NGROK_TOKEN;
    }

    this.tunnelUrl = await ngrok.connect(options);
    this.tunnelInstance = 'ngrok';
  }

  /**
   * 启动Localtunnel隧道
   * @param {number} port - 本地服务端口
   * @private
   */
  async startLocaltunnel(port) {
    const options = {
      port,
    };

    // 如果指定了子域名
    if (process.env.TUNNEL_SUBDOMAIN) {
      options.subdomain = process.env.TUNNEL_SUBDOMAIN;
    }

    const tunnel = await localtunnel(options);
    this.tunnelUrl = tunnel.url;
    this.tunnelInstance = tunnel;

    // 监听隧道关闭事件
    tunnel.on('close', () => {
      console.log('Localtunnel隧道已关闭');
      this.isConnected = false;
      this.tunnelUrl = null;
      
      // 如果不是主动关闭，尝试重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Localtunnel连接断开，尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.startTunnel(port), this.reconnectInterval);
      }
    });

    // 监听错误事件
    tunnel.on('error', (err) => {
      console.error('Localtunnel错误:', err);
    });
  }

  /**
   * 停止隧道
   */
  async stopTunnel() {
    try {
      if (!this.isConnected) return;

      if (this.tunnelType === 'ngrok') {
        await ngrok.disconnect();
        await ngrok.kill();
      } else if (this.tunnelType === 'localtunnel' && this.tunnelInstance) {
        this.tunnelInstance.close();
      }

      this.isConnected = false;
      this.tunnelUrl = null;
      this.tunnelInstance = null;
      console.log('内网穿透隧道已关闭');
    } catch (error) {
      console.error('关闭隧道错误:', error);
    }
  }

  /**
   * 获取隧道状态
   * @returns {Object} 隧道状态信息
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      tunnelUrl: this.tunnelUrl,
      tunnelType: this.tunnelType,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * 获取所有活跃隧道
   * @returns {Promise<Array>} 隧道列表
   */
  async getTunnels() {
    try {
      if (this.tunnelType === 'ngrok') {
        return await ngrok.getApi().listTunnels();
      } else if (this.tunnelType === 'localtunnel') {
        return this.tunnelInstance ? [{ 
          public_url: this.tunnelUrl,
          proto: 'https',
          tunnel_type: 'localtunnel' 
        }] : [];
      }
      return [];
    } catch (error) {
      console.error('获取隧道列表错误:', error);
      return [];
    }
  }
}

module.exports = new TunnelService();