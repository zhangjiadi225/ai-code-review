const express = require('express')
const logger = require('../services/logger')

const router = express.Router()

// 获取所有日志文件列表
router.get('/', async (req, res) => {
  try {
    const diffLogs = await logger.getLogFiles('diff')
    const webhookLogs = await logger.getLogFiles('webhook')
    const commitLogs = await logger.getLogFiles('commit')
    
    res.json({
      status: 'success',
      logs: {
        diff: diffLogs,
        webhook: webhookLogs,
        commit: commitLogs
      }
    })
  } catch (error) {
    console.error('获取日志列表失败:', error)
    res.status(500).json({ status: 'error', message: '获取日志列表失败' })
  }
})

// 获取特定类型的日志文件列表
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params
    
    if (!['diff', 'webhook', 'commit'].includes(type)) {
      return res.status(400).json({ 
        status: 'error', 
        message: '无效的日志类型，有效类型: diff, webhook, commit' 
      })
    }
    
    const logs = await logger.getLogFiles(type)
    res.json({
      status: 'success',
      type,
      logs
    })
  } catch (error) {
    console.error('获取日志列表失败:', error)
    res.status(500).json({ status: 'error', message: '获取日志列表失败' })
  }
})

// 获取特定日志文件内容
router.get('/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params
    
    if (!['diff', 'webhook', 'commit'].includes(type)) {
      return res.status(400).json({ 
        status: 'error', 
        message: '无效的日志类型，有效类型: diff, webhook, commit' 
      })
    }
    
    const logContent = await logger.readLogFile(filename, type)
    res.json({
      status: 'success',
      type,
      filename,
      content: logContent
    })
  } catch (error) {
    console.error('获取日志内容失败:', error)
    res.status(500).json({ status: 'error', message: '获取日志内容失败' })
  }
})

module.exports = router