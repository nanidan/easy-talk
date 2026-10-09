App({
  onLaunch() {
    if (!wx.canIUse('createInnerAudioContext')) {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，部分功能可能无法使用，请升级到最新版本。'
      })
    }

    var defaultSettings = { fontSize: 'normal', highContrast: false, speechRate: 1.0, language: 'base' }
    var savedSettings = wx.getStorageSync('userSettings_v2') || {}

    this.globalData = {
      userInfo: null,
      recentPhrases: wx.getStorageSync('recentPhrases') || [],
      customPhrases: wx.getStorageSync('customPhrases_v2') || [],
      favoritePhrases: wx.getStorageSync('favoritePhrases') || [],
      settings: Object.assign({}, defaultSettings, savedSettings)
    }
  },

  addToRecent(phrase) {
    var recent = this.globalData.recentPhrases || []
    recent = recent.filter(function(item) { return item !== phrase })
    recent.unshift(phrase)
    if (recent.length > 20) recent = recent.slice(0, 20)
    this.globalData.recentPhrases = recent
    wx.setStorageSync('recentPhrases', recent)
    return recent
  },

  // 清理孤儿数据：预设短语变更后，最近使用/收藏里可能残留已删除的短语（如无语音的护理短语）
  cleanupOrphans(validTexts) {
    var valid = {}
    for (var i = 0; i < validTexts.length; i++) valid[validTexts[i]] = true
    var custom = this.globalData.customPhrases || []
    for (var j = 0; j < custom.length; j++) valid[custom[j]] = true

    var recent = this.globalData.recentPhrases || []
    var cleanRecent = recent.filter(function(t) { return valid[t] })
    if (cleanRecent.length !== recent.length) {
      this.globalData.recentPhrases = cleanRecent
      wx.setStorageSync('recentPhrases', cleanRecent)
    }
    var favorites = this.globalData.favoritePhrases || []
    var cleanFavs = favorites.filter(function(t) { return valid[t] })
    if (cleanFavs.length !== favorites.length) {
      this.globalData.favoritePhrases = cleanFavs
      wx.setStorageSync('favoritePhrases', cleanFavs)
    }
  },

  addCustomPhrase(phrase) {
    if (!phrase) return this.globalData.customPhrases
    var custom = this.globalData.customPhrases || []
    for (var i = 0; i < custom.length; i++) {
      if (custom[i] === phrase) return custom
    }
    custom.push(phrase)
    if (custom.length > 50) custom = custom.slice(-50)
    this.globalData.customPhrases = custom
    wx.setStorageSync('customPhrases_v2', custom)
    return custom
  },

  removeCustomPhrase(phrase) {
    var custom = this.globalData.customPhrases || []
    custom = custom.filter(function(item) { return item !== phrase })
    this.globalData.customPhrases = custom
    wx.setStorageSync('customPhrases_v2', custom)
    return custom
  },

  // ========== 收藏功能 ==========

  addToFavorites(phrase) {
    if (!phrase) return this.globalData.favoritePhrases
    var favorites = this.globalData.favoritePhrases || []
    // 检查是否已存在
    for (var i = 0; i < favorites.length; i++) {
      if (favorites[i] === phrase) return favorites
    }
    favorites.unshift(phrase)
    if (favorites.length > 100) favorites = favorites.slice(0, 100)
    this.globalData.favoritePhrases = favorites
    wx.setStorageSync('favoritePhrases', favorites)
    return favorites
  },

  removeFromFavorites(phrase) {
    var favorites = this.globalData.favoritePhrases || []
    favorites = favorites.filter(function(item) { return item !== phrase })
    this.globalData.favoritePhrases = favorites
    wx.setStorageSync('favoritePhrases', favorites)
    return favorites
  },

  isFavorite(phrase) {
    var favorites = this.globalData.favoritePhrases || []
    for (var i = 0; i < favorites.length; i++) {
      if (favorites[i] === phrase) return true
    }
    return false
  },

  getFavorites() {
    return this.globalData.favoritePhrases || []
  },

  getSettings() {
    return this.globalData.settings
  },

  updateSetting(key, value) {
    this.globalData.settings[key] = value
    wx.setStorageSync('userSettings_v2', this.globalData.settings)
  },

  globalData: {
    userInfo: null,
    recentPhrases: [],
    customPhrases: [],
    favoritePhrases: [],
    settings: { fontSize: 'normal', highContrast: false, speechRate: 1.0, language: 'base' }
  }
})
