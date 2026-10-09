# 语音文件说明

## 离线语音方案

本项目使用**本地预合成语音**方案，采用阿里云TTS服务生成，具有以下优势：

- ✅ **离线可用** - 无需网络连接
- ✅ **即时响应** - 无网络延迟
- ✅ **零费用** - 一次性合成，无持续 API 调用费用
- ✅ **稳定可靠** - 不受网络环境影响
- ✅ **多语言** - 支持普通话、粤语

## 文件结构

```
assets/audio/
├── README.md                    # 本文件
├── audio_map_base.json          # 普通话映射表
├── audio_map_cantonese.json     # 粤语映射表
├── base/                        # 普通话音频（41个文件）
│   ├── daily_*.mp3             # 日常生活（10条）
│   ├── medical_*.mp3           # 身体不适（10条）
│   ├── travel_*.mp3            # 外出出行（10条）
│   ├── emotion_*.mp3           # 情绪表达（10条）
│   ├── emergency_*.mp3         # 紧急求助（1条）
│   └── audio_map.json          # 目录映射表
└── cantonese/                   # 粤语音频（41个文件）
    ├── daily_*.mp3             # 日常生活（10条）
    ├── medical_*.mp3           # 身体不适（10条）
    ├── travel_*.mp3            # 外出出行（10条）
    ├── emotion_*.mp3           # 情绪表达（10条）
    ├── emergency_*.mp3         # 紧急求助（1条）
    └── audio_map.json          # 目录映射表
```

## 生成语音文件

### 使用脚本批量生成（推荐）

```bash
cd scripts

# 设置环境变量
$env:ALIYUN_ACCESS_TOKEN="your-access-token"
$env:ALIYUN_APPKEY="your-appkey"

# 生成普通话（使用 xiaoyun 发音人）
python generate_tts.py --output base

# 生成粤语（使用 jiajia 发音人）
# 先修改 generate_tts.py 中的 voice 为 'jiajia'
python generate_tts.py --output cantonese
```

### 配置说明

| 语言 | 发音人 | 备注 |
|------|--------|------|
| 普通话 | xiaoyun | 标准女声 |
| 粤语 | jiajia | 粤语女声 |

AppKey 在阿里云「智能语音交互」控制台的项目详情中查看，请勿写入仓库文件。

详见 `scripts/README.md`

## 音频文件命名规则

文件名格式：`{category}_{hash}.mp3`

- `category` - 分类标识（daily/medical/travel/emotion/emergency）
- `hash` - 文本 MD5 前 8 位，用于唯一标识

示例：`daily_6fc93b8b.mp3` 表示「日常」分类下的「我饿了，想吃饭」

## 音频映射表

根目录映射表供小程序使用：

- `audio_map_base.json` - 普通话映射
- `audio_map_cantonese.json` - 粤语映射

格式：
```json
{
  "daily": {
    "我饿了，想吃饭": "/assets/audio/base/daily_6fc93b8b.mp3",
    "我想喝水": "/assets/audio/base/daily_64006700.mp3"
  },
  "medical": {
    "我不舒服": "/assets/audio/base/medical_1fad4134.mp3"
  }
}
```

## 注意事项

1. **文件格式**：MP3 格式，128kbps 即可
2. **文件大小**：单个文件建议不超过 50KB
3. **总大小**：所有音频文件总大小建议不超过 2MB，以控制小程序包体积
4. **备份**：建议将原始音频文件备份，以便后续修改

## 添加新短语

1. 修改 `scripts/generate_tts.py` 中的 `PHRASES` 字典
2. 运行脚本生成新音频
3. 更新 `utils/audio_manager.js` 中的 `AUDIO_MAP`
4. 更新 `pages/index/index.js` 的场景数据

## 技术实现

播放使用微信小程序 `wx.createInnerAudioContext()` API：

```javascript
var audioContext = wx.createInnerAudioContext();
audioContext.src = '/assets/audio/base/daily_6fc93b8b.mp3';
audioContext.play();
```

语言切换通过替换路径中的子目录实现：
```javascript
// base -> cantonese
var path = '/assets/audio/base/daily_6fc93b8b.mp3';
var cantonesePath = path.replace('/base/', '/cantonese/');
```

详见 `utils/audio_manager.js` 实现。
