# 阿里云 TTS 语音生成工具

## 免费额度说明

阿里云「智能语音交互」向新用户提供 **3 个月免费试用**，语音合成按合成字数计量。本项目全部短语两套语言合计不足 1000 字，一次生成完全在免费额度内。试用期到期只影响后续调用，**已生成的 mp3 文件可永久使用**。

计费政策以阿里云官方文档为准：[智能语音交互计费方式与收费标准](https://help.aliyun.com/zh/isi/getting-started/billing-10)

## 配置方式（二选一）

### 方式1：使用 AccessToken（手动获取，有效期 24 小时）

```bash
# macOS / Linux
export ALIYUN_ACCESS_TOKEN=your-access-token
export ALIYUN_APPKEY=your-appkey

# Windows PowerShell
$env:ALIYUN_ACCESS_TOKEN="your-access-token"
$env:ALIYUN_APPKEY="your-appkey"
```

**获取 AccessToken：**

```bash
curl -X POST https://nls-meta.cn-shanghai.aliyuncs.com/pop/2019-02-28/tokens \
  -H "Content-Type: application/json" \
  -d '{"access_key_id":"your-id","access_key_secret":"your-secret"}'
```

### 方式2：使用 AccessKey（推荐，脚本自动换取 Token）

```bash
# macOS / Linux
export ALIYUN_ACCESS_KEY_ID=your-access-key-id
export ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
export ALIYUN_APPKEY=your-appkey

# Windows PowerShell
$env:ALIYUN_ACCESS_KEY_ID="your-access-key-id"
$env:ALIYUN_ACCESS_KEY_SECRET="your-access-key-secret"
$env:ALIYUN_APPKEY="your-appkey"
```

⚠️ AccessKey 只放在环境变量里，不要写进代码或提交到仓库。

## 使用步骤

### 1. 安装依赖

```bash
cd scripts
# 无需额外依赖，使用 Python 标准库
```

### 2. 测试生成（只合成一条，验证配置）

```bash
python3 generate_tts.py --test
```

### 3. 生成两套语音

```bash
# 普通话（xiaoyun 小云）
python3 generate_tts.py --output base --voice xiaoyun

# 粤语（jiajia 佳佳）
python3 generate_tts.py --output cantonese --voice jiajia
```

`--voice` 指定发音人；不带该参数时使用脚本内 `VOICE_CONFIG['voice']` 的默认值。

## 输出目录结构

```
assets/audio/
├── base/                          # 普通话语音包
│   ├── daily_*.mp3               # 日常生活短语
│   ├── medical_*.mp3             # 医疗短语
│   ├── shopping_*.mp3            # 购物短语
│   ├── travel_*.mp3              # 外出出行短语
│   ├── emotion_*.mp3             # 情绪表达短语
│   ├── emergency_*.mp3           # 紧急求助短语
│   └── audio_map.json            # 该目录的映射表
├── cantonese/                     # 粤语语音包（文件名与 base 一一对应）
│   └── ...
└── audio_map_base.json            # 根目录映射表副本（供同步用）
```

## ⚠️ 生成后必须同步 AUDIO_MAP

小程序实际读取的映射在 `utils/audio_manager.js` 的 `AUDIO_MAP`（小程序内 wx.request 读不了包内 json，json 只是同步源）。新增或重新生成音频后：

1. 打开 `assets/audio/audio_map_base.json`，把新条目**整行复制**进 `AUDIO_MAP`（不要手敲文件名，曾因 hash 抄错一个字符导致短语无声）
2. 跑 `node scripts/test_static_checks.js` 静态校验，它会逐条核对映射与磁盘文件是否一致

## 扩充其他方言语音

```bash
python3 generate_tts.py --output dialect --voice 某方言发音人
```

然后在小程序中切换语音包：

```javascript
var audioManager = require('../../utils/audio_manager.js');

// 切换到方言语音包
audioManager.setAudioSubdir('dialect');
```

## 可选发音人

| 发音人 | 声音特点 | 适用场景 |
|--------|----------|----------|
| xiaoyun | 小云，标准女声 | 普通话 |
| jiajia | 佳佳，粤语女声 | 粤语 |
| xiaogang | 小刚，标准男声 | 通用 |
| ruoxi | 若兮，温柔女声 | 情感表达 |

发音人列表见[阿里云官方音色列表](https://help.aliyun.com/zh/isi/developer-reference/speech-synthesis)。普通话和粤语需要使用不同的项目 AppKey。

## 语音参数

| 参数 | 范围 | 说明 |
|------|------|------|
| volume | 0~100 | 音量大小，默认 50 |
| speech_rate | -500~500 | 语速，默认 0 |
| pitch_rate | -500~500 | 音调，默认 0 |
| sample_rate | 8000/16000/24000 | 采样率，默认 16000 |

## 获取阿里云凭证

1. **开通服务（免费试用）**
   - 访问 https://www.aliyun.com/product/nls
   - 开通「智能语音交互」服务，选择免费试用版（新用户 3 个月）

2. **获取 AppKey**
   - [智能语音交互控制台](https://nls-portal.console.aliyun.com/) → 全部项目 → 创建项目
   - 勾选「语音合成」能力，创建后查看项目 **AppKey**
   - 普通话、粤语音色分别需要支持对应音色的项目（各一个 AppKey）

3. **获取 AccessKey**
   - 阿里云控制台 → 右上角头像 → AccessKey 管理
   - 建议：使用 RAM 子账号创建，只授予智能语音交互权限

## 常见问题

### "InvalidToken" 错误
- AccessToken 已过期（24 小时有效），重新获取
- 或改用方式2，脚本自动换取新 Token

### "InvalidAppKey" 错误
- 检查 AppKey 是否正确
- 确认项目已启用语音合成能力
- 确认项目支持所用的发音人（粤语 jiajia 需要对应项目）

### 免费试用到期
- 已生成的 mp3 可继续使用，只是无法再调用 API 生成新音频
- 可升级商用版，或用新账号的免费试用继续生成

### 生成速度慢
- 阿里云 TTS 有调用频率限制
- 脚本会自动处理，耐心等待

## 参考文档

- [阿里云语音合成文档](https://help.aliyun.com/zh/isi/developer-reference/restful-api-3)
- [获取 AccessToken](https://help.aliyun.com/zh/isi/developer-reference/obtain-an-access-token-1)
- [智能语音交互控制台](https://nls-portal.console.aliyun.com/)
- [计费方式与免费试用](https://help.aliyun.com/zh/isi/getting-started/billing-10)
