/**
 * 语音播报工具类
 * 支持微信云函数调用TTS服务
 */
class SpeechUtil {
  constructor() {
    this.innerAudioContext = null
    this.currentPhrase = ''
    this.isPlaying = false
  }

  /**
   * 播放文本语音
   * @param {string} phrase - 要播放的文本
   * @param {Object} options - 配置选项
   * @param {number} options.rate - 语速 (0-100)
   * @param {number} options.volume - 音量 (0-100)
   * @param {Function} options.success - 成功回调
   * @param {Function} options.fail - 失败回调
   */
  speak(phrase, options = {}) {
    const { rate = 50, volume = 80, success, fail } = options

    // 停止当前播放
    this.stop()

    // 记录当前短语
    this.currentPhrase = phrase
    this.isPlaying = true

    // 方案1: 尝试使用微信内置语音合成（小程序云开发）
    this._tryCloudTTS(phrase, { rate, volume, success, fail })
  }

  /**
   * 尝试使用云函数TTS
   */
  _tryCloudTTS(phrase, options) {
    const { rate, volume, success, fail } = options

    // 如果有云开发环境，调用云函数
    if (wx.cloud) {
      wx.cloud.callFunction({
        name: 'textToSpeech',
        data: {
          text: phrase,
          rate,
          volume,
          voiceType: 0 // 0:女声 1:男声
        },
        success: (res) => {
          if (res.result && res.result.audioUrl) {
            this.playAudio(res.result.audioUrl, {
              success,
              fail: () => {
                // 云函数成功但播放失败，尝试降级方案
                this._fallbackSpeak(phrase, options)
              }
            })
          } else {
            // 云函数返回异常，使用降级方案
            this._fallbackSpeak(phrase, options)
          }
        },
        fail: (err) => {
          console.error('云函数调用失败:', err)
          // 云函数调用失败，使用降级方案
          this._fallbackSpeak(phrase, options)
        }
      })
    } else {
      // 没有云开发环境，直接使用降级方案
      this._fallbackSpeak(phrase, options)
    }
  }

  /**
   * 降级语音播报方案
   * 使用百度语音合成API（需要自行申请API Key）
   */
  _fallbackSpeak(phrase, options) {
    const { success, fail } = options

    // 这里可以实现其他TTS方案，如：
    // 1. 调用百度语音合成API
    // 2. 调用讯飞语音合成API
    // 3. 预录语音文件播放

    // 当前版本：显示文字提示（确保基础功能可用）
    console.log('语音播报:', phrase)

    // 模拟播放完成
    setTimeout(() => {
      this.isPlaying = false
      if (success) success()
    }, 1000)
  }

  /**
   * 播放音频文件
   */
  playAudio(audioUrl, options = {}) {
    const { success, fail } = options

    this.innerAudioContext = wx.createInnerAudioContext()
    this.innerAudioContext.autoplay = true
    this.innerAudioContext.src = audioUrl

    this.innerAudioContext.onPlay(() => {
      console.log('开始播放语音')
    })

    this.innerAudioContext.onError((err) => {
      console.error('音频播放失败:', err)
      this.isPlaying = false
      if (fail) fail(err)
    })

    this.innerAudioContext.onEnded(() => {
      console.log('语音播放结束')
      this.isPlaying = false
      if (success) success()
    })
  }

  /**
   * 停止播放
   */
  stop() {
    if (this.innerAudioContext) {
      this.innerAudioContext.stop()
      this.innerAudioContext.destroy()
      this.innerAudioContext = null
    }
    this.isPlaying = false
  }

  /**
   * 重播当前短语
   */
  replay() {
    if (this.currentPhrase) {
      this.speak(this.currentPhrase)
    }
  }

  /**
   * 是否正在播放
   */
  isSpeaking() {
    return this.isPlaying
  }
}

/**
 * 本地存储工具类
 */
class StorageUtil {
  static STORAGE_KEYS = {
    recent: 'recentPhrases_v2',
    custom: 'customPhrases_v2',
    settings: 'userSettings_v2',
    emergencyContact: 'emergencyContact_v2',
    userInfo: 'userInfo_v2'
  }

  /**
   * 获取最近使用短语
   * @returns {Array} 最近使用短语列表
   */
  static getRecentPhrases() {
    try {
      return wx.getStorageSync(this.STORAGE_KEYS.recent) || []
    } catch (e) {
      console.error('获取最近使用记录失败:', e)
      return []
    }
  }

  /**
   * 添加到最近使用
   * @param {string} phrase - 短语内容
   * @returns {Array} 更新后的列表
   */
  static addToRecent(phrase) {
    try {
      let recent = this.getRecentPhrases()

      // 移除重复项
      recent = recent.filter(item => item !== phrase)

      // 添加到开头
      recent.unshift(phrase)

      // 最多保留30条
      const maxCount = 30
      if (recent.length > maxCount) {
        recent = recent.slice(0, maxCount)
      }

      wx.setStorageSync(this.STORAGE_KEYS.recent, recent)
      return recent
    } catch (e) {
      console.error('保存最近使用记录失败:', e)
      return []
    }
  }

  /**
   * 清空最近使用
   */
  static clearRecent() {
    try {
      wx.removeStorageSync(this.STORAGE_KEYS.recent)
      return true
    } catch (e) {
      console.error('清空最近使用记录失败:', e)
      return false
    }
  }

  /**
   * 获取用户设置
   */
  static getSettings() {
    try {
      const defaultSettings = {
        largeFont: true,
        highContrast: false,
        vibration: true,
        soundEffect: true,
        speechRate: 50,
        speechVolume: 80
      }
      const settings = wx.getStorageSync(this.STORAGE_KEYS.settings)
      return settings ? { ...defaultSettings, ...settings } : defaultSettings
    } catch (e) {
      console.error('获取设置失败:', e)
      return null
    }
  }

  /**
   * 保存用户设置
   */
  static saveSettings(settings) {
    try {
      wx.setStorageSync(this.STORAGE_KEYS.settings, settings)
      return true
    } catch (e) {
      console.error('保存设置失败:', e)
      return false
    }
  }

  /**
   * 获取紧急联系人
   */
  static getEmergencyContact() {
    try {
      return wx.getStorageSync(this.STORAGE_KEYS.emergencyContact) || null
    } catch (e) {
      console.error('获取紧急联系人失败:', e)
      return null
    }
  }

  /**
   * 保存紧急联系人
   */
  static setEmergencyContact(contact) {
    try {
      wx.setStorageSync(this.STORAGE_KEYS.emergencyContact, contact)
      return true
    } catch (e) {
      console.error('保存紧急联系人失败:', e)
      return false
    }
  }

  /**
   * 获取用户信息
   */
  static getUserInfo() {
    try {
      return wx.getStorageSync(this.STORAGE_KEYS.userInfo) || null
    } catch (e) {
      console.error('获取用户信息失败:', e)
      return null
    }
  }

  /**
   * 保存用户信息
   */
  static setUserInfo(userInfo) {
    try {
      wx.setStorageSync(this.STORAGE_KEYS.userInfo, userInfo)
      return true
    } catch (e) {
      console.error('保存用户信息失败:', e)
      return false
    }
  }

  /**
   * 清除所有数据
   */
  static clearAll() {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        wx.removeStorageSync(key)
      })
      return true
    } catch (e) {
      console.error('清除数据失败:', e)
      return false
    }
  }
}

/**
 * 自定义短语管理工具
 */
class CustomPhraseUtil {
  static STORAGE_KEY = 'customPhrases_v2'
  static MAX_COUNT = 50

  /**
   * 生成唯一ID
   */
  static _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 获取所有自定义短语
   */
  static getAll() {
    try {
      return wx.getStorageSync(this.STORAGE_KEY) || []
    } catch (e) {
      console.error('获取自定义短语失败:', e)
      return []
    }
  }

  /**
   * 添加自定义短语
   * @param {Object} phrase - 短语对象
   * @param {string} phrase.text - 短语内容
   * @param {string} phrase.icon - 短语图标（可选）
   * @returns {boolean} 是否添加成功
   */
  static add(phrase) {
    try {
      const phrases = this.getAll()

      // 检查数量限制
      if (phrases.length >= this.MAX_COUNT) {
        console.warn('自定义短语数量已达上限')
        return false
      }

      // 检查重复
      if (phrases.some(p => p.text === phrase.text)) {
        console.warn('该短语已存在')
        return false
      }

      // 添加新短语
      const newPhrase = {
        id: this._generateId(),
        text: phrase.text,
        icon: phrase.icon || '💬',
        createdAt: new Date().toISOString()
      }

      phrases.unshift(newPhrase)
      wx.setStorageSync(this.STORAGE_KEY, phrases)
      return true
    } catch (e) {
      console.error('添加自定义短语失败:', e)
      return false
    }
  }

  /**
   * 删除自定义短语
   * @param {string} id - 短语ID
   */
  static remove(id) {
    try {
      const phrases = this.getAll()
      const filtered = phrases.filter(p => p.id !== id)
      wx.setStorageSync(this.STORAGE_KEY, filtered)
      return true
    } catch (e) {
      console.error('删除自定义短语失败:', e)
      return false
    }
  }

  /**
   * 更新自定义短语
   */
  static update(id, updates) {
    try {
      const phrases = this.getAll()
      const index = phrases.findIndex(p => p.id === id)

      if (index === -1) {
        return false
      }

      phrases[index] = { ...phrases[index], ...updates }
      wx.setStorageSync(this.STORAGE_KEY, phrases)
      return true
    } catch (e) {
      console.error('更新自定义短语失败:', e)
      return false
    }
  }

  /**
   * 清空所有自定义短语
   */
  static clear() {
    try {
      wx.removeStorageSync(this.STORAGE_KEY)
      return true
    } catch (e) {
      console.error('清空自定义短语失败:', e)
      return false
    }
  }

  /**
   * 获取数量
   */
  static getCount() {
    return this.getAll().length
  }

  /**
   * 是否已满
   */
  static isFull() {
    return this.getCount() >= this.MAX_COUNT
  }
}

/**
 * 紧急求助工具类
 */
class EmergencyUtil {
  /**
   * 触发紧急求助
   * @param {Object} options
   * @param {string} options.contact - 紧急联系人电话
   * @param {string} options.message - 求助消息
   * @param {Function} options.onCall - 拨打电话回调
   * @param {Function} options.onShare - 分享位置回调
   */
  static trigger(options = {}) {
    const { contact, message = '我需要紧急帮助', onCall, onShare } = options

    // 震动提示
    if (wx.vibrateLong) {
      // 紧急震动模式：短-短-长
      wx.vibrateLong()
      setTimeout(() => wx.vibrateShort(), 300)
      setTimeout(() => wx.vibrateLong(), 600)
    }

    // 显示紧急选项
    wx.showActionSheet({
      itemList: ['📞 拨打紧急电话', '📍 发送位置信息', '📢 播放求助语音'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this._makeEmergencyCall(contact, onCall)
            break
          case 1:
            this._shareLocation(onShare)
            break
          case 2:
            this._playEmergencyMessage(message)
            break
        }
      }
    })
  }

  /**
   * 拨打紧急电话
   */
  static _makeEmergencyCall(contact, callback) {
    if (!contact) {
      wx.showModal({
        title: '未设置紧急联系人',
        content: '请先设置紧急联系人',
        showCancel: false
      })
      return
    }

    wx.makePhoneCall({
      phoneNumber: contact,
      success: () => {
        if (callback) callback(true)
      },
      fail: () => {
        if (callback) callback(false)
      }
    })
  }

  /**
   * 分享位置
   */
  static _shareLocation(callback) {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res

        // 打开地图位置
        wx.openLocation({
          latitude,
          longitude,
          scale: 18
        })

        if (callback) callback(true, { latitude, longitude })
      },
      fail: () => {
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        })
        if (callback) callback(false)
      }
    })
  }

  /**
   * 播放紧急消息
   */
  static _playEmergencyMessage(message) {
    // 这里可以调用语音合成
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }
}

/**
 * 反馈工具
 */
class FeedbackUtil {
  /**
   * 提交反馈
   * @param {Object} data - 反馈数据
   * @param {Function} callback - 回调函数
   */
  static submit(data, callback) {
    const feedbackData = {
      ...data,
      timestamp: new Date().toISOString(),
      platform: 'wechat-miniprogram',
      systemInfo: wx.getSystemInfoSync()
    }

    console.log('提交反馈:', feedbackData)

    // 如果有云开发，保存到云数据库
    if (wx.cloud) {
      wx.cloud.callFunction({
        name: 'submitFeedback',
        data: feedbackData,
        success: (res) => {
          if (callback) callback(true, res)
        },
        fail: (err) => {
          console.error('提交反馈失败:', err)
          // 保存到本地，稍后同步
          this._saveToLocal(feedbackData)
          if (callback) callback(false, err)
        }
      })
    } else {
      // 无云开发，保存到本地
      this._saveToLocal(feedbackData)
      // 模拟成功
      setTimeout(() => {
        if (callback) callback(true, { message: '反馈已保存' })
      }, 500)
    }
  }

  /**
   * 保存到本地（离线模式）
   */
  static _saveToLocal(data) {
    try {
      const pending = wx.getStorageSync('pendingFeedback') || []
      pending.push(data)
      wx.setStorageSync('pendingFeedback', pending)
    } catch (e) {
      console.error('保存反馈到本地失败:', e)
    }
  }

  /**
   * 同步待提交的反馈
   */
  static syncPending() {
    try {
      const pending = wx.getStorageSync('pendingFeedback') || []
      if (pending.length === 0) return

      // 尝试同步每一条反馈
      pending.forEach((item, index) => {
        wx.cloud.callFunction({
          name: 'submitFeedback',
          data: item,
          success: () => {
            // 同步成功，从待处理列表移除
            pending.splice(index, 1)
            wx.setStorageSync('pendingFeedback', pending)
          }
        })
      })
    } catch (e) {
      console.error('同步反馈失败:', e)
    }
  }
}

/**
 * 工具类导出
 */
module.exports = {
  SpeechUtil,
  StorageUtil,
  CustomPhraseUtil,
  EmergencyUtil,
  FeedbackUtil
}
