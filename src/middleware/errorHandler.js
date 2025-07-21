require('dotenv').config()
/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  // 记录错误详情
  console.error('错误发生时间:', new Date().toISOString());
  console.error('请求方法:', req.method);
  console.error('请求URL:', req.url);
  console.error('请求头:', JSON.stringify(req.headers, null, 2));
  console.error('错误消息:', err.message);
  console.error('错误堆栈:', err.stack);

  // 对于webhook请求，即使出错也返回200状态码
  if (req.url.startsWith('/webhook/')) {
    return res.status(200).json({
      status: 'error',
      message: '处理webhook时出错，但已收到请求'
    });
  }

  // 其他请求返回500错误
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
}

module.exports = errorHandler;