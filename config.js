/**
 * 全局配置文件
 * 针对失语人群优化的配置选项
 */

const CONFIG = {
  // 应用信息
  app: {
    name: '心声',
    version: '2.0.0',
    description: '失语人群辅助沟通工具'
  },

  // 语音合成配置
  speech: {
    // 使用微信内置语音合成（无需网络，更稳定）
    useBuiltinTTS: true,
    // 语速: 0-100, 默认50
    speed: 45,
    // 音量: 0-100, 默认50
    volume: 80,
    // 音调: 0-100, 默认50
    pitch: 50,
    // 音色: 0-女声, 1-男声
    voice: 0,
    // 重播次数
    repeatCount: 2
  },

  // 界面配置
  ui: {
    // 默认大字体模式
    largeFont: true,
    // 高对比度模式
    highContrast: false,
    // 震动反馈
    vibration: true,
    // 按钮点击音效
    soundEffect: true,
    // 动画效果
    animation: true
  },

  // 紧急求助配置
  emergency: {
    // 紧急短语
    phrases: [
      '救命！我需要帮助',
      '请帮我叫救护车',
      '我不舒服，请帮我',
      '请联系我的家人'
    ],
    // 震动模式: 短-短-长
    vibrationPattern: [100, 100, 100, 300],
    // 自动重播次数
    autoRepeat: 3
  },

  // 存储配置
  storage: {
    // 最近使用最大数量
    recentMaxCount: 30,
    // 自定义短语最大数量
    customMaxCount: 50,
    // 本地存储键名
    keys: {
      recent: 'recentPhrases_v2',
      custom: 'customPhrases_v2',
      settings: 'userSettings_v2',
      emergencyContact: 'emergencyContact_v2'
    }
  },

  // 短语分类 - 仅用于购物场景
  categories: {
    scenes: [
      {
        id: 'shopping',
        title: '外出购物',
        icon: '🛒',
        phrases: [
          '多少钱',
          '有没有更大的',
          '我要这个',
          '太贵了',
          '我刷卡',
          '我扫码',
          '请开票',
          '有优惠吗',
          '请帮我包起来',
          '我想退货',
          '有袋子吗',
          '试衣间在哪'
        ]
      }
    ]
  }
}

module.exports = CONFIG
