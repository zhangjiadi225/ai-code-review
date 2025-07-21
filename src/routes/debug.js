const express = require('express');
const router = express.Router();

// 调试路由 - 显示请求信息
router.all('*', (req, res) => {
  const requestInfo = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString()
  };
  
  console.log('收到调试请求:', JSON.stringify(requestInfo, null, 2));
  
  res.json({
    message: '调试请求已记录',
    requestInfo
  });
});

module.exports = router;