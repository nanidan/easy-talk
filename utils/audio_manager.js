// 音频管理器 - 本地语音播放（优化版）
// 使用双缓冲和预加载提升播放速度

// 音频子目录配置，默认为 'base'，后续可扩展为 'dialect' 等
var AUDIO_SUBDIR = 'base';

// 音频文件映射表（相对于 assets/audio/ 的路径）
var AUDIO_MAP = {
  daily: {
    '我饿了，想吃饭': '/assets/audio/base/daily_6fc93b8b.mp3',
    '我想喝水': '/assets/audio/base/daily_64006700.mp3',
    '我想上厕所': '/assets/audio/base/daily_62f28480.mp3',
    '我困了，想睡觉': '/assets/audio/base/daily_1310df87.mp3',
    '我很冷': '/assets/audio/base/daily_dc6512f3.mp3',
    '我很热': '/assets/audio/base/daily_2ba91d31.mp3',
    '我很累': '/assets/audio/base/daily_6cc8d307.mp3',
    '请帮我一下': '/assets/audio/base/daily_a47291f5.mp3',
    '谢谢你的帮助': '/assets/audio/base/daily_53ad8d89.mp3',
    '我不需要，谢谢': '/assets/audio/base/daily_92b8ee26.mp3'
  },
  medical: {
    '我不舒服': '/assets/audio/base/medical_1fad4134.mp3',
    '我头疼': '/assets/audio/base/medical_6c56ab23.mp3',
    '我肚子疼': '/assets/audio/base/medical_71d58980.mp3',
    '我胸口闷': '/assets/audio/base/medical_b14ddd38.mp3',
    '我呼吸困难': '/assets/audio/base/medical_16fe9956.mp3',
    '我头晕': '/assets/audio/base/medical_6a5ad921.mp3',
    '我想吐': '/assets/audio/base/medical_7f33e2ee.mp3',
    '请叫医生': '/assets/audio/base/medical_f9477a4b.mp3',
    '我需要吃药': '/assets/audio/base/medical_69924a4a.mp3',
    '请帮我叫救护车': '/assets/audio/base/medical_5dd90ed4.mp3'
  },
  travel: {
    '请问怎么走': '/assets/audio/base/travel_1112f555.mp3',
    '我想去这个地方': '/assets/audio/base/travel_f5b32c06.mp3',
    '这是几路车': '/assets/audio/base/travel_c476e1c5.mp3',
    '我在哪站下车': '/assets/audio/base/travel_99a12596.mp3',
    '我迷路了': '/assets/audio/base/travel_2d09cb03.mp3',
    '请帮我报警': '/assets/audio/base/travel_8ff0c645.mp3',
    '请联系我的家人': '/assets/audio/base/travel_470591af.mp3',
    '我身体不舒服，请帮帮我': '/assets/audio/base/travel_19d64b1e.mp3',
    '请问厕所在哪': '/assets/audio/base/travel_1dd2232b.mp3',
    '我需要休息': '/assets/audio/base/travel_0f0a1fd5.mp3'
  },
  emotion: {
    '我很开心': '/assets/audio/base/emotion_1fc74d13.mp3',
    '我很难过': '/assets/audio/base/emotion_7292dafe.mp3',
    '我很害怕': '/assets/audio/base/emotion_188891b8.mp3',
    '我很着急': '/assets/audio/base/emotion_f776fce0.mp3',
    '我感觉好多了': '/assets/audio/base/emotion_7628d668.mp3',
    '我想一个人静静': '/assets/audio/base/emotion_3937c19d.mp3',
    '我想和家人说话': '/assets/audio/base/emotion_468b8a73.mp3',
    '请稍等一下': '/assets/audio/base/emotion_a888cd38.mp3',
    '我想回家': '/assets/audio/base/emotion_08d84ac3.mp3',
    '我想休息': '/assets/audio/base/emotion_6f4132b9.mp3'
  },
  emergency: {
    '救命！我需要帮助': '/assets/audio/base/emergency_d529de36.mp3',
    '我需要紧急帮助，请帮帮我': '/assets/audio/base/emergency_d529de36.mp3',
    '救命': '/assets/audio/base/emergency_9fe1951b.mp3',
    '请帮我': '/assets/audio/base/emergency_cadd8a41.mp3',
    '我不舒服，请帮我': '/assets/audio/base/emergency_709c2fa1.mp3'
  },
  shopping: {
    '多少钱': '/assets/audio/base/shopping_57af3610.mp3',
    '有没有更大的': '/assets/audio/base/shopping_8747ef5b.mp3',
    '我要这个': '/assets/audio/base/shopping_3dc01131.mp3',
    '太贵了': '/assets/audio/base/shopping_f48b8a61.mp3',
    '我刷卡': '/assets/audio/base/shopping_02b1d754.mp3',
    '我扫码': '/assets/audio/base/shopping_03394cb6.mp3',
    '请开票': '/assets/audio/base/shopping_7357d4c1.mp3',
    '有优惠吗': '/assets/audio/base/shopping_96a16142.mp3',
    '请帮我包起来': '/assets/audio/base/shopping_9c5354eb.mp3',
    '我想退货': '/assets/audio/base/shopping_3062580b.mp3',
    '有袋子吗': '/assets/audio/base/shopping_85388207.mp3',
    '试衣间在哪': '/assets/audio/base/shopping_94a1a15f.mp3'
  }
};

// 音频上下文池 - 每个音频文件预创建一个上下文
var audioPool = {};

// 关键：语音播报必须在系统静音模式下也能出声（失语者沟通依赖声音）。
// 基础库 >= 2.3.0 实例属性 obeyMuteSwitch 已失效，需全局设置（仅 iOS 生效）
if (wx.setInnerAudioOption) {
  wx.setInnerAudioOption({ obeyMuteSwitch: false });
}

/**
 * 统一创建音频上下文：不遵循静音开关 + 播放失败日志（真机调试排查用）
 */
function createAudio(path) {
  var audio = wx.createInnerAudioContext();
  audio.src = path;
  // 兼容基础库 < 2.3.0 的旧写法
  audio.obeyMuteSwitch = false;
  if (audio.onError) {
    audio.onError(function(err) {
      console.error('音频播放失败:', path, err && err.errMsg);
    });
  }
  return audio;
}

// 播放速率（0.5 ~ 2.0）
var playbackRate = 1.0;

// 循环播放相关
var loopTimer = null;
var isLooping = false;
var currentLoopText = '';
var currentLoopCategory = '';
var LOOP_INTERVAL = 1000;

/**
 * 获取音频路径
 */
function getAudioPath(text, category, subdir) {
  subdir = subdir || AUDIO_SUBDIR;

  var basePath = '';
  if (category && AUDIO_MAP[category] && AUDIO_MAP[category][text]) {
    basePath = AUDIO_MAP[category][text];
  } else {
    for (var cat in AUDIO_MAP) {
      if (AUDIO_MAP[cat][text]) {
        basePath = AUDIO_MAP[cat][text];
        break;
      }
    }
  }

  if (!basePath) return null;

  return basePath.replace('/assets/audio/base/', '/assets/audio/' + subdir + '/');
}

/**
 * 判断短语是否有对应的本地语音文件
 */
function hasAudio(text, category) {
  return !!getAudioPath(text, category);
}

/**
 * 预加载所有音频 - 在页面加载时调用
 */
function preloadAudio() {
  var count = 0;
  for (var cat in AUDIO_MAP) {
    for (var text in AUDIO_MAP[cat]) {
      var path = getAudioPath(text, cat);
      if (path && !audioPool[path]) {
        audioPool[path] = createAudio(path);
        count++;
      }
    }
  }
  console.log('预加载音频:', count, '个');
}

/**
 * 播放本地语音文件 - 使用预加载的音频上下文
 */
function playVoice(text, category, customSubdir) {
  var subdir = customSubdir || AUDIO_SUBDIR;
  var audioPath = getAudioPath(text, category, subdir);

  if (!audioPath) {
    console.log('未找到语音文件:', text);
    fallbackTTS(text);
    return;
  }

  // 先停止其他正在播放的音频
  stopAllExcept(audioPath);

  var audio = audioPool[audioPath];

  // 如果还没预加载，临时创建一个
  if (!audio) {
    audio = createAudio(audioPath);
    audioPool[audioPath] = audio;
  }

  // 重置并播放
  audio.stop();
  audio.playbackRate = playbackRate;

  // 使用 nextTick 确保 stop 完成后再 play
  setTimeout(function() {
    audio.play();
  }, 10);

  console.log('播放:', text, audioPath);
}

/**
 * 停止除指定路径外的所有音频
 */
function stopAllExcept(exceptPath) {
  for (var path in audioPool) {
    if (path !== exceptPath) {
      try {
        audioPool[path].stop();
      } catch (e) {}
    }
  }
}

/**
 * 停止所有音频
 */
function stopVoice() {
  for (var path in audioPool) {
    try {
      audioPool[path].stop();
    } catch (e) {}
  }
}

/**
 * 降级方案：使用微信 TTS
 */
function fallbackTTS(text) {
  if (wx.request) {
    console.log('使用在线 TTS:', text);
  }
}

/**
 * 设置音频子目录（切换语言）
 */
function setAudioSubdir(subdir) {
  var oldSubdir = AUDIO_SUBDIR;
  AUDIO_SUBDIR = subdir || 'base';

  // 清空音频池，使用新语言重新预加载
  if (oldSubdir !== AUDIO_SUBDIR) {
    audioPool = {};
    preloadAudio();
  }
}

/**
 * 加载指定子目录的音频映射表
 */
function loadAudioMap(subdir) {
  var mapPath = '/assets/audio/audio_map_' + subdir + '.json';

  wx.request({
    url: mapPath,
    method: 'GET',
    success: function(res) {
      if (res.statusCode === 200 && res.data) {
        AUDIO_MAP = res.data;
        audioPool = {}; // 清空池
        preloadAudio(); // 重新预加载
        console.log('已加载音频映射表:', subdir);
      }
    },
    fail: function() {
      console.log('使用默认音频映射表');
    }
  });
}

/**
 * 开始循环播放
 */
function startLoop(text, category) {
  stopLoop();

  isLooping = true;
  currentLoopText = text;
  currentLoopCategory = category;

  // 立即播放一次
  playVoice(text, category);

  // 设置定时循环
  loopTimer = setInterval(function() {
    if (isLooping) {
      playVoice(currentLoopText, currentLoopCategory);
    }
  }, LOOP_INTERVAL);

  console.log('开始循环:', text);
}

/**
 * 停止循环播放
 */
function stopLoop() {
  isLooping = false;
  currentLoopText = '';
  currentLoopCategory = '';

  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }

  stopVoice();
  console.log('停止循环');
}

/**
 * 获取循环状态
 */
function isLoopPlaying() {
  return isLooping;
}

/**
 * 设置播放速率
 */
function setPlaybackRate(rate) {
  playbackRate = rate || 1.0;
}

module.exports = {
  playVoice: playVoice,
  stopVoice: stopVoice,
  preloadAudio: preloadAudio,
  setAudioSubdir: setAudioSubdir,
  loadAudioMap: loadAudioMap,
  startLoop: startLoop,
  stopLoop: stopLoop,
  isLoopPlaying: isLoopPlaying,
  setPlaybackRate: setPlaybackRate,
  hasAudio: hasAudio,
  AUDIO_MAP: AUDIO_MAP,
  AUDIO_SUBDIR: AUDIO_SUBDIR
};
