let currentDeviceIp = ''; // 当前已连接设备IP（全局）

document.addEventListener('DOMContentLoaded', function () {
  getLocalIP();

  // 绑定按钮事件
  document.getElementById('scanBtn').addEventListener('click', scanLANDevices);
  document.getElementById('getAdbDevicesBtn').addEventListener('click', getAdbDevices);
  document.getElementById('manualAdbBtn').addEventListener('click', () => {
    const ip = document.getElementById('manualAdbIp').value.trim();
    if (!ip) return alert('请输入设备IP地址');
    adbConnect(ip);
  });

  document.querySelectorAll('.ctrl-btn').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-key');
      sendControlCommand(key);
    });
  });

  document.getElementById('uploadBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('fileUpload');
    if (fileInput.files.length === 0) return alert('请选择要上传的文件');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    fetch('/api/upload', {
      method: 'POST',
      body: formData
    }).then(res => res.json())
      .then(data => alert(data.message))
      .catch(() => alert('上传失败'));
  });

  document.getElementById('uninstallBtn').addEventListener('click', () => {
    const packageName = document.getElementById('packageName').value.trim();
    if (!packageName) return alert('请输入要卸载的包名');
    fetch('/api/uninstallApk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageName })
    }).then(res => res.json())
      .then(data => alert(data.message))
      .catch(() => alert('卸载失败'));
  });

  document.getElementById('clipboardBtn').addEventListener('click', () => {
    const text = document.getElementById('clipboardText').value.trim();
    if (!text) return alert('请输入要复制的内容');
    fetch('/api/clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }).then(res => res.json())
      .then(data => alert(data.message))
      .catch(() => alert('复制剪贴板失败'));
  });

  document.getElementById('monitorToggleBtn').addEventListener('click', () => {
    const monitor = document.getElementById('monitorScreen');
    if (monitor.style.display === 'none') {
      monitor.style.display = 'block';
      getMonitorImage();
    } else {
      monitor.style.display = 'none';
    }
  });
});

// ========== 功能函数 ==========

// 显示本机局域网IP
function getLocalIP() {
  fetch('/api/ip')
    .then(res => res.json())
    .then(data => {
      document.getElementById('ipAddress').innerText = data.ip;
    })
    .catch(() => {
      document.getElementById('ipAddress').innerText = '获取失败';
    });
}

// 扫描局域网设备
function scanLANDevices() {
  fetch('/api/scan')
    .then(res => res.json())
    .then(data => {
      const deviceList = document.getElementById('deviceList');
      deviceList.innerHTML = '';
      data.devices.forEach(device => {
        const div = document.createElement('div');
        div.innerText = `IP: ${device.ip}, 名称: ${device.name}, 型号: ${device.model}`;
        deviceList.appendChild(div);
      });
    })
    .catch(() => alert('扫描失败'));
}

// 获取 ADB 设备列表
function getAdbDevices() {
  fetch('/api/adbDevices')
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('adbDeviceList');
      list.innerHTML = '';
      data.adbDevices.forEach(device => {
        const div = document.createElement('div');
        div.innerText = `设备: ${device.serial} `;
        const btn = document.createElement('button');
        btn.innerText = '连接';
        btn.addEventListener('click', () => {
          adbConnect(device.serial);
        });
        div.appendChild(btn);
        list.appendChild(div);
      });
    })
    .catch(() => alert('获取ADB设备失败'));
}

// 连接ADB设备
function adbConnect(deviceIdentifier) {
  fetch(`/api/adbConnect?device=${encodeURIComponent(deviceIdentifier)}`)
    .then(res => res.json())
    .then(data => {
      if (data.message.includes('already connected')) {
        alert(`设备已连接：${deviceIdentifier}`);
      } else if (data.message.includes('connected to')) {
        alert(`连接成功：${deviceIdentifier}`);
      } else {
        alert(data.message);
      }

      // ✅ 设置当前设备
      currentDeviceIp = deviceIdentifier;
      document.getElementById('currentDeviceIp').innerText = deviceIdentifier;

      // ✅ 自动填入相关输入框
      ['controlDevice', 'consoleDeviceIp', 'monitorDeviceIp'].forEach(id => {
        const input = document.getElementById(id);
        if (input && !input.value) input.value = deviceIdentifier;
      });
    })
    .catch(() => alert('ADB 连接失败，请检查设备状态'));
}

// 发送遥控指令
function sendControlCommand(key) {
  const device = document.getElementById('controlDevice').value.trim() || currentDeviceIp;
  if (!device) return alert('未指定控制设备');

  fetch(`/api/control?key=${encodeURIComponent(key)}&device=${encodeURIComponent(device)}`)
    .then(res => res.json())
    .then(data => console.log(data.message))
    .catch(() => alert('遥控失败'));
}

// 获取截图（每5秒刷新）
function getMonitorImage() {
  fetch('/api/monitor')
    .then(res => res.json())
    .then(data => {
      document.getElementById('screenImg').src = `data:image/png;base64,${data.image}`;
      setTimeout(getMonitorImage, 5000);
    })
    .catch(() => console.error('截图失败'));
}

// WebSocket 控制台交互
let wsConsole = null;
function startConsole() {
  const deviceIp = document.getElementById('consoleDeviceIp').value.trim() || currentDeviceIp;
  if (!deviceIp) return alert('请输入设备 IP');

  const output = document.getElementById('terminalOutput');
  output.innerText = '';
  if (wsConsole) wsConsole.close();

  wsConsole = new WebSocket(`ws://localhost:3000/ws/shell?device=${encodeURIComponent(deviceIp)}`);
  wsConsole.onmessage = e => {
    output.innerText += e.data;
    output.scrollTop = output.scrollHeight;
  };
  wsConsole.onclose = () => output.innerText += '\n[终端连接已关闭]';
  wsConsole.onerror = () => output.innerText += '\n[连接错误]';
}

function sendCommand() {
  const cmd = document.getElementById('terminalInput').value.trim();
  if (cmd && wsConsole && wsConsole.readyState === WebSocket.OPEN) {
    wsConsole.send(cmd);
    document.getElementById('terminalInput').value = '';
  }
}

// WebSocket 监控画面推流
function startMonitor() {
  const deviceIp = document.getElementById('monitorDeviceIp').value.trim() || currentDeviceIp;
  if (!deviceIp) return alert('请输入设备 IP');
  stopMonitor();
  document.getElementById('monitorStream').src = `http://localhost:3000/ws/stream?device=${encodeURIComponent(deviceIp)}`;
}
function stopMonitor() {
  document.getElementById('monitorStream').src = '';
}

// 日志操作
function clearLogs() {
  if (!confirm('确认清空日志？')) return;
  fetch('/api/clearLog', { method: 'POST' })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(() => alert('日志清空失败'));
}

function viewLogs() {
  fetch('/api/getLog')
    .then(res => res.json())
    .then(data => {
      const box = document.getElementById('logViewer');
      box.innerText = data.log || '（当前日志为空）';
      box.scrollTop = box.scrollHeight;
    })
    .catch(() => alert('日志加载失败'));
}

function clearAllCache() {
  if (!confirm('⚠️ 你确定要清理所有缓存和日志吗？此操作不可恢复')) return;
  fetch('/api/clearCacheAll', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      viewLogs(); // 清理后刷新日志显示
    })
    .catch(() => {
      alert('清理失败，请检查后端状态');
    });
}
