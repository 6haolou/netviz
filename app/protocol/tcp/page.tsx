"use client";

import React, { useState, useEffect, useRef } from 'react';
import Emoji from '@/components/Emoji';

interface Packet {
  type: string;
  from: number;
  to: number;
  progress: number;
  delay: number;
  startTime: number;
  active: boolean;
  completed: boolean;
  size: number;
}

interface StepInfo {
  phase: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  packets: { from: number; to: number; type: string; delay: number }[];
  clientState: string;
  serverState: string;
}

export default function TCPPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [packetLogs, setPacketLogs] = useState<{ type: string; from: string; to: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode !== null) {
        setIsDarkMode(savedMode === 'true');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
      }
    }
  }, []);

  const steps: StepInfo[] = [
    {
      phase: '初始状态',
      icon: <Emoji label="📍" />,
      title: '连接关闭状态',
      description: 'TCP 连接尚未建立。客户端处于 CLOSED 状态，服务端已经启动并处于 LISTEN 状态，等待客户端的连接请求。此时双方还未开始任何通信。',
      clientState: 'CLOSED',
      serverState: 'LISTEN',
      packets: [],
    },
    {
      phase: '第一次握手',
      icon: <Emoji label="🤝" />,
      title: 'SYN 同步请求',
      description: '客户端发送 SYN 报文（seq=x），请求建立连接。客户端随机选择初始序列号（ISN），进入 SYN_SENT 状态，等待服务端确认。',
      clientState: 'SYN_SENT',
      serverState: 'LISTEN',
      packets: [{ from: 0, to: 1, type: 'SYN', delay: 0 }],
    },
    {
      phase: '第二次握手',
      icon: <Emoji label="🤝" />,
      title: 'SYN-ACK 同步确认',
      description: '服务端收到 SYN 报文后，发送 SYN-ACK 报文（seq=y, ack=x+1）。服务端确认客户端的 SYN，同时发送自己的 SYN，进入 SYN_RCVD 状态。',
      clientState: 'SYN_SENT',
      serverState: 'SYN_RCVD',
      packets: [{ from: 1, to: 0, type: 'SYN-ACK', delay: 0 }],
    },
    {
      phase: '第三次握手',
      icon: <Emoji label="🤝" />,
      title: 'ACK 确认完成',
      description: '客户端收到 SYN-ACK 后，发送 ACK 报文（seq=x+1, ack=y+1）。客户端进入 ESTABLISHED 状态，服务端收到 ACK 后也进入 ESTABLISHED 状态，连接建立完成。',
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      packets: [{ from: 0, to: 1, type: 'ACK', delay: 0 }],
    },
    {
      phase: '数据传输',
      icon: <Emoji label="📦" />,
      title: '数据传输阶段',
      description: '三次握手完成，TCP 连接成功建立！双方进入 ESTABLISHED 状态，开始全双工数据传输。数据被封装在 TCP 段中，通过序列号保证有序传输，通过确认号实现可靠传输。',
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      packets: [
        { from: 0, to: 1, type: 'PSH-ACK', delay: 0 },
        { from: 1, to: 0, type: 'PSH-ACK', delay: 500 },
      ],
    },
    {
      phase: '第一次挥手',
      icon: <Emoji label="👋" />,
      title: 'FIN 关闭请求',
      description: '客户端发送 FIN 报文（seq=u），表示数据发送完毕，请求关闭连接。客户端进入 FIN_WAIT_1 状态，不再发送数据，但可以继续接收数据。',
      clientState: 'FIN_WAIT_1',
      serverState: 'ESTABLISHED',
      packets: [{ from: 0, to: 1, type: 'FIN', delay: 0 }],
    },
    {
      phase: '第二次挥手',
      icon: <Emoji label="👋" />,
      title: 'ACK 确认关闭',
      description: '服务端收到 FIN 后，发送 ACK 报文（ack=u+1）。服务端进入 CLOSE_WAIT 状态，客户端收到后进入 FIN_WAIT_2 状态。服务端此时还可以发送剩余数据。',
      clientState: 'FIN_WAIT_2',
      serverState: 'CLOSE_WAIT',
      packets: [{ from: 1, to: 0, type: 'ACK', delay: 0 }],
    },
    {
      phase: '第三次挥手',
      icon: <Emoji label="👋" />,
      title: 'FIN 关闭响应',
      description: '服务端数据发送完毕后，发送 FIN 报文（seq=v）。服务端进入 LAST_ACK 状态，等待客户端的最终确认。此时服务端不再发送任何数据。',
      clientState: 'FIN_WAIT_2',
      serverState: 'LAST_ACK',
      packets: [{ from: 1, to: 0, type: 'FIN', delay: 0 }],
    },
    {
      phase: '第四次挥手',
      icon: <Emoji label="👋" />,
      title: 'ACK 最终确认',
      description: '客户端收到 FIN 后，发送 ACK 报文（ack=v+1）。客户端进入 TIME_WAIT 状态（等待 2MSL），服务端收到后进入 CLOSED 状态。2MSL 后客户端也进入 CLOSED 状态。',
      clientState: 'TIME_WAIT',
      serverState: 'CLOSED',
      packets: [{ from: 0, to: 1, type: 'ACK', delay: 0 }],
    },
    {
      phase: '连接关闭',
      icon: <Emoji label="✅" />,
      title: 'TCP 连接关闭完成',
      description: '四次挥手完成，TCP 连接完全关闭！经过 2MSL（最大段生存期）等待后，客户端也从 TIME_WAIT 进入 CLOSED 状态。所有资源已释放。',
      clientState: 'CLOSED',
      serverState: 'CLOSED',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'SYN': { start: '#3b82f6', end: '#2563eb' },
    'SYN-ACK': { start: '#8b5cf6', end: '#7c3aed' },
    'ACK': { start: '#10b981', end: '#059669' },
    'PSH-ACK': { start: '#f59e0b', end: '#d97706' },
    'FIN': { start: '#ef4444', end: '#dc2626' },
  };

  const stateColors: Record<string, string> = {
    'CLOSED': '#64748b',
    'LISTEN': '#3b82f6',
    'SYN_SENT': '#8b5cf6',
    'SYN_RCVD': '#a855f7',
    'ESTABLISHED': '#22c55e',
    'FIN_WAIT_1': '#f59e0b',
    'FIN_WAIT_2': '#f97316',
    'CLOSE_WAIT': '#eab308',
    'LAST_ACK': '#ec4899',
    'TIME_WAIT': '#14b8a6',
  };

  const flagColors: Record<string, { bg: string; text: string; desc: string }> = {
    'SYN': { bg: '#3b82f6', text: '#ffffff', desc: '同步标志，建立连接时使用' },
    'ACK': { bg: '#10b981', text: '#ffffff', desc: '确认标志，确认收到数据' },
    'FIN': { bg: '#ef4444', text: '#ffffff', desc: '结束标志，关闭连接时使用' },
    'RST': { bg: '#f59e0b', text: '#ffffff', desc: '重置标志，异常断开连接' },
    'PSH': { bg: '#8b5cf6', text: '#ffffff', desc: '推送标志，立即交付上层' },
    'URG': { bg: '#ec4899', text: '#ffffff', desc: '紧急标志，紧急指针有效' },
  };

  useEffect(() => {
    const step = steps[currentStep];
    if (step.packets.length === 0) {
      setPackets([]);
      setPacketLogs([]);
      return;
    }

    const newPackets: Packet[] = step.packets.map((p) => ({
      type: p.type,
      from: p.from,
      to: p.to,
      progress: 0,
      delay: p.delay,
      startTime: Date.now() + p.delay,
      active: false,
      completed: false,
      size: 0,
    }));

    setPackets(newPackets);
    setPacketLogs(step.packets.map((p) => {
      const labels = ['客户端', '服务端'];
      return { type: p.type, from: labels[p.from], to: labels[p.to] };
    }));
  }, [currentStep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context = ctx;
    const canvasEl = canvas;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvasEl.width = container.clientWidth * window.devicePixelRatio;
      canvasEl.height = container.clientHeight * window.devicePixelRatio;
      context.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastTime = 0;
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      timeRef.current += deltaTime * 0.001;

      const width = canvasEl.width / (window.devicePixelRatio || 1);
      const height = canvasEl.height / (window.devicePixelRatio || 1);
      const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff';
      const secondaryText = isDarkMode ? '#9ca3af' : '#6b7280';
      const primaryBlue = '#3b82f6';

      context.fillStyle = bgColor;
      context.fillRect(0, 0, width, height);

      if (!isDarkMode) {
        for (let i = 0; i < 30; i++) {
          const x = (Math.sin(timeRef.current * 0.2 + i * 0.5) * 0.5 + 0.5) * width;
          const y = (Math.cos(timeRef.current * 0.15 + i * 0.7) * 0.5 + 0.5) * height;
          const alpha = Math.sin(timeRef.current * 0.5 + i) * 0.1 + 0.15;
          context.beginPath();
          context.arc(x, y, 2, 0, Math.PI * 2);
          context.fillStyle = `rgba(59, 130, 246, ${alpha})`;
          context.fill();
        }
      }

      const clientX = width * 0.25;
      const serverX = width * 0.75;
      const centerY = height * 0.5;

      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
      context.lineWidth = 3;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(clientX + 60, centerY);
      context.lineTo(serverX - 60, centerY);
      context.stroke();
      context.setLineDash([]);

      const drawNode = (x: number, y: number, label: string, sublabel: string, isActive: boolean, status?: string, isClient?: boolean) => {
        const pulse = Math.sin(timeRef.current * 3) * 4;
        const color = isClient ? primaryBlue : '#8b5cf6';

        if (isActive) {
          const glowGradient = context.createRadialGradient(x, y, 40, x, y, 80 + pulse);
          glowGradient.addColorStop(0, color + '40');
          glowGradient.addColorStop(1, 'transparent');
          context.fillStyle = glowGradient;
          context.beginPath();
          context.arc(x, y, 80 + pulse, 0, Math.PI * 2);
          context.fill();
        }

        const nodeGradient = context.createLinearGradient(x - 50, y - 50, x + 50, y + 50);
        nodeGradient.addColorStop(0, color);
        nodeGradient.addColorStop(1, color + 'cc');
        context.fillStyle = nodeGradient;

        if (isClient) {
          context.beginPath();
          context.roundRect(x - 50, y - 50, 100, 100, 12);
          context.fill();
          context.fillStyle = 'white';
          context.fillRect(x - 35, y - 30, 70, 45);
          context.fillRect(x - 20, y + 15, 40, 8);
          context.fillRect(x - 30, y + 23, 60, 6);
        } else {
          context.beginPath();
          context.ellipse(x, y - 30, 50, 14, 0, 0, Math.PI * 2);
          context.fill();
          context.fillRect(x - 50, y - 30, 100, 60);
          context.beginPath();
          context.ellipse(x, y + 30, 50, 14, 0, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = 'rgba(255, 255, 255, 0.3)';
          context.fillRect(x - 40, y - 18, 80, 4);
          context.fillRect(x - 40, y - 8, 80, 4);
          context.fillRect(x - 40, y + 2, 80, 4);
          context.fillRect(x - 40, y + 12, 80, 4);
        }

        context.fillStyle = 'white';
        context.font = 'bold 16px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 80);

        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = '12px Inter, system-ui, sans-serif';
        context.fillText(sublabel, x, y + 95);

        if (status) {
          const stateColor = stateColors[status] || '#64748b';
          context.fillStyle = stateColor;
          context.font = 'bold 12px Inter, system-ui, sans-serif';
          context.fillText(status, x, y + 115);
        }
      };

      const isConnecting = currentStep >= 1 && currentStep <= 3;
      const isEstablished = currentStep >= 4 && currentStep <= 5;
      const isClosing = currentStep >= 6;
      const isClientActive = isConnecting || isEstablished || isClosing;
      const isServerActive = (currentStep >= 2 && currentStep <= 7) || currentStep === 8;

      drawNode(clientX, centerY, '客户端', 'Client', isClientActive, steps[currentStep].clientState, true);
      drawNode(serverX, centerY, '服务端', 'Server', isServerActive, steps[currentStep].serverState, false);

      if (currentStep === 4) {
        context.fillStyle = '#22c55e';
        context.font = 'bold 22px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('连接已建立 ✓ 全双工数据传输中', (clientX + serverX) / 2, centerY - 85);
      }

      const now = Date.now();
      setPackets((prevPackets) => {
        let updated = false;
        const newPackets = prevPackets.map((packet) => {
          if (packet.completed) return packet;
          if (now < packet.startTime) return packet;
          if (!packet.active) {
            updated = true;
            return { ...packet, active: true, size: 0 };
          }
          if (packet.progress < 1) {
            updated = true;
            const sizeIncrease = 0.5;
            return {
              ...packet,
              progress: Math.min(1, packet.progress + 0.007),
              size: Math.min(22, packet.size + sizeIncrease),
            };
          }
          return { ...packet, completed: true };
        });
        return updated ? newPackets : prevPackets;
      });

      packets.forEach((packet) => {
        if (!packet.active) return;

        const fromX = packet.from === 0 ? clientX : serverX;
        const toX = packet.from === 0 ? serverX : clientX;
        const currentX = fromX + (toX - fromX) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };
        const size = packet.size || 22;

        const glowGradient = context.createRadialGradient(currentX, centerY, size * 0.5, currentX, centerY, size * 2.5);
        glowGradient.addColorStop(0, colors.start + '90');
        glowGradient.addColorStop(1, 'transparent');
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(currentX, centerY, size * 2.5, 0, Math.PI * 2);
        context.fill();

        context.save();
        context.translate(currentX, centerY);
        context.rotate(packet.progress * Math.PI * 2);

        const grad = context.createLinearGradient(-size, -size, size, size);
        grad.addColorStop(0, colors.start);
        grad.addColorStop(1, colors.end);
        context.fillStyle = grad;
        context.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const px = Math.cos(angle) * size;
          const py = Math.sin(angle) * size;
          if (i === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.fill();
        context.restore();

        context.fillStyle = 'white';
        context.font = 'bold 9px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 4;
        const shortLabel = packet.type.replace('-', '\n');
        context.fillText(packet.type, currentX, centerY);
        context.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentStep, packets, isDarkMode]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setPackets([]);
    setPacketLogs([]);
  };

  const handleStepClick = (index: number) => {
    if (index <= currentStep + 1) setCurrentStep(index);
  };

  const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff';
  const cardBg = isDarkMode ? '#1f2937' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#171717';
  const secondaryText = isDarkMode ? '#9ca3af' : '#6b7280';
  const borderColor = isDarkMode ? '#374151' : '#e5e7eb';
  const primaryBlue = '#3b82f6';

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: bgColor, color: textColor }}>
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">返回主页</span>
              </a>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>TCP 三次握手与四次挥手</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>传输控制协议 | 10 个核心步骤</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)' }}>
                <div className="text-xs" style={{ color: secondaryText }}>当前步骤</div>
                <div className="text-xl font-bold" style={{ color: primaryBlue }}>{currentStep + 1} / {steps.length}</div>
              </div>
              <button onClick={handleReset} className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>🔄 重置</button>
              <button onClick={handleNext} disabled={currentStep >= steps.length - 1} className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50" style={{ backgroundColor: primaryBlue, color: 'white' }}>下一步 →</button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 顶部详细介绍区域 */}
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>TCP 完整工作流程详解</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>一、TCP 简介</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>TCP（Transmission Control Protocol，传输控制协议）</span>是一种面向连接的、可靠的、基于字节流的传输层通信协议。TCP 通过三次握手建立连接，通过四次挥手关闭连接，使用序列号和确认号实现可靠传输。
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: primaryBlue }}>传输层协议</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>TCP</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>协议号</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>6</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#10b981' }}>端口号范围</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>0 - 65535</div>
                </div>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }} onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                        <span className="text-white font-bold text-sm">TCP</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#f59e0b' }}>首部长度</div>
                        <div className="text-lg font-bold" style={{ color: textColor }}>20 - 60 字节</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: isHeaderExpanded ? '#f59e0b' : 'transparent', color: isHeaderExpanded ? 'white' : '#f59e0b' }}>
                        {isHeaderExpanded ? '▲ 收起详情' : '▼ 点击查看'}
                      </div>
                    </div>
                  </div>
                  
                  {isHeaderExpanded && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)' }}>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📐</span>
                              <div className="font-bold text-sm" style={{ color: '#f59e0b' }}>TCP 首部结构</div>
                            </div>
                            <div className="text-xs leading-relaxed space-y-1" style={{ color: secondaryText }}>
                              <div>• 源端口（16位）+ 目的端口（16位）</div>
                              <div>• 序列号（32位）+ 确认号（32位）</div>
                              <div>• 数据偏移（4位）+ 保留（6位）+ 标志位（6位）</div>
                              <div>• 窗口大小（16位）+ 校验和（16位）+ 紧急指针（16位）</div>
                              <div>• 选项字段（0-40字节）</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">⚙️</span>
                              <div className="font-bold text-sm" style={{ color: '#10b981' }}>核心特性</div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: secondaryText }}>面向连接</span>
                                <span className="text-xs font-bold" style={{ color: '#10b981' }}>三次握手建立</span>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: secondaryText }}>可靠传输</span>
                                <span className="text-xs font-bold" style={{ color: '#10b981' }}>确认重传机制</span>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: secondaryText }}>全双工通信</span>
                                <span className="text-xs font-bold" style={{ color: '#10b981' }}>双向同时传输</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>二、TCP 核心概念：十一种状态、六种标志位、状态转移</h3>
              
              {/* 11 种状态 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #64748b', paddingLeft: '10px' }}>十一种状态</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.05)', borderColor: '#64748b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#64748b' }} />
                      <span className="font-bold" style={{ color: textColor }}>1. CLOSED</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>初始关闭状态。没有任何连接，也不准备接受连接请求。通信开始前或连接关闭后的状态。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>2. LISTEN</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>监听状态。服务端在等待客户端的连接请求，被动打开端口，准备接收 SYN 报文。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>3. SYN_SENT</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>同步已发送。客户端已发送 SYN 报文，正在等待服务端的 SYN-ACK 响应。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)', borderColor: '#a855f7' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
                      <span className="font-bold" style={{ color: textColor }}>4. SYN_RCVD</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>同步已接收。服务端收到 SYN 并发送 SYN-ACK，等待客户端的 ACK 确认。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)', borderColor: '#22c55e' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                      <span className="font-bold" style={{ color: textColor }}>5. ESTABLISHED</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>连接已建立。三次握手完成后进入此状态，双方可以进行全双工数据传输。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>6. FIN_WAIT_1</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>结束等待 1。客户端已发送 FIN，等待服务端的 ACK 确认，不能发送数据但仍可接收。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)', borderColor: '#f97316' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
                      <span className="font-bold" style={{ color: textColor }}>7. FIN_WAIT_2</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>结束等待 2。客户端收到服务端的 ACK 后，等待服务端的 FIN 报文。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.05)', borderColor: '#eab308' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }} />
                      <span className="font-bold" style={{ color: textColor }}>8. CLOSE_WAIT</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>关闭等待。服务端收到 FIN 后进入此状态，等待应用程序发送剩余数据并调用关闭。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.05)', borderColor: '#ec4899' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ec4899' }} />
                      <span className="font-bold" style={{ color: textColor }}>9. LAST_ACK</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>最后确认。服务端发送 FIN 后进入此状态，等待客户端的 ACK 确认。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(20, 184, 166, 0.1)' : 'rgba(20, 184, 166, 0.05)', borderColor: '#14b8a6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#14b8a6' }} />
                      <span className="font-bold" style={{ color: textColor }}>10. TIME_WAIT</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>时间等待。客户端收到 FIN 后进入此状态，等待 2MSL 后自动进入 CLOSED。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="font-bold" style={{ color: textColor }}>11. CLOSING</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>关闭中。同时收到 FIN 和发送 FIN 时的状态，双方几乎同时关闭连接时出现。</p>
                  </div>
                </div>
              </div>

              {/* 6 种标志位 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>六种标志位</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>SYN（同步标志）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>在三次握手时使用，用于建立连接。SYN=1 表示发起连接请求，同时携带初始序列号 ISN。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>ACK（确认标志）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>确认收到数据。ACK=1 时确认号字段有效。除了最初的 SYN 报文外，所有报文都应设置 ACK。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="font-bold" style={{ color: textColor }}>FIN（结束标志）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>在四次挥手时使用，用于关闭连接。FIN=1 表示数据发送完毕，请求断开连接。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>RST（重置标志）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>异常关闭连接。RST=1 表示立即终止连接，用于异常情况或拒绝非法连接请求。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>PSH（推送标志）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>立即推送。PSH=1 表示接收方应尽快将数据交付给应用层，不等待缓冲区填满。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.05)', borderColor: '#ec4899' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ec4899' }} />
                      <span className="font-bold" style={{ color: textColor }}>URG（紧急标志）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>紧急数据。URG=1 时紧急指针字段有效，表示数据段中有紧急数据需要优先处理。</p>
                  </div>
                </div>
              </div>

              {/* 状态转移 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>状态转移过程</div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>三次握手（连接建立）</div>
                    <div className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#64748b' }} />CLOSED</div>
                      <div className="text-center text-base" style={{ color: '#3b82f6' }}>↓ 主动打开</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />SYN_SENT</div>
                      <div className="text-center text-base" style={{ color: '#3b82f6' }}>↓ 收到 SYN+ACK</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />ESTABLISHED</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>四次挥手（连接关闭）</div>
                    <div className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />ESTABLISHED</div>
                      <div className="text-center text-base" style={{ color: '#ef4444' }}>↓ 主动关闭</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />FIN_WAIT_1</div>
                      <div className="text-center text-base" style={{ color: '#ef4444' }}>↓ 收到 ACK</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }} />FIN_WAIT_2</div>
                      <div className="text-center text-base" style={{ color: '#ef4444' }}>↓ 收到 FIN</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#14b8a6' }} />TIME_WAIT</div>
                      <div className="text-center text-base" style={{ color: '#ef4444' }}>↓ 2MSL</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#64748b' }} />CLOSED</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#8b5cf6' }}>服务端状态转移</div>
                    <div className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#64748b' }} />CLOSED</div>
                      <div className="text-center text-base" style={{ color: '#3b82f6' }}>↓ 被动打开</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />LISTEN</div>
                      <div className="text-center text-base" style={{ color: '#3b82f6' }}>↓ 收到 SYN</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a855f7' }} />SYN_RCVD</div>
                      <div className="text-center text-base" style={{ color: '#3b82f6' }}>↓ 收到 ACK</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />ESTABLISHED</div>
                      <div className="text-center text-base" style={{ color: '#ef4444' }}>↓ 收到 FIN</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#eab308' }} />CLOSE_WAIT</div>
                      <div className="text-center text-base" style={{ color: '#ef4444' }}>↓ 关闭</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ec4899' }} />LAST_ACK</div>
                      <div className="text-center text-base" style={{ color: '#ef4444' }}>↓ 收到 ACK</div>
                      <div className="flex items-center gap-2 py-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#64748b' }} />CLOSED</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>三、三次握手与四次挥手详解</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>三次握手：</span>客户端发送 SYN（seq=x）→ 服务端回复 SYN-ACK（seq=y, ack=x+1）→ 客户端发送 ACK（seq=x+1, ack=y+1）。连接建立完成。<br/>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>四次挥手：</span>客户端发送 FIN（seq=u）→ 服务端回复 ACK（ack=u+1）→ 服务端发送 FIN（seq=v）→ 客户端回复 ACK（ack=v+1）。连接关闭。
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>🔗 三次握手（连接建立）</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }}>
                      <span className="text-base">①</span>
                      <span style={{ color: textColor }}><strong>客户端 → 服务端：</strong>SYN（seq=x）</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }}>
                      <span className="text-base">②</span>
                      <span style={{ color: textColor }}><strong>服务端 → 客户端：</strong>SYN-ACK（seq=y, ack=x+1）</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }}>
                      <span className="text-base">③</span>
                      <span style={{ color: textColor }}><strong>客户端 → 服务端：</strong>ACK（seq=x+1, ack=y+1）</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)', borderColor: '#ef4444' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#ef4444' }}>👋 四次挥手（连接关闭）</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }}>
                      <span className="text-base">①</span>
                      <span style={{ color: textColor }}><strong>客户端 → 服务端：</strong>FIN（seq=u）</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }}>
                      <span className="text-base">②</span>
                      <span style={{ color: textColor }}><strong>服务端 → 客户端：</strong>ACK（ack=u+1）</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }}>
                      <span className="text-base">③</span>
                      <span style={{ color: textColor }}><strong>服务端 → 客户端：</strong>FIN（seq=v）</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }}>
                      <span className="text-base">④</span>
                      <span style={{ color: textColor }}><strong>客户端 → 服务端：</strong>ACK（ack=v+1）</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 中间主区域：左侧动画 + 步骤控制，右侧当前状态 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden flex-1" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold" style={{ color: secondaryText }}>步骤导航:</span>
                  <div className="flex gap-2">
                    {steps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleStepClick(index)}
                        disabled={index > currentStep + 1}
                        className="w-10 h-10 rounded-lg font-bold text-sm transition-all disabled:opacity-30"
                        style={{
                          backgroundColor: index < currentStep ? 'rgba(34, 197, 94, 0.2)' : index === currentStep ? 'rgba(59, 130, 246, 0.2)' : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          borderColor: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : 'transparent',
                          borderWidth: '2px',
                          color: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : secondaryText,
                          transform: index === currentStep ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>SYN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>SYN-ACK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>ACK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>PSH-ACK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>FIN</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderColor }}>
                  <span className="text-2xl">{steps[currentStep].icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{steps[currentStep].title}</h3>
                    <p className="text-xs" style={{ color: secondaryText }}>步骤 {currentStep + 1} / {steps.length}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: textColor }}>{steps[currentStep].description}</p>
                </div>

                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #8b5cf6, #10b981, #f59e0b, #ef4444)` }} />
                </div>
              </div>

              <div className="rounded-xl border p-4 flex-1" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔗</span>
                  <div>
                    <div className="font-bold">当前连接状态</div>
                    <div className="text-xs" style={{ color: secondaryText }}>TCP 状态实时显示</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="text-xs font-semibold" style={{ color: textColor }}>客户端</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: (stateColors[steps[currentStep].clientState] || '#64748b') + '40', color: stateColors[steps[currentStep].clientState] || '#64748b' }}>{steps[currentStep].clientState}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="text-xs font-semibold" style={{ color: textColor }}>服务端</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: (stateColors[steps[currentStep].serverState] || '#64748b') + '40', color: stateColors[steps[currentStep].serverState] || '#64748b' }}>{steps[currentStep].serverState}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📦</span>
                  <div>
                    <div className="font-bold">报文日志</div>
                    <div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 TCP 报文</div>
                  </div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '100px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                      <span>暂无报文</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {packetLogs.map((log, index) => (
                        <div key={index} className="flex items-center gap-2 p-1.5 rounded text-xs" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} />
                          <span className="font-semibold" style={{ color: textColor }}>{log.type}</span>
                          <span style={{ color: secondaryText }}>→</span>
                          <span style={{ color: textColor }}>{log.from} → {log.to}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* lg:col-span-full 报文日志 + 状态机 */}
          <div className="w-full grid grid-cols-2 gap-4 mb-6 lg:col-span-full">
            <div className="rounded-xl border p-4 w-full" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: borderColor }}>
                <span className="text-lg">📦</span>
                <div>
                  <div className="font-bold">报文交互日志</div>
                  <div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 TCP 报文（实时显示）</div>
                </div>
              </div>
              <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '120px' }}>
                {packetLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                    <span>暂无 TCP 报文</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {packetLogs.map((log, index) => (
                      <div key={index} className="flex items-center gap-2 p-1.5 rounded text-xs" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} />
                        <span className="font-semibold" style={{ color: textColor }}>{log.type}</span>
                        <span style={{ color: secondaryText }}>→</span>
                        <span style={{ color: textColor }}>{log.from} → {log.to}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border p-4 w-full" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: borderColor }}>
                <span className="text-lg">📊</span>
                <div>
                  <div className="font-bold">状态机快速参考</div>
                  <div className="text-xs" style={{ color: secondaryText }}>TCP 连接生命周期状态转换</div>
                </div>
              </div>
              <div className="flex items-center justify-start gap-1.5 text-xs overflow-x-auto pb-2">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#64748b', color: 'white' }}>CLS</div>
                  <span style={{ color: secondaryText }}>CLOSED</span>
                </div>
                <div style={{ color: '#3b82f6', fontSize: '10px' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#3b82f6', color: 'white' }}>LIS</div>
                  <span style={{ color: secondaryText }}>LISTEN</span>
                </div>
                <div style={{ color: '#3b82f6', fontSize: '10px' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>SYN_S</div>
                  <span style={{ color: secondaryText }}>SYN_SENT</span>
                </div>
                <div style={{ color: '#3b82f6', fontSize: '10px' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#a855f7', color: 'white' }}>SYN_R</div>
                  <span style={{ color: secondaryText }}>SYN_RCVD</span>
                </div>
                <div style={{ color: '#3b82f6', fontSize: '10px' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#22c55e', color: 'white' }}>EST</div>
                  <span style={{ color: secondaryText }}>ESTAB</span>
                </div>
                <div style={{ color: '#ef4444', fontSize: '10px' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#f59e0b', color: 'white' }}>FW1</div>
                  <span style={{ color: secondaryText }}>FIN_W1</span>
                </div>
                <div style={{ color: '#ef4444', fontSize: '10px' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#f97316', color: 'white' }}>FW2</div>
                  <span style={{ color: secondaryText }}>FIN_W2</span>
                </div>
                <div style={{ color: '#ef4444', fontSize: '10px' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#14b8a6', color: 'white' }}>TW</div>
                  <span style={{ color: secondaryText }}>TIME_W</span>
                </div>
                <div style={{ color: '#ef4444', fontSize: '10px' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#64748b', color: 'white' }}>CLS</div>
                  <span style={{ color: secondaryText }}>CLOSED</span>
                </div>
              </div>
            </div>
          </div>

          {/* 底部：TCP 报文首部详解 */}
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、TCP 报文首部详解</h2>
            
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                TCP 首部是 TCP 协议的核心组成部分，包含源端口、目的端口、序列号、确认号、标志位等关键字段。标准 TCP 首部为 20 字节，可选字段可扩展到 60 字节。
              </p>
              
              {/* 首部结构可视化 */}
              <div className="overflow-x-auto mb-6">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    {/* 第1行：源端口 + 目的端口 */}
                    <div className="col-span-8 p-2 rounded-tl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>源端口</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>0-65535</div>
                    </div>
                    <div className="col-span-8 p-2 rounded-tr-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>目的端口</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>0-65535</div>
                    </div>
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)' }}></div>

                    {/* 第2行：序列号 */}
                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>序列号（Sequence Number）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>用于标识从 TCP 源端向目的端发送的字节流</div>
                    </div>

                    {/* 第3行：确认号 */}
                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>确认号（Acknowledgment Number）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>期望收到的下一个序列号，确认已成功收到之前的数据</div>
                    </div>

                    {/* 第4行：数据偏移 + 保留 + 标志位 + 窗口 */}
                    <div className="col-span-4 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold text-xs" style={{ color: '#f59e0b' }}>数据偏移</div>
                      <div className="text-xs" style={{ color: secondaryText }}>4位</div>
                    </div>
                    <div className="col-span-3 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.3)' : 'rgba(100, 116, 139, 0.2)', border: '1px solid #64748b' }}>
                      <div className="font-bold text-xs" style={{ color: '#64748b' }}>保留</div>
                      <div className="text-xs" style={{ color: secondaryText }}>3位</div>
                    </div>
                    <div className="col-span-3 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}>
                      <span className="font-bold text-xs" style={{ color: '#ef4444' }}>NS</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>/</span>
                      <span className="font-bold text-xs" style={{ color: '#3b82f6' }}>CWR</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>/</span>
                      <span className="font-bold text-xs" style={{ color: '#10b981' }}>ECE</span>
                      <div className="text-xs" style={{ color: secondaryText }}>3位</div>
                    </div>
                    <div className="col-span-6 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <span className="font-bold text-xs" style={{ color: '#3b82f6' }}>U</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>/</span>
                      <span className="font-bold text-xs" style={{ color: '#8b5cf6' }}>A</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>/</span>
                      <span className="font-bold text-xs" style={{ color: '#ef4444' }}>P</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>/</span>
                      <span className="font-bold text-xs" style={{ color: '#f59e0b' }}>R</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>/</span>
                      <span className="font-bold text-xs" style={{ color: '#10b981' }}>S</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>/</span>
                      <span className="font-bold text-xs" style={{ color: '#ef4444' }}>F</span>
                      <div className="text-xs" style={{ color: secondaryText }}>6位</div>
                    </div>
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>窗口大小（Window）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>接收窗口大小，流量控制</div>
                    </div>

                    {/* 第5行：校验和 + 紧急指针 */}
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>校验和（Checksum）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                    </div>
                    <div className="col-span-16 p-2 rounded-bl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <div className="font-bold" style={{ color: '#ec4899' }}>紧急指针（Urgent Pointer）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                    </div>

                    {/* 第6行：选项（可选） */}
                    <div className="col-span-32 p-2 rounded-br-lg" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)', border: '2px dashed #64748b' }}>
                      <div className="font-bold" style={{ color: '#64748b' }}>选项（Options）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>0-320位（0-40字节），可选，如 MSS、时间戳等</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: '#3b82f6' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>🔧 端口号</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• 熟知端口：0-1023（HTTP:80, HTTPS:443）</li>
                    <li>• 注册端口：1024-49151</li>
                    <li>• 动态端口：49152-65535</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)', borderColor: '#8b5cf6' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#8b5cf6' }}>📊 序列号机制</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• 初始序列号（ISN）随机生成</li>
                    <li>• 每个字节都有一个序列号</li>
                    <li>• 确认号为期望的下一个序列号</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>🔄 流量控制</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• 窗口大小动态调整</li>
                    <li>• 接收端通知可用缓冲区</li>
                    <li>• 防止发送方过快发送</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>
            NetViz - 网络工程可视化平台 | TCP 三次握手与四次挥手动画演示
          </div>
        </div>
      </footer>
    </div>
  );
}
