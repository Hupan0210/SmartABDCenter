// backend/server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const WebSocket = require('ws');

const app = express();
const port = 3000;
const adbPath = 'C:\\platform-tools\\scrcpy-win64-v3.2\\adb.exe';

// 创建日志目录
const logDir = path.join(__dirname, '../log');
const logFile = path.join(logDir, 'adb_log.txt');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// 写入日志函数
function writeLog(content) {
  const timestamp = new Date().toLocaleString();
  fs.appendFileSync(logFile, `[${timestamp}] ${content}\n`);
}

// 设置上传目录
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// 提供前端静态资源
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

// 获取本机局域网 IP
app.get('/api/ip', (req, res) => {
  const interfaces = os.networkInterfaces();
  let ip = '无法获取IP';
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
        break;
      }
    }
  }
  res.json({ ip });
});

// 扫描局域网设备
app.get('/api/scan', (req, res) => {
  exec('arp -a', (err, stdout) => {
    if (err) return res.status(500).json({ error: '扫描失败' });
    const seen = new Set();
    const lines = stdout.split('\n').filter(line => line.includes('.') && !line.includes('接口'));
    const devices = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return parts[0];
    }).filter(ip => {
      if (seen.has(ip)) return false;
      seen.add(ip);
      return true;
    }).map(ip => ({ ip, name: '未知设备', model: '未知型号' }));
    res.json({ devices });
  });
});

// 获取 ADB 已连接设备列表
app.get('/api/adbDevices', (req, res) => {
  exec(`"${adbPath}" devices`, (err, stdout) => {
    if (err) return res.status(500).json({ error: '获取失败' });
    const devices = stdout.split('\n')
      .filter(line => line.includes('device') && !line.includes('List'))
      .map(line => ({ serial: line.trim().split(/\s+/)[0] }));
    res.json({ adbDevices: devices });
  });
});

// ADB 连接设备
app.get('/api/adbConnect', (req, res) => {
  const device = req.query.device;
  if (!device) return res.status(400).json({ error: '缺少 device 参数' });
  exec(`"${adbPath}" connect ${device}`, (err, stdout) => {
    const msg = stdout.trim();
    writeLog(`[CONNECT] ${device} => ${msg}`);
    res.json({ message: msg });
  });
});

// 获取设备品牌型号信息
app.get('/api/deviceInfo', (req, res) => {
  const device = req.query.device;
  if (!device) return res.status(400).json({ error: '缺少 device 参数' });

  exec(`"${adbPath}" -s ${device} shell getprop`, (err, stdout) => {
    if (err) return res.status(500).json({ error: '获取失败' });
    const brand = (stdout.match(/\[ro.product.brand]: \[(.*?)\]/) || [])[1] || '未知';
    const model = (stdout.match(/\[ro.product.model]: \[(.*?)\]/) || [])[1] || '未知';
    res.json({ brand, model });
  });
});

// 模拟遥控器按键
app.get('/api/control', (req, res) => {
  const key = req.query.key;
  const device = req.query.device;
  const keyMap = {
    '确认': 66, '返回': 4, '音量加': 24, '音量减': 25,
    '频道加': 166, '频道减': 167,
    '0': 7, '1': 8, '2': 9, '3': 10, '4': 11,
    '5': 12, '6': 13, '7': 14, '8': 15, '9': 16
  };
  const keycode = keyMap[key];
  if (!keycode) return res.status(400).json({ error: '无效按键' });
  const cmd = `"${adbPath}" ${device ? `-s ${device}` : ''} shell input keyevent ${keycode}`;
  exec(cmd, () => {
    writeLog(`[KEY] ${device || '默认'} => ${key} (${keycode})`);
    res.json({ message: '发送成功' });
  });
});

// 上传文件（APK）
app.post('/api/upload', upload.single('file'), (req, res) => {
  writeLog(`[UPLOAD] 文件上传: ${req.file.path}`);
  res.json({ message: '上传成功', filePath: req.file.path });
});

// 安装 APK
app.post('/api/installApk', (req, res) => {
  const apkPath = req.body.apkPath;
  exec(`"${adbPath}" install "${apkPath}"`, (err, stdout) => {
    writeLog(`[INSTALL] ${apkPath}`);
    res.json({ message: stdout.trim() });
  });
});

// 卸载 APK
app.post('/api/uninstallApk', (req, res) => {
  const pkg = req.body.packageName;
  exec(`"${adbPath}" uninstall ${pkg}`, (err, stdout) => {
    writeLog(`[UNINSTALL] ${pkg}`);
    res.json({ message: stdout.trim() });
  });
});

// 剪贴板功能
app.post('/api/clipboard', (req, res) => {
  const text = req.body.text;
  const tmpFile = path.join(__dirname, 'clipboard.txt');
  fs.writeFileSync(tmpFile, text);
  exec(`"${adbPath}" push "${tmpFile}" /sdcard/clipboard.txt`, () => {
    writeLog(`[CLIPBOARD] 推送文本内容`);
    res.json({ message: '已复制到设备 /sdcard/clipboard.txt' });
  });
});

// 截图接口（用于展示设备画面）
app.get('/api/monitor', (req, res) => {
  const tmp = path.join(__dirname, 'screen.png');
  exec(`"${adbPath}" exec-out screencap -p > "${tmp}"`, err => {
    if (err) return res.status(500).json({ error: '截图失败' });
    fs.readFile(tmp, { encoding: 'base64' }, (e, data) => {
      if (e) return res.status(500).json({ error: '读取失败' });
      res.json({ image: data });
    });
  });
});

// 清空日志内容
app.post('/api/clearLog', (req, res) => {
  fs.writeFile(logFile, '', err => {
    if (err) return res.status(500).json({ error: '清空失败' });
    res.json({ message: '日志已清空' });
  });
});

// 读取日志内容
app.get('/api/getLog', (req, res) => {
  fs.readFile(logFile, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取失败' });
    res.json({ log: data });
  });
});

// 启动 HTTP 服务
const server = app.listen(port, () => {
  console.log(`后端服务已启动： http://localhost:${port}`);
});

// ================ WebSocket ================

// ADB 实时控制台终端 WebSocket
const wss = new WebSocket.Server({ server, path: '/ws/shell' });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const device = url.searchParams.get('device');
  if (!device) return ws.close();

  const shell = spawn(adbPath, ['-s', device, 'shell']);
  shell.stdout.on('data', data => ws.send(data.toString()));
  shell.stderr.on('data', data => ws.send(`错误: ${data.toString()}`));
  ws.on('message', msg => shell.stdin.write(msg + '\n'));
  ws.on('close', () => shell.kill());
});

// 实时屏幕截图 WebSocket 推送
const screenWSS = new WebSocket.Server({ server, path: '/ws/stream' });
screenWSS.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const device = url.searchParams.get('device');
  if (!device) return ws.close();

  const interval = setInterval(() => {
    exec(`"${adbPath}" -s ${device} exec-out screencap -p`, { encoding: 'buffer', maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
      if (!err) {
        ws.send(Buffer.concat([Buffer.from('--frame\r\nContent-Type: image/png\r\n\r\n'), stdout]));
      }
    });
  }, 1000);

  ws.on('close', () => clearInterval(interval));
});

// 🧹 清空所有缓存文件（上传、截图、剪贴板、日志）
app.post('/api/clearCacheAll', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  const tempFiles = ['clipboard.txt', 'screen.png'];

  // 删除临时文件
  tempFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      writeLog(`[CLEAN] 已删除临时文件: ${file}`);
    }
  });

  // 清空上传目录
  if (fs.existsSync(uploadDir)) {
    fs.readdirSync(uploadDir).forEach(f => {
      const filePath = path.join(uploadDir, f);
      fs.unlinkSync(filePath);
      writeLog(`[CLEAN] 清除上传文件: ${f}`);
    });
  }

  // 清空日志
  fs.writeFileSync(logFile, '');
  writeLog(`[CLEAN] adb_log.txt 已清空`);

  res.json({ message: '✅ 所有缓存和日志已成功清理' });
});
