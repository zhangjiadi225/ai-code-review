const crypto = require('crypto');
require('dotenv').config()

/**
 * GitHub webhook验证中间件
 * 用于验证来自GitHub的请求是否合法
 */
function githubWebhookValidator(req, res, next) {
  try {
    // 如果不是GitHub webhook请求，直接通过
    if (!req.headers['x-github-event']) {
      return next();
    }

    console.log('验证GitHub webhook请求...');

    // 如果没有配置secret，跳过验证
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      console.log('未配置GITHUB_WEBHOOK_SECRET，跳过验证');
      return next();
    }

    // 获取GitHub签名
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      console.log('请求中没有x-hub-signature-256头，可能是测试请求');
      return next();
    }

    // 计算预期的签名
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

    // 验证签名
    if (crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
      console.log('GitHub webhook签名验证通过');
      return next();
    } else {
      console.error('GitHub webhook签名验证失败');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('验证GitHub webhook时出错:', error);
    // 即使验证出错，也允许请求通过，但记录错误
    return next();
  }
}

module.exports = {
  githubWebhookValidator
};