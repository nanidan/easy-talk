// 冒烟测试：mock 微信小程序环境，验证 index.js 核心交互逻辑
var path = require('path');

// ---- mock wx ----
global.wx = {
  canIUse: function() { return true; },
  getStorageSync: function(key) {
    if (key === 'favoritePhrases') return ['我想喝水', '救命！我需要帮助', '帮我关灯'];
    if (key === 'recentPhrases') return ['帮我关灯', '我头疼'];
    if (key === 'customPhrases_v2') return ['我想吃苹果'];
    if (key === 'userSettings_v2') return { language: 'cantonese' };
    return [];
  },
  setStorageSync: function() {},
  createInnerAudioContext: function() {
    return {
      src: '', playbackRate: 1, obeyMuteSwitch: true,
      play: function() {}, stop: function() {},
      onError: function() {}
    };
  },
  setInnerAudioOption: function() {},
  vibrateShort: function() {},
  showActionSheet: function() {},
  showModal: function() {},
  setNavigationBarColor: function() {}
};

// ---- mock App ----
var appGlobalData = null;
global.App = function(opts) { appGlobalData = opts; };
require(path.join(__dirname, '..', 'app.js'));
// 小程序真实启动会调用 onLaunch 初始化 globalData，测试中手动触发
appGlobalData.onLaunch();

// ---- mock Page / getCurrentPages ----
var pageInstance = null;
global.Page = function(opts) { pageInstance = opts; };
global.getApp = function() { return appGlobalData; };

require(path.join(__dirname, '..', 'pages', 'index', 'index.js'));

var failures = [];
function assert(cond, msg) {
  if (cond) { console.log('PASS:', msg); }
  else { failures.push(msg); console.log('FAIL:', msg); }
}

// ---- 运行 onLoad（模拟真实初始化）----
global.wx.__storage = {};
pageInstance.data.toastTimer = null;
// setData 简化实现（Page 构造时没有 setData，测试里手动补）
pageInstance.setData = function(patch) {
  for (var k in patch) pageInstance.data[k] = patch[k];
};
pageInstance.showToast = function() {};

pageInstance.onLoad();

assert(pageInstance.data.currentLanguage === 'cantonese', '语言设置从 storage 恢复为粤语');
assert(appGlobalData.globalData.recentPhrases.indexOf('帮我关灯') === -1,
  '启动清理：最近使用中的孤儿短语（帮我关灯）被移除');
assert(appGlobalData.globalData.favoritePhrases.indexOf('帮我关灯') === -1,
  '启动清理：收藏中的孤儿短语（帮我关灯）被移除');
assert(pageInstance.data.activeTab === 'daily', '默认落在日常 tab');
assert(pageInstance.data.currentPhrases.length === 10, '日常场景 10 条短语');
assert(pageInstance.data.currentPhrases[1].isFav === true, '"我想喝水"（第2条）显示已收藏角标');
assert(pageInstance.data.currentPhrases[0].hasVoice === true, '日常短语有语音标记');
assert(pageInstance.data.tabs[0].key === 'daily' && pageInstance.data.tabs[1].key === 'emergency',
  '求助 tab 排在第二位');

// ---- 切到求助 tab ----
pageInstance.switchTab({ currentTarget: { dataset: { tab: 'emergency' } } });
assert(pageInstance.data.currentPhrases.length === 8, '求助场景 8 条短语');
assert(pageInstance.data.currentPhrases.every(function(p) { return p.hasVoice; }),
  '求助场景所有短语均有语音（跨表 fallback 生效）');

// ---- 切到收藏 tab ----
pageInstance.updateCurrentScene('mine');
var mine = pageInstance.data.currentPhrases;
assert(mine.length === 3, '收藏页 = 1 自定义 + 2 收藏（无添加卡片）');
assert(mine[0].text === '我想吃苹果' && mine[0].isCustom === true, '自定义短语排在最前');
assert(mine[0].hasVoice === false, '自定义短语标记为无语音');

// ---- 播放无语音短语：进入全屏但不调用播放 ----
var played = [];
var audioManager = require(path.join(__dirname, '..', 'utils', 'audio_manager.js'));
pageInstance.data.activeTab = 'mine';
pageInstance.playVoice = function(text) { played.push(text); };
pageInstance.speakPhrase({ currentTarget: { dataset: { phrase: '我想吃苹果', type: 'phrase' } } });
assert(pageInstance.data.isFullscreen === true, '无语音短语仍进入全屏大字');
assert(pageInstance.data.currentNoVoice === true, '全屏标记无语音状态');
assert(played.length === 0, '无语音短语不触发音频播放');

// ---- 播放有语音短语 ----
pageInstance.speakPhrase({ currentTarget: { dataset: { phrase: '我想喝水', type: 'phrase' } } });
assert(pageInstance.data.currentNoVoice === false, '有语音短语全屏正常');
assert(played.length === 1 && played[0] === '我想喝水', '有语音短语正常触发播放');
pageInstance.closeFullscreen();

// ---- 全部预设短语语音覆盖 ----
pageInstance.updateCurrentScene('medical');
var medicalTexts = pageInstance.data.currentPhrases.map(function(p) { return p.text; });
assert(medicalTexts.length === 10 && medicalTexts.every(function(t) { return t; }),
  '医疗页 10 条短语');
assert(pageInstance.data.currentPhrases.every(function(p) { return p.hasVoice === true; }),
  '医疗页全部短语有语音（无语音疼痛分级已删）');
pageInstance.updateCurrentScene('daily');
assert(pageInstance.data.currentPhrases.every(function(p) { return p.hasVoice === true; }),
  '全部预设短语均有语音（无语音护理短语已删）');

// ---- 最近使用区 ----
appGlobalData.globalData.recentPhrases = ['我头疼', '我想喝水', '救命！我需要帮助'];
pageInstance.updateCurrentScene('daily');
var recents = pageInstance.data.recentPhrases;
assert(recents.length === 2, '最近使用排除当前场景已有短语（"我想喝水"不重复出现）');
assert(recents[0].text === '我头疼' && recents[0].hasVoice === true, '最近使用按时间倒序且带语音标记');
pageInstance.switchTab({ currentTarget: { dataset: { tab: 'emergency' } } });
assert(pageInstance.data.recentPhrases.length === 0, '求助页保持极简，不显示最近使用');

// ---- 紧急短语自动循环 ----
pageInstance.speakPhrase({ currentTarget: { dataset: { phrase: '救命！我需要帮助', autoloop: true } } });
assert(pageInstance.data.isFullscreen === true, '紧急短语进入全屏');
assert(pageInstance.data.isLooping === true, '紧急短语自动进入循环播放');
assert(audioManager.isLoopPlaying() === true, '音频管理器循环状态生效');
audioManager.stopLoop();

// ---- 是/否应答 ----
pageInstance.onAnswerTap({ currentTarget: { dataset: { answer: '是' } } });
assert(pageInstance.data.answerText === '是' && pageInstance.data.answerVisible === true,
  '点击"是"闪现超大字');
pageInstance.onAnswerFlashTap();
assert(pageInstance.data.answerVisible === false, '点击闪现层可提前关闭');
pageInstance.closeFullscreen();

// ---- 切换语言持久化（设置面板内选择式） ----
pageInstance.data.currentLanguage = 'base';
pageInstance.switchLanguage({ currentTarget: { dataset: { lang: 'cantonese' } } });
assert(appGlobalData.getSettings().language === 'cantonese', '语言选择写入设置持久化');

// ---- hasAudio 跨表 ----
assert(audioManager.hasAudio('请帮我叫救护车', 'emergency') === true, '求助 tab 的救护车短语可跨表找到音频');
assert(audioManager.hasAudio('请帮我包起来') === true, '"请帮我包起来"音频 hash 已修正（9c5354eb）');
assert(audioManager.hasAudio('我的刀盾！', 'daily') === false, '刀盾彩蛋已彻底移除，不再命中任何音频');

// ---- 循环中点击其他卡片应停止旧循环 ----
pageInstance.data.activeTab = 'emergency';
pageInstance.speakPhrase({ currentTarget: { dataset: { phrase: '救命！我需要帮助', autoloop: true } } });
assert(audioManager.isLoopPlaying() === true, '紧急短语进入循环');
pageInstance.speakPhrase({ currentTarget: { dataset: { phrase: '请帮我叫救护车' } } });
assert(audioManager.isLoopPlaying() === false, '循环中点击其他卡片，旧循环立即停止');
assert(pageInstance.data.isLooping === false, '全屏循环状态同步复位');
pageInstance.closeFullscreen();

console.log(failures.length === 0 ? '\n全部通过' : '\n' + failures.length + ' 项失败');
process.exit(failures.length === 0 ? 0 : 1);
