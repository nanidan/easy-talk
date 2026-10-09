var audioManager = require('../../utils/audio_manager.js');
var CONFIG = require('../../config.js');
var app = getApp();

// 短语 → 图标映射
var ICON_MAP = {
  // daily
  '我饿了，想吃饭': '🍚', '我想喝水': '💧', '我想上厕所': '🚻',
  '我困了，想睡觉': '😴', '我很冷': '🥶', '我很热': '🥵',
  '我很累': '😩', '请帮我一下': '🙏', '谢谢你的帮助': '😊',
  '我不需要，谢谢': '👋',
  // 卧床照护（无预合成语音，大字显示）
  '帮我翻身': '🛏️', '我痒': '✋', '给我纸和笔': '✍️',
  '帮我开灯': '💡', '帮我关灯': '🌙',
  // medical
  '我不舒服': '😣', '我头疼': '🤕', '我肚子疼': '😖',
  '我胸口闷': '💔', '我呼吸困难': '😰', '我头晕': '😵',
  '我想吐': '🤢', '请叫医生': '👨‍⚕️', '我需要吃药': '💊',
  '请帮我叫救护车': '🚑',
  // travel
  '请问怎么走': '🗺️', '我想去这个地方': '📍', '这是几路车': '🚌',
  '我在哪站下车': '🚏', '我迷路了': '😥', '请帮我报警': '🚨',
  '请联系我的家人': '📱', '我身体不舒服，请帮帮我': '😣',
  '请问厕所在哪': '🚻', '我需要休息': '😴',
  // emotion
  '我很开心': '😊', '我很难过': '😢', '我很害怕': '😨',
  '我很着急': '😰', '我感觉好多了': '😌', '我想一个人静静': '🤫',
  '我想和家人说话': '👨‍👩‍👧', '请稍等一下': '⏳',
  '我想回家': '🏠', '我想休息': '😴',
  // shopping
  '多少钱': '💰', '有没有更大的': '📏', '我要这个': '👆',
  '太贵了': '💸', '我刷卡': '💳', '我扫码': '📱',
  '请开票': '🧾', '有优惠吗': '🏷️', '请帮我包起来': '🎁',
  '我想退货': '↩️', '有袋子吗': '👜', '试衣间在哪': '👗',
  // emergency
  '救命！我需要帮助': '🆘', '我不舒服，请帮我': '😣',
  '救命': '🆘', '请帮我': '🙏'
};

// CONFIG.categories.quick 已移除，相关图标已直接定义在 ICON_MAP 中

function buildPhrases(textArr) {
  var result = [];
  for (var i = 0; i < textArr.length; i++) {
    result.push({ text: textArr[i], icon: ICON_MAP[textArr[i]] || '' });
  }
  return result;
}

function getConfigScenePhrases(sceneId) {
  var scenes = CONFIG.categories.scenes;
  for (var i = 0; i < scenes.length; i++) {
    if (scenes[i].id === sceneId) return scenes[i].phrases;
  }
  return [];
}

// 求助排在第二位：紧急表达必须一眼可达，不能藏在换行后的末尾
var TABS = [
  { key: 'daily', name: '日常', icon: '🏠', color: '#2ed573' },
  { key: 'emergency', name: '求助', icon: '🆘', color: '#ff4757' },
  { key: 'medical', name: '医疗', icon: '🏥', color: '#ffa502' },
  { key: 'shopping', name: '购物', icon: '🛒', color: '#e17055' },
  { key: 'travel', name: '出行', icon: '🚌', color: '#3742fa' },
  { key: 'emotion', name: '情绪', icon: '😊', color: '#a55eea' },
  { key: 'mine', name: '收藏', icon: '⭐', color: '#636e72' }
];

var SCENES = {
  daily: buildPhrases([
    '我饿了，想吃饭', '我想喝水', '我想上厕所', '我困了，想睡觉',
    '我很冷', '我很热', '我很累', '请帮我一下', '谢谢你的帮助', '我不需要，谢谢',
    // 长期卧床照护高频需求
    '帮我翻身', '我痒', '给我纸和笔', '帮我开灯', '帮我关灯'
  ]),
  medical: buildPhrases([
    '我不舒服', '我头疼', '我肚子疼', '我胸口闷',
    '我呼吸困难', '我头晕', '我想吐', '请叫医生',
    '我需要吃药', '请帮我叫救护车'
  ]),
  shopping: buildPhrases(getConfigScenePhrases('shopping')),
  travel: buildPhrases([
    '请问怎么走', '我想去这个地方', '这是几路车', '我在哪站下车',
    '我迷路了', '请帮我报警', '请联系我的家人', '我身体不舒服，请帮帮我',
    '请问厕所在哪', '我需要休息'
  ]),
  emotion: buildPhrases([
    '我很开心', '我很难过', '我很害怕', '我很着急',
    '我感觉好多了', '我想一个人静静', '我想和家人说话', '请稍等一下',
    '我想回家', '我想休息'
  ]),
  emergency: buildPhrases([
    '救命！我需要帮助', '请帮我叫救护车', '请叫医生', '请帮我报警',
    '我不舒服，请帮我', '请联系我的家人', '我呼吸困难', '我需要吃药'
  ])
};

// 紧急呼救第一条点击后自动循环大声播放，省去手抖时再点一次循环按钮
SCENES.emergency[0].autoLoop = true;

function getTabColor(tabName) {
  for (var i = 0; i < TABS.length; i++) {
    if (TABS[i].key === tabName) return TABS[i].color;
  }
  return '#636e72';
}

Page({
  data: {
    activeTab: 'daily',
    activeColor: TABS[0].color,
    tabs: TABS,
    currentPhrases: SCENES.daily,
    recentPhrases: [],

    isFullscreen: false,
    currentPhrase: '',
    currentNoVoice: false,
    isLooping: false,
    currentLanguage: 'base',

    // 是/否应答闪现
    answerText: '',
    answerVisible: false,
    answerTimer: null,

    // 设置面板
    showSettings: false,
    fontSize: 'normal',
    highContrast: false,
    speechRate: 1,
    fontSizeClass: '',
    highContrastClass: '',

    // 提示消息
    toastMessage: '',
    toastVisible: false,
    toastTimer: null,

    // 收藏状态
    isCurrentFavorite: false
  },

  onLoad: function() {
    var settings = app.getSettings();
    this.applySettings(settings);
    // 恢复上次使用的语言
    if (settings.language) {
      this.setData({ currentLanguage: settings.language });
      audioManager.setAudioSubdir(settings.language);
    }
    this.updateCurrentScene('daily');
    audioManager.preloadAudio();
  },

  onShow: function() {
    if (this.data.activeTab === 'mine') {
      this.updateCurrentScene('mine');
    }
  },

  onUnload: function() {
    audioManager.stopVoice();
  },

  // ========== 设置相关 ==========

  applySettings: function(settings) {
    var fsClass = settings.fontSize === 'normal' ? '' : 'font-' + settings.fontSize;
    var hcClass = settings.highContrast ? 'high-contrast' : '';
    this.setData({
      fontSize: settings.fontSize,
      highContrast: settings.highContrast,
      speechRate: settings.speechRate,
      fontSizeClass: fsClass,
      highContrastClass: hcClass
    });
    audioManager.setPlaybackRate(settings.speechRate);
    this.updateNavBarStyle(settings.highContrast);
  },

  updateNavBarStyle: function(hc) {
    if (hc) {
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#1a1a2e', animation: { duration: 300 } });
    } else {
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#667eea', animation: { duration: 300 } });
    }
  },

  showSettingsPanel: function() {
    this.setData({ showSettings: true });
  },

  hideSettings: function() {
    this.setData({ showSettings: false });
  },

  setFontSize: function(e) {
    var size = e.currentTarget.dataset.size;
    app.updateSetting('fontSize', size);
    var fsClass = size === 'normal' ? '' : 'font-' + size;
    this.setData({ fontSize: size, fontSizeClass: fsClass });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  setSpeechRate: function(e) {
    var rate = parseFloat(e.currentTarget.dataset.rate);
    app.updateSetting('speechRate', rate);
    this.setData({ speechRate: rate });
    audioManager.setPlaybackRate(rate);
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  toggleHighContrast: function() {
    var newVal = !this.data.highContrast;
    app.updateSetting('highContrast', newVal);
    this.setData({
      highContrast: newVal,
      highContrastClass: newVal ? 'high-contrast' : ''
    });
    this.updateNavBarStyle(newVal);
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  // ========== Tab 与短语 ==========

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.updateCurrentScene(tab);
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  updateCurrentScene: function(tabName) {
    if (tabName === 'mine') {
      this.loadMineTab();
      return;
    }
    // 附加收藏状态与语音可用性，驱动卡片角标显示
    var base = SCENES[tabName] || [];
    var phrases = [];
    for (var i = 0; i < base.length; i++) {
      phrases.push({
        text: base[i].text,
        icon: base[i].icon,
        autoLoop: base[i].autoLoop || false,
        isFav: app.isFavorite(base[i].text),
        hasVoice: audioManager.hasAudio(base[i].text, tabName)
      });
    }
    this.setData({
      currentPhrases: phrases,
      recentPhrases: this.buildRecentRows(tabName, base),
      activeColor: getTabColor(tabName)
    });
  },

  // 最近使用区：失语者表达高度重复，最近说的就是最常说的。
  // 紧急页保持极简不显示；排除当前场景已展示的短语
  buildRecentRows: function(tabName, base) {
    if (tabName === 'emergency') return [];
    var recentList = app.globalData.recentPhrases || [];
    var customs = app.globalData.customPhrases || [];
    var rows = [];
    for (var r = 0; r < recentList.length && rows.length < 4; r++) {
      var text = recentList[r];
      var dup = false;
      for (var k = 0; k < base.length; k++) {
        if (base[k].text === text) { dup = true; break; }
      }
      for (var k2 = 0; k2 < rows.length; k2++) {
        if (rows[k2].text === text) { dup = true; break; }
      }
      if (dup) continue;
      rows.push({
        text: text,
        icon: ICON_MAP[text] || '',
        isCustom: customs.indexOf(text) !== -1,
        isFav: app.isFavorite(text),
        hasVoice: audioManager.hasAudio(text)
      });
    }
    return rows;
  },

  loadMineTab: function() {
    // 自定义短语在前（可长按删除），收藏在后，末尾提供添加入口
    var favorites = app.getFavorites() || [];
    var customs = app.globalData.customPhrases || [];
    var phrases = [];

    for (var i = 0; i < customs.length; i++) {
      phrases.push({
        text: customs[i],
        icon: '💬',
        isCustom: true,
        hasVoice: audioManager.hasAudio(customs[i]),
        isFav: false
      });
    }
    for (var j = 0; j < favorites.length; j++) {
      // 与自定义短语重名的收藏不重复显示（自定义卡片可删除、同样可播放）
      if (customs.indexOf(favorites[j]) !== -1) continue;
      phrases.push({
        text: favorites[j],
        icon: ICON_MAP[favorites[j]] || '⭐',
        isCustom: false,
        hasVoice: audioManager.hasAudio(favorites[j]),
        isFav: true
      });
    }
    // 添加短语入口已移除，自定义功能将在下一版本提供
    this.setData({
      currentPhrases: phrases,
      recentPhrases: [],
      activeColor: getTabColor('mine')
    });
  },

  // ========== 收藏功能 ==========

  toggleFavorite: function(phrase) {
    if (!phrase) return;
    var isFav = app.isFavorite(phrase);
    if (isFav) {
      app.removeFromFavorites(phrase);
      this.showToast('已取消收藏');
    } else {
      app.addToFavorites(phrase);
      this.showToast('已添加到收藏');
    }
    // 刷新当前列表的收藏角标（收藏页同时会移除该卡片）
    this.updateCurrentScene(this.data.activeTab);
  },

  showFavoriteAction: function(phrase) {
    var that = this;
    var isFav = app.isFavorite(phrase);
    var itemList = isFav ? ['取消收藏'] : ['加入收藏'];

    wx.showActionSheet({
      itemList: itemList,
      success: function(res) {
        if (res.tapIndex === 0) {
          that.toggleFavorite(phrase);
        }
      }
    });
  },

  // ========== 卡片交互 ==========

  onCardTap: function(e) {
    this.speakPhrase(e);
  },

  onCardLongPress: function(e) {
    var ds = e.currentTarget.dataset;
    var phrase = ds.phrase;
    var that = this;

    var itemList;
    if (ds.custom) {
      itemList = ['删除这条短语'];
    } else if (app.isFavorite(phrase)) {
      itemList = ['取消收藏'];
    } else {
      itemList = ['加入收藏'];
    }

    wx.showActionSheet({
      itemList: itemList,
      success: function(res) {
        if (res.tapIndex !== 0) return;
        if (ds.custom) {
          app.removeCustomPhrase(phrase);
          that.loadMineTab();
          that.showToast('已删除');
        } else {
          that.toggleFavorite(phrase);
        }
      }
    });
  },

  speakPhrase: function(e) {
    var ds = e.currentTarget.dataset;
    var phrase = ds.phrase;
    this.showFullscreen(phrase, ds.autoloop);
    if (audioManager.hasAudio(phrase, this.data.activeTab)) {
      this.playVoice(phrase);
    }
    app.addToRecent(phrase);
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  // ========== 是/否应答（失语沟通的基石：对方提问，患者一指即答） ==========

  onAnswerTap: function(e) {
    var answer = e.currentTarget.dataset.answer;
    var that = this;
    if (this.data.answerTimer) clearTimeout(this.data.answerTimer);
    this.setData({ answerText: answer, answerVisible: true });
    // 大字短促闪现后自动消失，不打断当前页面
    var timer = setTimeout(function() {
      that.setData({ answerVisible: false, answerText: '' });
    }, 1600);
    this.setData({ answerTimer: timer });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  onAnswerFlashTap: function() {
    if (this.data.answerTimer) clearTimeout(this.data.answerTimer);
    this.setData({ answerVisible: false, answerText: '' });
  },

  // ========== 大字显示 ==========

  showFullscreen: function(phrase, autoLoop) {
    // 切换新短语前先停掉旧循环，否则旧短语一秒后会再次响起
    if (audioManager.isLoopPlaying()) audioManager.stopLoop();
    this.setData({
      isFullscreen: true,
      currentPhrase: phrase,
      currentNoVoice: !audioManager.hasAudio(phrase, this.data.activeTab),
      isLooping: false,
      isCurrentFavorite: app.isFavorite(phrase)
    });
    // 紧急短语直接进入循环播放，持续吸引周围人注意
    if (autoLoop) {
      this.setData({ isLooping: true });
      audioManager.startLoop(phrase, this.data.activeTab);
    }
  },

  toggleCurrentFavorite: function() {
    var phrase = this.data.currentPhrase;
    if (!phrase) return;
    // 全屏内静默切换收藏，按钮文案即时反馈，避免中央 toast 遮挡大字
    if (app.isFavorite(phrase)) {
      app.removeFromFavorites(phrase);
    } else {
      app.addToFavorites(phrase);
    }
    this.setData({ isCurrentFavorite: app.isFavorite(phrase) });
    this.updateCurrentScene(this.data.activeTab);
  },

  onFullscreenTap: function() {
    this.closeFullscreen();
  },

  onControlsTap: function() {},

  closeFullscreen: function() {
    if (this.data.isLooping) audioManager.stopLoop();
    this.setData({
      isFullscreen: false,
      currentPhrase: '',
      currentNoVoice: false,
      isLooping: false
    });
    audioManager.stopVoice();
  },

  toggleLoop: function() {
    var newLoopState = !this.data.isLooping;
    // 按钮自身的激活态与文案已即时反馈，不再弹中央 toast 遮挡大字
    this.setData({ isLooping: newLoopState });
    if (newLoopState) {
      audioManager.startLoop(this.data.currentPhrase, this.data.activeTab);
    } else {
      audioManager.stopLoop();
    }
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  // ========== 语言切换（设置面板内选择，选定后持久记忆） ==========

  switchLanguage: function(e) {
    var lang = e.currentTarget.dataset.lang;
    if (lang === this.data.currentLanguage) return;
    this.setData({ currentLanguage: lang });
    audioManager.setAudioSubdir(lang);
    app.updateSetting('language', lang);
    this.showToast('已切换到' + (lang === 'base' ? '普通话' : '粤语'));
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  playVoice: function(text) {
    audioManager.playVoice(text, this.data.activeTab);
  },

  shareLocation: function() {
    var that = this;
    wx.getLocation({
      type: 'gcj02',
      success: function(res) {
        wx.openLocation({ latitude: res.latitude, longitude: res.longitude, scale: 18 });
      },
      fail: function() { that.showToast('请允许使用位置信息'); }
    });
  },

  showToast: function(message) {
    var that = this;
    if (this.data.toastTimer) clearTimeout(this.data.toastTimer);
    this.setData({ toastMessage: message, toastVisible: true });
    var timer = setTimeout(function() {
      that.setData({ toastVisible: false });
    }, 2000);
    this.setData({ toastTimer: timer });
  }
});
