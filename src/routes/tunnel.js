const express = require('express');
const tunnelService = require('../services/tunnel');

const router = express.Router();

// 获取隧道状态
router.get('/status', (req, res) => {
  try {
    const status = tunnelService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('获取隧道状态错误:', error);
    res.status(500).json({ error: '获取隧道状态失败' });
  }
});

// 重启隧道
router.post('/restart', async (req, res) => {
  try {
    await tunnelService.stopTunnel();
    const port = parseInt(process.env.PORT || '3000');
    const url = await tunnelService.startTunnel(port);
    
    if (url) {
      res.json({ 
        success: true, 
        message: '隧道已重启', 
        url,
        webhookUrls: {
          github: `${url}/webhook/github`,
          gitlab: `${url}/webhook/gitlab`
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '隧道启动失败，正在尝试重连' 
      });
    }
  } catch (error) {
    console.error('重启隧道错误:', error);
    res.status(500).json({ error: '重启隧道失败' });
  }
});

// 切换隧道类型
router.post('/switch-type', async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || !['ngrok', 'localtunnel'].includes(type)) {
      return res.status(400).json({ error: '无效的隧道类型' });
    }
    
    await tunnelService.stopTunnel();
    tunnelService.tunnelType = type;
    
    const port = parseInt(process.env.PORT || '3000');
    const url = await tunnelService.startTunnel(port);
    
    if (url) {
      res.json({ 
        success: true, 
        message: `隧道类型已切换至 ${type}`, 
        url,
        type
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '隧道启动失败，正在尝试重连' 
      });
    }
  } catch (error) {
    console.error('切换隧道类型错误:', error);
    res.status(500).json({ error: '切换隧道类型失败' });
  }
});

// 获取所有活跃隧道
router.get('/list', async (req, res) => {
  try {
    const tunnels = await tunnelService.getTunnels();
    res.json(tunnels);
  } catch (error) {
    console.error('获取隧道列表错误:', error);
    res.status(500).json({ error: '获取隧道列表失败' });
  }
});

module.exports = router;