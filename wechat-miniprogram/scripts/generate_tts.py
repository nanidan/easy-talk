#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阿里云 TTS 语音生成脚本 (RESTful API)
文档: https://help.aliyun.com/zh/isi/developer-reference/restful-api-3

使用方法 - 方式1: 使用 AccessToken (推荐)
   export ALIYUN_ACCESS_TOKEN=your-access-token
   export ALIYUN_APPKEY=your-appkey
   python generate_tts.py

使用方法 - 方式2: 使用 AccessKey (自动获取 Token)
   export ALIYUN_ACCESS_KEY_ID=your-access-key-id
   export ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
   export ALIYUN_APPKEY=your-appkey
   python generate_tts.py

获取 AccessToken:
   curl -X POST https://nls-meta.cn-shanghai.aliyuncs.com/pop/2019-02-28/tokens \
     -H "Content-Type: application/json" \
     -d '{"access_key_id":"your-id","access_key_secret":"your-secret"}'
"""

import os
import sys
import json
import hashlib
import urllib.request
import urllib.parse
import ssl
from pathlib import Path
from typing import Optional

# ========== 阿里云配置 ==========
# 方式1: 直接使用 AccessToken (有效期24小时，可提前获取)
ACCESS_TOKEN = os.environ.get('ALIYUN_ACCESS_TOKEN', '')

# 方式2: 使用 AccessKey 自动获取 Token
ACCESS_KEY_ID = os.environ.get('ALIYUN_ACCESS_KEY_ID', '')
ACCESS_KEY_SECRET = os.environ.get('ALIYUN_ACCESS_KEY_SECRET', '')

# 必须配置
APPKEY = os.environ.get('ALIYUN_APPKEY', '')

# 阿里云 TTS 服务端点
TTS_URL = 'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts'
TOKEN_URL = 'https://nls-meta.cn-shanghai.aliyuncs.com/pop/2019-02-28/tokens'

# 语音参数配置
# 支持的发音人: xiaomei(普通话女声), jiajia(粤语女声)
VOICE_CONFIG = {
    'voice': 'jiajia',       # 默认发音人：jiajia(粤语女声)
    'format': 'mp3',         # 音频格式: mp3, wav, pcm
    'sample_rate': 16000,    # 采样率: 8000, 16000, 24000
    'volume': 50,            # 音量: 0~100
    'speech_rate': 0,        # 语速: -500~500
    'pitch_rate': 0,         # 音调: -500~500
}

# 短语列表
PHRASES = {
    'daily': [
        '我饿了，想吃饭',
        '我想喝水',
        '我想上厕所',
        '我困了，想睡觉',
        '我很冷',
        '我很热',
        '我很累',
        '请帮我一下',
        '谢谢你的帮助',
        '我不需要，谢谢'
    ],
    'medical': [
        '我不舒服',
        '我头疼',
        '我肚子疼',
        '我胸口闷',
        '我呼吸困难',
        '我头晕',
        '我想吐',
        '请叫医生',
        '我需要吃药',
        '请帮我叫救护车'
    ],
    'travel': [
        '请问怎么走',
        '我想去这个地方',
        '这是几路车',
        '我在哪站下车',
        '我迷路了',
        '请帮我报警',
        '请联系我的家人',
        '我身体不舒服，请帮帮我',
        '请问厕所在哪',
        '我需要休息'
    ],
    'emotion': [
        '我很开心',
        '我很难过',
        '我很害怕',
        '我很着急',
        '我感觉好多了',
        '我想一个人静静',
        '我想和家人说话',
        '请稍等一下',
        '我想回家',
        '我想休息'
    ],
    'emergency': [
        '我需要紧急帮助，请帮帮我',
        '救命',
        '请帮我',
        '我不舒服，请帮我'
    ],
    'shopping': [
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


class AliyunTTSClient:
    """阿里云 TTS 客户端"""

    def __init__(self, appkey: str, access_token: str = '', access_key_id: str = '', access_key_secret: str = ''):
        self.appkey = appkey
        self.access_token = access_token
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret
        self._create_ssl_context()

    def _create_ssl_context(self):
        """创建 SSL 上下文（兼容不同 Python 版本）"""
        try:
            self.ssl_context = ssl.create_default_context()
        except:
            self.ssl_context = ssl._create_unverified_context()

    def _get_token(self) -> Optional[str]:
        """
        获取访问令牌
        如果构造时已传入 access_token，则直接使用
        否则使用 AccessKey 自动获取
        文档: https://help.aliyun.com/zh/isi/developer-reference/obtain-an-access-token-1
        """
        # 如果已提供 access_token，直接使用
        if self.access_token:
            return self.access_token

        try:
            # 构造请求体
            body = {
                'access_key_id': self.access_key_id,
                'access_key_secret': self.access_key_secret
            }
            body_json = json.dumps(body).encode('utf-8')

            # 创建请求
            req = urllib.request.Request(
                TOKEN_URL,
                data=body_json,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                method='POST'
            )

            # 发送请求
            with urllib.request.urlopen(req, context=self.ssl_context, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))

                if 'token' in result and 'id' in result['token']:
                    token = result['token']['id']
                    expire_time = result['token'].get('expire_time', 'unknown')
                    print(f'[Token] 获取成功，过期时间: {expire_time}')
                    return token
                else:
                    print(f'[Token] 获取失败: {result}')
                    return None

        except urllib.error.HTTPError as e:
            print(f'[Token] HTTP 错误: {e.code}')
            try:
                error_body = e.read().decode('utf-8')
                print(f'[Token] 错误详情: {error_body}')
            except:
                pass
            return None
        except Exception as e:
            print(f'[Token] 获取失败: {e}')
            return None

    def synthesize(self, text: str, output_path: str) -> bool:
        """
        合成语音
        文档: https://help.aliyun.com/zh/isi/developer-reference/restful-api-3
        """
        # 获取 Token
        token = self._get_token()
        if not token:
            print('[错误] 无法获取访问令牌，请检查 AccessKey')
            return False

        try:
            # 构造请求参数
            params = {
                'appkey': self.appkey,
                'text': text,
                'format': VOICE_CONFIG['format'],
                'sample_rate': VOICE_CONFIG['sample_rate'],
                'voice': VOICE_CONFIG['voice'],
                'volume': VOICE_CONFIG['volume'],
                'speech_rate': VOICE_CONFIG['speech_rate'],
                'pitch_rate': VOICE_CONFIG['pitch_rate'],
            }

            # 构造请求 URL
            query_string = urllib.parse.urlencode(params)
            url = f'{TTS_URL}?{query_string}'

            # 创建请求
            req = urllib.request.Request(
                url,
                headers={
                    'Content-Type': 'application/json',
                    'X-NLS-Token': token
                },
                method='POST'
            )

            # 发送请求
            with urllib.request.urlopen(req, context=self.ssl_context, timeout=60) as response:
                content_type = response.headers.get('Content-Type', '')

                if 'application/json' in content_type:
                    # 返回了错误信息
                    error_data = json.loads(response.read().decode('utf-8'))
                    error_msg = error_data.get('error_message', '未知错误')
                    print(f'[错误] API 返回错误: {error_msg}')
                    return False
                else:
                    # 返回了音频数据
                    audio_data = response.read()

                    # 保存音频文件
                    with open(output_path, 'wb') as f:
                        f.write(audio_data)

                    file_size = len(audio_data)
                    print(f'[成功] 已生成: {os.path.basename(output_path)} ({file_size} bytes)')
                    return True

        except urllib.error.HTTPError as e:
            print(f'[错误] HTTP {e.code}: {e.reason}')
            try:
                error_body = e.read().decode('utf-8')
                error_data = json.loads(error_body)
                print(f'[错误] 详情: {error_data.get("error_message", error_body)}')
            except:
                pass
            return False
        except Exception as e:
            print(f'[错误] 生成失败: {e}')
            return False


def get_text_hash(text: str) -> str:
    """生成文本的短哈希作为文件名"""
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:8]


def check_config() -> tuple:
    """检查配置是否完整，返回 (success, use_token_mode)"""
    if not APPKEY:
        print('[错误] 未设置 ALIYUN_APPKEY 环境变量')
        return False, False

    # 方式1: 使用 AccessToken
    if ACCESS_TOKEN:
        print('[配置] 使用 AccessToken 模式')
        return True, True

    # 方式2: 使用 AccessKey
    if ACCESS_KEY_ID and ACCESS_KEY_SECRET:
        print('[配置] 使用 AccessKey 模式 (自动获取 Token)')
        return True, False

    print('[错误] 未配置鉴权信息，请使用以下方式之一:')
    print()
    print('方式1 (推荐): 使用 AccessToken')
    print('  export ALIYUN_ACCESS_TOKEN=your-access-token')
    print('  export ALIYUN_APPKEY=your-appkey')
    print()
    print('方式2: 使用 AccessKey')
    print('  export ALIYUN_ACCESS_KEY_ID=your-access-key-id')
    print('  export ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret')
    print('  export ALIYUN_APPKEY=your-appkey')
    print()
    print('获取 AccessToken 命令:')
    print('  curl -X POST https://nls-meta.cn-shanghai.aliyuncs.com/pop/2019-02-28/tokens \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"access_key_id":"your-id","access_key_secret":"your-secret"}\'')
    return False, False


def generate_all_audio(output_subdir: str = 'base', voice: str = None):
    """生成所有语音文件

    Args:
        output_subdir: 输出子目录名，默认为 'base'，后续可扩充为 'dialect' 等
        voice: 发音人，默认使用 VOICE_CONFIG['voice']
    """
    success, use_token = check_config()
    if not success:
        return

    # 设置发音人
    if voice:
        VOICE_CONFIG['voice'] = voice

    # 创建输出目录
    audio_dir = Path(__file__).parent.parent / 'assets' / 'audio' / output_subdir
    audio_dir.mkdir(parents=True, exist_ok=True)

    # 创建 TTS 客户端
    if use_token:
        client = AliyunTTSClient(APPKEY, access_token=ACCESS_TOKEN)
    else:
        client = AliyunTTSClient(APPKEY, access_key_id=ACCESS_KEY_ID, access_key_secret=ACCESS_KEY_SECRET)

    print('=' * 70)
    print('阿里云 TTS 语音生成工具')
    print('=' * 70)
    print(f'输出目录: {audio_dir}')
    print(f'发音人: {VOICE_CONFIG["voice"]}')
    print(f'格式: {VOICE_CONFIG["format"]} @ {VOICE_CONFIG["sample_rate"]}Hz')
    print('=' * 70)

    # 统计
    total = 0
    success = 0
    failed = 0
    skipped = 0

    # 音频映射表
    audio_map = {}

    for category, phrases in PHRASES.items():
        audio_map[category] = {}
        print(f'\n【{category}】')

        for phrase in phrases:
            total += 1
            # 生成文件名
            file_hash = get_text_hash(phrase)
            filename = f'{category}_{file_hash}.mp3'
            filepath = audio_dir / filename

            # 记录映射关系（包含子目录）
            audio_map[category][phrase] = f'/assets/audio/{output_subdir}/{filename}'

            # 如果文件已存在，跳过
            if filepath.exists():
                print(f'  [跳过] {filename}')
                skipped += 1
                continue

            # 生成语音
            print(f'  [生成] {phrase[:20]}...', end=' ', flush=True)
            if client.synthesize(phrase, str(filepath)):
                success += 1
            else:
                failed += 1
                print(f'  [失败] {phrase}')

    # 保存映射表（放在子目录内）
    map_file = audio_dir / 'audio_map.json'
    with open(map_file, 'w', encoding='utf-8') as f:
        json.dump(audio_map, f, ensure_ascii=False, indent=2)

    # 同时保存一份到音频根目录供小程序使用
    root_map_file = audio_dir.parent / f'audio_map_{output_subdir}.json'
    with open(root_map_file, 'w', encoding='utf-8') as f:
        json.dump(audio_map, f, ensure_ascii=False, indent=2)

    print('\n' + '=' * 70)
    print('生成完成')
    print('=' * 70)
    print(f'总计: {total} 个短语')
    print(f'成功: {success} 个')
    print(f'失败: {failed} 个')
    print(f'跳过: {skipped} 个')
    print(f'\n音频文件目录: {audio_dir}')
    print(f'映射表: {map_file}')
    print(f'映射表副本: {root_map_file}')

    if failed > 0:
        print('\n[提示] 有失败的生成任务，可以重新运行脚本重试')


def show_phrase_list():
    """显示所有短语列表及文件名"""
    print('=' * 70)
    print('短语列表')
    print('=' * 70)

    for category, phrases in PHRASES.items():
        print(f'\n【{category}】')
        for i, phrase in enumerate(phrases, 1):
            file_hash = get_text_hash(phrase)
            filename = f'{category}_{file_hash}.mp3'
            print(f'  {i:2d}. {filename}')
            print(f'      文本: {phrase}')


def test_single():
    """测试生成单个语音"""
    success, use_token = check_config()
    if not success:
        return

    test_text = '我饿了，想吃饭'
    test_category = 'daily'

    print('测试生成单个语音...')
    print(f'测试文本: {test_text}')

    audio_dir = Path(__file__).parent.parent / 'assets' / 'audio'
    audio_dir.mkdir(parents=True, exist_ok=True)

    # 创建 TTS 客户端
    if use_token:
        client = AliyunTTSClient(APPKEY, access_token=ACCESS_TOKEN)
    else:
        client = AliyunTTSClient(APPKEY, access_key_id=ACCESS_KEY_ID, access_key_secret=ACCESS_KEY_SECRET)

    file_hash = get_text_hash(test_text)
    filename = f'{test_category}_{file_hash}_test.mp3'
    filepath = audio_dir / filename

    print(f'输出文件: {filepath}')
    print('-' * 70)

    if client.synthesize(test_text, str(filepath)):
        print('-' * 70)
        print('✅ 测试成功！')
        print(f'文件已保存至: {filepath}')
    else:
        print('-' * 70)
        print('❌ 测试失败')
        print('请检查:')
        if use_token:
            print('  1. AccessToken 是否过期（有效期24小时）')
            print('  2. AccessToken 是否正确')
        else:
            print('  1. AccessKey ID 和 Secret 是否正确')
        print('  3. AppKey 是否正确')
        print('  4. 阿里云账号是否开通语音合成服务')


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description='阿里云 TTS 语音生成工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  # 显示短语列表
  python generate_tts.py --list

  # 测试生成单个语音
  python generate_tts.py --test

  # 生成所有语音（默认输出到 base 目录）
  python generate_tts.py

  # 生成到指定子目录（如方言）
  python generate_tts.py --output dialect

环境变量:
  ALIYUN_ACCESS_TOKEN       阿里云 AccessToken (推荐)
  ALIYUN_ACCESS_KEY_ID      阿里云 AccessKey ID
  ALIYUN_ACCESS_KEY_SECRET  阿里云 AccessKey Secret
  ALIYUN_APPKEY             阿里云 AppKey
        '''
    )
    parser.add_argument('--list', '-l', action='store_true', help='显示短语列表')
    parser.add_argument('--test', '-t', action='store_true', help='测试生成单个语音')
    parser.add_argument('--output', '-o', default='base', help='输出子目录名 (默认: base)')
    parser.add_argument('--voice', '-v', default=None, help='发音人: xiaomei(普通话), jiajia(粤语)')

    args = parser.parse_args()

    if args.list:
        show_phrase_list()
    elif args.test:
        test_single()
    else:
        generate_all_audio(output_subdir=args.output, voice=args.voice)
