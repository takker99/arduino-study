import Chart from 'chart.js/auto';
import type { ClientToServer, ServerToClient } from './server';


const ws = new WebSocket('/ws');

const statusElement = document.getElementById('status')!;
const connectButton = document.getElementById('connectButton')!;
const disconnectButton = document.getElementById('disconnectButton')!;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
const speedValue = document.getElementById('speedValue')!;
const potValue = document.getElementById('potValue')!;
const tempValue = document.getElementById('tempValue')!;
const lightValue = document.getElementById('lightValue')!;

let sensorChart: Chart;

// 接続状態の更新
function updateConnectionStatus(isConnected: boolean) {
  if (isConnected) {
    statusElement.textContent = '接続中';
    statusElement.style.color = '#2ecc71';
    connectButton.setAttribute('disabled', 'true');
    disconnectButton.removeAttribute('disabled');
    speedSlider.removeAttribute('disabled');
  } else {
    statusElement.textContent = '未接続';
    statusElement.style.color = '#e74c3c';
    connectButton.removeAttribute('disabled');
    disconnectButton.setAttribute('disabled', 'true');
    speedSlider.setAttribute('disabled', 'true');
    speedSlider.value = '0';
    speedValue.textContent = '0';
  }
}

// センサー値の更新
function updateSensorValue(element: HTMLElement, value: string, unit: string) {
  if (element) {
    element.textContent = `${value} ${unit}`;
  }
}

// チャートの初期化
function initializeChart() {
  const canvas = document.getElementById('sensorChart') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  sensorChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'ポテンショメータ',
          data: [],
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          fill: true,
          yAxisID: 'y',
        },
        {
          label: '温度 (°C)',
          data: [],
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          fill: true,
          yAxisID: 'y1',
        },
        {
          label: '光センサー',
          data: [],
          borderColor: '#f1c40f',
          backgroundColor: 'rgba(241, 196, 15, 0.1)',
          fill: true,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Time (s)',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Value',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Temperature (°C)',
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });
}

// チャートの更新
function updateChart(data: { pot: number; temp: number; light: number }) {
  if (!sensorChart || !sensorChart.data.labels) return;

  const time = new Date().toLocaleTimeString();
  (sensorChart.data.labels as string[]).push(time);
  sensorChart.data.datasets[0].data.push(data.pot);
  sensorChart.data.datasets[1].data.push(data.temp);
  sensorChart.data.datasets[2].data.push(data.light);

  // データを100件に制限
  if ((sensorChart.data.labels as string[]).length > 100) {
    (sensorChart.data.labels as string[]).shift();
    sensorChart.data.datasets.forEach((dataset) => {
      dataset.data.shift();
    });
  }
  sensorChart.update();
}


// WebSocket接続・切断・速度送信
connectButton.addEventListener('click', () => {
  if (ws.readyState !== WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'connect' } satisfies ClientToServer));
  }
});

disconnectButton.addEventListener('click', () => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'disconnect' } satisfies ClientToServer));
  }
});

speedSlider.addEventListener('input', (event) => {
  const speed = (event.target as HTMLInputElement).value;
  speedValue.textContent = speed;
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'motorSpeed', speed: Number(speed) } satisfies ClientToServer));
  }
});

// WebSocketイベント
ws.addEventListener('open', () => {
  console.log('WebSocket connected');
});

ws.addEventListener('close', () => {
  console.log('WebSocket disconnected');
  updateConnectionStatus(false);
});

ws.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
  alert('WebSocketエラーが発生しました');
  updateConnectionStatus(false);
});

ws.addEventListener('message', (event) => {
  let data: ServerToClient;
  try {
    data = JSON.parse(event.data);
  } catch (e) {
    console.error('Invalid message:', event.data);
    return;
  }
  if (data.type === 'status') {
    updateConnectionStatus(data.connected);
  } else if (data.type === 'sensor') {
    updateSensorValue(potValue, String(data.pot), '');
    updateSensorValue(tempValue, String(data.temp), '°C');
    updateSensorValue(lightValue, String(data.light), '');
    updateChart({ pot: data.pot, temp: data.temp, light: data.light });
  } else if (data.type === 'error') {
    alert(`サーバーエラー: ${data.message}`);
    updateConnectionStatus(false);
  }
});

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  updateConnectionStatus(false);
  initializeChart();
});
