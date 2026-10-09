// 综合静态与一致性校验：
// A. 音频映射 vs 磁盘文件（base/cantonese 两套）
// B. 全部场景短语的语音覆盖核对（运行时真实数据，验证"无语音"标注假设）
// C. WXML 标签闭合、事件处理器存在、数据绑定字段可达
// D. WXSS 花括号平衡、class 引用可达
// E. app.json 页面四件套存在
// F. ES5 兼容扫描
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var failures = [];
function assert(cond, msg) {
  if (cond) { console.log('PASS:', msg); }
  else { failures.push(msg); console.log('FAIL:', msg); }
}

// ---- 公共 mock：加载 audio_manager 与页面（与冒烟测试同环境）----
global.wx = {
  canIUse: function() { return true; },
  getStorageSync: function(key) {
    if (key === 'favoritePhrases') return [];
    if (key === 'customPhrases_v2') return [];
    if (key === 'userSettings_v2') return {};
    return [];
  },
  setStorageSync: function() {},
  createInnerAudioContext: function() {
    return { src: '', playbackRate: 1, play: function() {}, stop: function() {} };
  },
  vibrateShort: function() {},
  showActionSheet: function() {},
  showModal: function() {},
  setNavigationBarColor: function() {}
};
var appGlobalData = null;
global.App = function(opts) { appGlobalData = opts; };
require(path.join(ROOT, 'app.js'));
appGlobalData.onLaunch();
var pageInstance = null;
global.Page = function(opts) { pageInstance = opts; };
global.getApp = function() { return appGlobalData; };
require(path.join(ROOT, 'pages', 'index', 'index.js'));
pageInstance.setData = function(patch) { for (var k in patch) pageInstance.data[k] = patch[k]; };
pageInstance.showToast = function() {};
pageInstance.data.toastTimer = null;
pageInstance.onLoad();

var audioManager = require(path.join(ROOT, 'utils', 'audio_manager.js'));
var AUDIO_MAP = audioManager.AUDIO_MAP;

// ==== A. 音频文件完整性 ====
var missing = [];
for (var cat in AUDIO_MAP) {
  for (var text in AUDIO_MAP[cat]) {
    var baseRel = AUDIO_MAP[cat][text];
    if (baseRel.indexOf('/assets/audio/base/') === -1) continue;
    var baseFile = path.join(ROOT, baseRel.replace(/^\//, ''));
    var canFile = baseFile.replace('/base/', '/cantonese/');
    if (!fs.existsSync(baseFile)) missing.push('普通话: ' + baseRel);
    if (!fs.existsSync(canFile)) missing.push('粤语: ' + baseRel.replace('/base/', '/cantonese/'));
  }
}
assert(missing.length === 0, '音频映射表所有条目在 base/cantonese 目录均有文件' + (missing.length ? '，缺失: ' + missing.join('; ') : ''));

// ==== B. 场景短语语音覆盖（运行时真实数据）====
var expectedNoVoice = ['帮我翻身', '我痒', '给我纸和笔', '帮我开灯', '帮我关灯'];
var wrong = [];
var tabKeys = ['daily', 'emergency', 'medical', 'shopping', 'travel', 'emotion'];
for (var t = 0; t < tabKeys.length; t++) {
  pageInstance.updateCurrentScene(tabKeys[t]);
  var phrases = pageInstance.data.currentPhrases;
  for (var i = 0; i < phrases.length; i++) {
    var p = phrases[i];
    var expectNone = expectedNoVoice.indexOf(p.text) !== -1;
    if (expectNone && p.hasVoice !== false) wrong.push('应为无语音却有: ' + p.text);
    if (!expectNone && p.hasVoice !== true) wrong.push('应有语音却缺失: ' + p.text);
  }
}
assert(wrong.length === 0, '全部场景短语语音覆盖与"无语音"标注一致（异常: ' + (wrong.join('; ') || '无') + '）');

// ==== C. WXML 校验 ====
var wxml = fs.readFileSync(path.join(ROOT, 'pages', 'index', 'index.wxml'), 'utf8');
var jsSrc = fs.readFileSync(path.join(ROOT, 'pages', 'index', 'index.js'), 'utf8');

// C1. 标签闭合（栈匹配）
var tags = wxml.match(/<\/?[a-z][a-z0-9-]*(?:\s[^>]*)?\/?>/gi) || [];
var stack = [];
var tagErr = null;
for (var k = 0; k < tags.length; k++) {
  var tg = tags[k];
  var name = tg.match(/^<\/?([a-z][a-z0-9-]*)/i)[1];
  if (/\/>$/.test(tg)) continue;
  if (/^<\//.test(tg)) {
    if (stack.pop() !== name) { tagErr = '闭合不匹配: ' + tg; break; }
  } else {
    stack.push(name);
  }
}
if (!tagErr && stack.length > 0) tagErr = '未闭合标签: ' + stack.join(',');
assert(tagErr === null, 'WXML 标签全部正确闭合' + (tagErr ? '，' + tagErr : ''));

// C2. wx:else 必须紧跟 wx:if/wx:elif
var elseOk = true;
var elseRe = /wx:else/g;
var m;
while ((m = elseRe.exec(wxml)) !== null) {
  var before = wxml.slice(0, m.index);
  var lastTagClose = before.lastIndexOf('>');
  var prevSeg = before.slice(Math.max(0, lastTagClose - 400), lastTagClose + 1);
  if (!/wx:(if|elif)/.test(prevSeg)) { elseOk = false; break; }
}
assert(elseOk, 'wx:else 均紧跟 wx:if/wx:elif');

// C3. 事件处理器存在
var handlers = wxml.match(/(?:bind|catch)[a-z]+="([^"]+)"/g) || [];
var missingHandlers = [];
for (var h = 0; h < handlers.length; h++) {
  var fn = handlers[h].match(/="([^"]+)"/)[1];
  if (!new RegExp(fn + '\\s*:\\s*function').test(jsSrc)) missingHandlers.push(fn);
}
assert(missingHandlers.length === 0, 'WXML 所有事件处理器在 Page 中定义（缺失: ' + (missingHandlers.join(',') || '无') + '）');

// C4. 数据绑定字段可达：{{expr}} 的裸顶层标识符 ∈ data 键 ∪ setData 键
var dataKeys = new Set(Object.keys(pageInstance.data));
var setDataRe = /setData\(\s*\{([^}]+)\}/g;
var sdm;
while ((sdm = setDataRe.exec(jsSrc)) !== null) {
  var keys = sdm[1].match(/^\s*([A-Za-z_$][\w$]*)\s*[:,]/gm) || [];
  for (var q = 0; q < keys.length; q++) dataKeys.add(keys[q].trim().replace(/[:,]/, ''));
}
var binds = wxml.match(/\{\{([^}]+)\}\}/g) || [];
var missingBinds = new Set();
for (var b = 0; b < binds.length; b++) {
  var expr = binds[b].slice(2, -2);
  // 去掉字符串字面量，避免把引号内容当字段
  expr = expr.replace(/'[^']*'/g, '');
  var idents = expr.match(/[A-Za-z_$][\w$]*/g) || [];
  for (var f = 0; f < idents.length; f++) {
    var id = idents[f];
    // 跳过：循环变量及其属性访问（item.xxx / 前一个 token 后跟 .）、字面量
    var afterDot = new RegExp(id + '\\s*\\.').test(expr);
    var beforeDot = new RegExp('\\.\\s*' + id + '\\b').test(expr);
    if (['item', 'index', 'true', 'false', 'length', 'BASE'].indexOf(id) !== -1) continue;
    if (beforeDot) continue;              // 属性访问，如 item.text 的 text
    if (afterDot && expr.indexOf(id) !== expr.lastIndexOf(id)) continue; // dataKeys 自身也作对象用时误判兜底
    if (!dataKeys.has(id)) missingBinds.add(id);
  }
}
assert(missingBinds.size === 0, 'WXML 数据绑定字段全部可达（未知: ' + (Array.from(missingBinds).join(',') || '无') + '）');

// ==== D. WXSS 校验 ====
var wxss = fs.readFileSync(path.join(ROOT, 'pages', 'index', 'index.wxss'), 'utf8');
var open = (wxss.match(/\{/g) || []).length;
var close = (wxss.match(/\}/g) || []).length;
assert(open === close, 'WXSS 花括号平衡（{ ' + open + ' 个，} ' + close + ' 个）');

// class 定义均被引用（WXML、JS 动态类名、或动态前缀拼接）
var dynamicPrefixes = ['font-', 'high-contrast'];
var dynamicNames = ['active', 'show', 'emergency-tab', 'contrast-toggle', 'recent-card', 'settings-tab'];
var classDefs = wxss.match(/\.([a-z][a-z0-9-]+)/g) || [];
var unused = new Set();
for (var c = 0; c < classDefs.length; c++) {
  var cls = classDefs[c].slice(1);
  var referenced = wxml.indexOf(cls) !== -1 || jsSrc.indexOf(cls) !== -1 || dynamicNames.indexOf(cls) !== -1;
  if (!referenced) {
    for (var dp = 0; dp < dynamicPrefixes.length; dp++) {
      if (cls.indexOf(dynamicPrefixes[dp]) === 0) { referenced = true; break; }
    }
  }
  if (!referenced) unused.add(cls);
}
assert(unused.size === 0, 'WXSS 无未使用的 class（未引用: ' + (Array.from(unused).join(',') || '无') + '）');

// ==== E. app.json 页面四件套 ====
var appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
var pageFilesOk = true;
for (var pg = 0; pg < appJson.pages.length; pg++) {
  var basep = path.join(ROOT, appJson.pages[pg]);
  ['js', 'wxml', 'wxss', 'json'].forEach(function(ext) {
    if (!fs.existsSync(basep + '.' + ext)) { pageFilesOk = false; console.log('  缺失:', basep + '.' + ext); }
  });
}
assert(pageFilesOk, 'app.json 声明页面的 js/wxml/wxss/json 四件套齐全');

// ==== F. ES5 兼容扫描 ====
var es5Files = ['pages/index/index.js', 'app.js', 'utils/audio_manager.js'];
var es5Issues = [];
es5Files.forEach(function(rel) {
  var s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  s.split('\n').forEach(function(line, idx) {
    var noStr = line.replace(/'[^']*'|"[^"]*"|\/\/.*$/g, '');
    if (/\bconst\b|\blet\b|=>|\`/.test(noStr)) es5Issues.push(rel + ':' + (idx + 1));
  });
});
assert(es5Issues.length === 0, '核心 JS 全部 ES5 语法（问题行: ' + (es5Issues.join(', ') || '无') + '）');

console.log(failures.length === 0 ? '\n静态校验全部通过' : '\n' + failures.length + ' 项失败');
process.exit(failures.length === 0 ? 0 : 1);
