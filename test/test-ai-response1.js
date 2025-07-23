/**
 * 页面级水印工具
 * 自动获取用户信息生成水印：姓名+手机尾号后四位
 */
class PageWaterMark {
	constructor() {
		this.waterMarkId = 'page-watermark-container'
		this.observer = null
		this.isActive = false
	}

	/**
	 * 获取用户信息
	 * @returns {Object} 用户信息对象
	 */
	getUserInfo = () => {
		// 从uni存储获取用户信息
		const accountName = 'accountName'
		const userPhone = 'userPhone'

		return {
			name: accountName,
			phone: userPhone,
		}
	}

	/**
	 * 生成水印文字
	 * @returns {string} 格式化的水印文字
	 */
	generateWaterMarkText = () => {
		const { name, phone } = this.getUserInfo()

		if (!name && !phone) {
			return '未登录用户'
		}

		let waterMarkText = name || '未知用户'

		// 如果有手机号，添加后四位
		if (phone && phone.length >= 4) {
			const lastFour = phone.slice(-4)
			waterMarkText += ` ${lastFour}`
		}

		return waterMarkText
	}

	/**
	 * 创建水印背景图
	 * @param {Object} options - 样式选项
	 * @returns {string} base64 图片数据
	 */
	createWaterMarkImage = (options = {}) => {
		const { fontSize, fontFamily, color, width, height, rotate } = options

		const text = this.generateWaterMarkText()
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')

		// 获取设备像素比，提高清晰度
		const devicePixelRatio = window.devicePixelRatio || 1
		const canvasWidth = width * devicePixelRatio
		const canvasHeight = height * devicePixelRatio

		canvas.width = canvasWidth
		canvas.height = canvasHeight
		canvas.style.width = `${width}px`
		canvas.style.height = `${height}px`

		// 缩放上下文以匹配设备像素比
		ctx.scale(devicePixelRatio, devicePixelRatio)

		// 设置字体抗锯齿
		ctx.textRenderingOptimization = 'optimizeQuality'
		ctx.font = `${fontSize} ${fontFamily}`
		ctx.fillStyle = color
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.shadowColor = 'rgba(0,0,0,0.6)'
		ctx.shadowOffsetX = 5
		ctx.shadowOffsetY = 0
		ctx.shadowBlur = 2

		// 旋转画布
		ctx.translate(width / 2, height / 2)
		ctx.rotate((rotate * Math.PI) / 180)
		ctx.fillText(text, 0, 0)

		return canvas.toDataURL('image/png')
	}

	/**
	 * 添加页面水印
	 * @param {Object} options - 配置选项
	 */
	show = (options = {}) => {
		// 如果已经存在，先移除
		this.hide()

		const {
			fontSize = '14px',
			color = 'rgba(255,255,255,0.10)',
			width = 140,
			height = 140,
			rotate = -16,
			zIndex = 9999,
			monitor = true,
		} = options

		const waterMarkDataUrl = this.createWaterMarkImage({
			fontSize,
			color,
			width,
			height,
			rotate,
		})

		const waterMarkDiv = document.createElement('div')
		waterMarkDiv.id = this.waterMarkId

		const styles = {
			position: 'fixed',
			top: '0',
			left: '0',
			width: '100%',
			height: '100%',
			zIndex: zIndex,
			pointerEvents: 'none',
			backgroundImage: `url(${waterMarkDataUrl})`,
			backgroundRepeat: 'repeat',
			backgroundSize: `${width}px ${height}px`,
		}

		Object.assign(waterMarkDiv.style, styles)
		document.body.appendChild(waterMarkDiv)

		this.isActive = true

		// 开启监控
		if (monitor) {
			this.startMonitor(options)
		}
	}

	/**
	 * 移除页面水印
	 */
	hide = () => {
		// 查找所有水印
		const waterMarkElements = document.querySelectorAll(`#${this.waterMarkId}`)
		waterMarkElements.forEach((element) => {
			element.remove()
		})

		this.isActive = false

		// 停止监控
		if (this.observer) {
			this.observer.disconnect()
			this.observer = null
		}
	}

	/**
	 * 刷新水印（用户信息变更后）
	 * @param {Object} options - 配置选项
	 */
	refresh = (options = {}) => {
		if (this.isActive) {
			this.show(options)
		}
	}

	/**
	 * 开始监控水印
	 * @param {Object} options - 配置选项
	 */
	startMonitor = (options) => {
		if (!window.MutationObserver) {
			return
		}

		this.observer = new MutationObserver((mutations) => {
			let needRestore = false

			mutations.forEach((mutation) => {
				if (mutation.type === 'childList') {
					mutation.removedNodes.forEach((node) => {
						if (node.nodeType === 1 && node.id === this.waterMarkId) {
							needRestore = true
						}
					})
				}

				if (mutation.type === 'attributes' && mutation.target.id === this.waterMarkId) {
					needRestore = true
				}
			})

			if (needRestore && this.isActive) {
				this.observer.disconnect()
				this.show(options)
			}
		})

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['style', 'class'],
		})
	}

	/**
	 * 检查水印是否激活
	 * @returns {boolean} 是否激活
	 */
	isShow = () => {
		return this.isActive && document.getElementById(this.waterMarkId) !== null
	}

	/**
	 * 获取当前水印文字
	 * @returns {string} 当前水印文字
	 */
	getCurrentText = () => {
		return this.generateWaterMarkText()
	}
}

// 创建全局实例
const pageWaterMark = new PageWaterMark()

/**
 * 显示页面水印
 * @param {Object} options - 配置选项
 */
export const showWaterMark = (options = {}) => {
	pageWaterMark.show(options)
}

/**
 * 隐藏页面水印
 */
export const hideWaterMark = () => {
	pageWaterMark.hide()
}

/**
 * 刷新页面水印（用户信息变更后调用）
 * @param {Object} options - 配置选项
 */
export const refreshWaterMark = (options = {}) => {
	pageWaterMark.refresh(options)
}

/**
 * 检查水印是否显示
 * @returns {boolean} 是否显示
 */
export const isWaterMarkShow = () => {
	return pageWaterMark.isShow()
}

/**
 * 获取当前水印文字
 * @returns {string} 当前水印文字
 */
export const getWaterMarkText = () => {
	return pageWaterMark.getCurrentText()
}

// 默认导出
export default pageWaterMark
