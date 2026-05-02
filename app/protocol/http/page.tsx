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
}

export default function HTTPPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [packetLogs, setPacketLogs] = useState<{ type: string; from: string; to: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMsgExpanded, setIsMsgExpanded] = useState(false);
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
      title: '连接等待中',
      description: '客户端准备发起 HTTP 请求，但需要先建立 TCP 连接。服务器已经在端口 80 上监听，等待客户端的连接请求。此时双方还未开始任何通信。',
      packets: [],
    },
    {
      phase: '三次握手',
      icon: <Emoji label="🔗" />,
      title: 'TCP 三次握手建立连接',
      description: '(1) 客户端发送 SYN 报文 (seq=x)，进入 SYN_SENT 状态；(2) 服务器回复 SYN-ACK (seq=y, ack=x+1)，进入 SYN_RCVD 状态；(3) 客户端回复 ACK (seq=x+1, ack=y+1)，双方进入 ESTABLISHED 状态。',
      packets: [
        { from: 0, to: 1, type: 'SYN', delay: 0 },
        { from: 1, to: 0, type: 'SYN-ACK', delay: 500 },
        { from: 0, to: 1, type: 'ACK', delay: 1000 },
      ],
    },
    {
      phase: '发送请求',
      icon: <Emoji label="📤" />,
      title: '发送 HTTP GET 请求',
      description: 'TCP 连接建立后，客户端构建 HTTP GET 请求报文。请求行：GET /index.html HTTP/1.1，请求头包含 Host、User-Agent、Accept 等信息。通过 TCP 连接发送给服务器。',
      packets: [{ from: 0, to: 1, type: 'GET', delay: 0 }],
    },
    {
      phase: '处理请求',
      icon: <Emoji label="⚙️" />,
      title: '服务器处理请求',
      description: '服务器收到 GET 请求后，解析请求行和请求头。根据请求的路径 /index.html 查找对应的资源文件，准备构建响应报文。',
      packets: [],
    },
    {
      phase: '返回响应',
      icon: <Emoji label="📥" />,
      title: '返回 200 OK 响应',
      description: '服务器成功找到资源，返回 200 OK 响应报文。响应包含状态行（HTTP/1.1 200 OK）、响应头（Content-Type: text/html, Content-Length）和响应体（HTML 页面内容）。',
      packets: [{ from: 1, to: 0, type: '200 OK', delay: 0 }],
    },
    {
      phase: '请求完成',
      icon: <Emoji label="✅" />,
      title: 'HTTP 请求 - 响应完成',
      description: '客户端收到 200 OK 响应，解析 HTML 内容并渲染页面。在 HTTP/1.1 中，连接默认保持（Keep-Alive），可以在同一连接上继续发送更多请求，减少重复建立连接的开销。',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'SYN': { start: '#6b7280', end: '#4b5563' },
    'SYN-ACK': { start: '#8b5cf6', end: '#7c3aed' },
    'ACK': { start: '#3b82f6', end: '#2563eb' },
    'GET': { start: '#3b82f6', end: '#2563eb' },
    '200 OK': { start: '#10b981', end: '#059669' },
  };

  const methodColors: Record<string, string> = {
    'GET': '#3b82f6',
    'POST': '#10b981',
    'PUT': '#f59e0b',
    'DELETE': '#ef4444',
    'PATCH': '#8b5cf6',
    'HEAD': '#64748b',
    'OPTIONS': '#ec4899',
  };

  const statusColors: Record<string, { bg: string; text: string; name: string }> = {
    '1xx': { bg: '#64748b', text: '#ffffff', name: '信息性' },
    '2xx': { bg: '#10b981', text: '#ffffff', name: '成功' },
    '3xx': { bg: '#3b82f6', text: '#ffffff', name: '重定向' },
    '4xx': { bg: '#f59e0b', text: '#ffffff', name: '客户端错误' },
    '5xx': { bg: '#ef4444', text: '#ffffff', name: '服务器错误' },
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
      const labels = ['客户端', '服务器'];
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

      const drawNode = (x: number, y: number, label: string, sublabel: string, isActive: boolean, isClient?: boolean) => {
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
      };

      const isActive = currentStep >= 1 && currentStep <= 4;
      drawNode(clientX, centerY, '客户端', 'Client', isActive, true);
      drawNode(serverX, centerY, '服务器', 'Server', isActive, false);

      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
      context.lineWidth = 3;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(clientX + 60, centerY);
      context.lineTo(serverX - 60, centerY);
      context.stroke();
      context.setLineDash([]);

      if (currentStep >= 2 && currentStep <= 5) {
        context.fillStyle = '#22c55e';
        context.font = 'bold 20px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        const statusTexts = ['', '', '请求发送中', '处理中...', '响应返回中', '✓ 请求完成'];
        context.fillText(statusTexts[currentStep], (clientX + serverX) / 2, centerY - 85);
      }

      if (currentStep === 3) {
        context.fillStyle = '#f59e0b';
        context.font = '16px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('⚙️ 查找资源中...', (clientX + serverX) / 2, centerY + 130);
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
            return {
              ...packet,
              progress: Math.min(1, packet.progress + 0.008),
              size: Math.min(20, (packet.size || 0) + 0.5),
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
        const size = packet.size || 20;

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

  const handleNext = () => { if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1); };
  const handleReset = () => { setCurrentStep(0); setPackets([]); setPacketLogs([]); };
  const handleStepClick = (index: number) => { if (index <= currentStep + 1) setCurrentStep(index); };

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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>HTTP 请求 - 响应过程</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>超文本传输协议 | 6 个核心步骤</p>
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
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>HTTP 完整工作流程详解</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>一、HTTP 简介</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>HTTP（HyperText Transfer Protocol，超文本传输协议）</span>是应用层协议，基于客户端 - 服务器架构，采用请求 - 响应模型。HTTP 使用 TCP 作为传输层协议，默认端口 80，HTTPS 使用 TLS 加密，默认端口 443。
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: primaryBlue }}>应用层协议</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>HTTP</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>默认端口</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>80 / 443 (HTTPS)</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#10b981' }}>协议版本</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>HTTP/1.0 / 1.1 / 2.0 / 3.0</div>
                </div>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }} onClick={() => setIsMsgExpanded(!isMsgExpanded)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                        <span className="text-white font-bold text-sm">HTTP</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#f59e0b' }}>报文格式</div>
                        <div className="text-lg font-bold" style={{ color: textColor }}>请求行 / 状态行 + 头部 + 体</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: isMsgExpanded ? '#f59e0b' : 'transparent', color: isMsgExpanded ? 'white' : '#f59e0b' }}>
                        {isMsgExpanded ? '▲ 收起详情' : '▼ 点击查看'}
                      </div>
                    </div>
                  </div>
                  
                  {isMsgExpanded && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)' }}>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📤</span>
                              <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>请求报文格式</div>
                            </div>
                            <div className="font-mono text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div className="font-bold" style={{ color: primaryBlue }}>请求行</div>
                                <div>GET /index.html HTTP/1.1</div>
                                <div className="font-bold mt-1" style={{ color: '#10b981' }}>请求头</div>
                                <div>Host: www.example.com</div>
                                <div>User-Agent: Chrome/120.0</div>
                                <div>Accept: text/html</div>
                                <div>Connection: keep-alive</div>
                                <div className="text-gray-500">（空行）</div>
                                <div className="font-bold" style={{ color: '#f59e0b' }}>请求体（可选）</div>
                                <div className="text-gray-500">POST 请求时包含表单数据</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📥</span>
                              <div className="font-bold text-sm" style={{ color: '#10b981' }}>响应报文格式</div>
                            </div>
                            <div className="font-mono text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div className="font-bold" style={{ color: '#10b981' }}>状态行</div>
                                <div>HTTP/1.1 200 OK</div>
                                <div className="font-bold mt-1" style={{ color: '#3b82f6' }}>响应头</div>
                                <div>Content-Type: text/html</div>
                                <div>Content-Length: 1234</div>
                                <div>Server: nginx/1.24.0</div>
                                <div>Set-Cookie: session=abc</div>
                                <div className="text-gray-500">（空行）</div>
                                <div className="font-bold" style={{ color: '#f59e0b' }}>响应体</div>
                                <div>&lt;html&gt;&lt;body&gt;...&lt;/body&gt;&lt;/html&gt;</div>
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
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>二、HTTP 核心概念：七种方法、五类状态码、请求响应模型</h3>
              
              {/* 7 种请求方法 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #64748b', paddingLeft: '10px' }}>七种请求方法</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>GET</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>请求指定资源。只获取数据，不修改服务器状态。安全性高、可缓存、可收藏为书签。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>POST</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>提交数据到服务器。会修改服务器状态，数据在请求体中，不安全可缓存。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>PUT</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>上传资源到指定位置。完全替换目标资源，幂等方法（多次调用效果相同）。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="font-bold" style={{ color: textColor }}>DELETE</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>删除指定资源。幂等方法，删除后再次 DELETE 返回 404。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>PATCH</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>部分修改资源。与 PUT 不同，PATCH 只修改指定字段而非替换整个资源。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.05)', borderColor: '#64748b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#64748b' }} />
                      <span className="font-bold" style={{ color: textColor }}>HEAD</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>获取响应头，不返回响应体。用于检查资源是否存在或获取元数据。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.05)', borderColor: '#ec4899' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ec4899' }} />
                      <span className="font-bold" style={{ color: textColor }}>OPTIONS</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>查询服务器支持的 HTTP 方法。用于 CORS 预检请求（Preflight）。</p>
                  </div>
                </div>
              </div>

              {/* 5 类状态码 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>五类状态码</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.05)', borderColor: '#64748b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#64748b' }} />
                      <span className="font-bold" style={{ color: textColor }}>1xx 信息性</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>请求已接收，继续处理。常见：<br/>100 Continue - 继续发送请求体<br/>101 Switching Protocols - 协议切换</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>2xx 成功</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>请求成功处理。常见：<br/>200 OK - 请求成功<br/>201 Created - 资源已创建<br/>204 No Content - 无内容</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>3xx 重定向</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>需要进一步操作完成请求。常见：<br/>301 Moved Permanently - 永久重定向<br/>302 Found - 临时重定向<br/>304 Not Modified - 缓存有效</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>4xx 客户端错误</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>请求包含错误。常见：<br/>400 Bad Request - 请求语法错误<br/>401 Unauthorized - 未授权<br/>403 Forbidden - 禁止访问<br/>404 Not Found - 资源不存在</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="font-bold" style={{ color: textColor }}>5xx 服务器错误</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>服务器处理出错。常见：<br/>500 Internal Server Error - 服务器内部错误<br/>502 Bad Gateway - 网关错误<br/>503 Service Unavailable - 服务不可用</p>
                  </div>
                </div>
              </div>

              {/* 请求响应模型 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>请求 - 响应模型</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>🔗 请求流程</div>
                    <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                      <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }}>
                        <span className="font-bold" style={{ color: '#3b82f6' }}>①</span>
                        <span>DNS 解析域名 → 获取 IP 地址</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }}>
                        <span className="font-bold" style={{ color: '#8b5cf6' }}>②</span>
                        <span>TCP 三次握手 → 建立连接</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }}>
                        <span className="font-bold" style={{ color: '#10b981' }}>③</span>
                        <span>发送 HTTP 请求 → GET/POST 等</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }}>
                        <span className="font-bold" style={{ color: '#f59e0b' }}>④</span>
                        <span>服务器处理 → 返回响应</span>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }}>
                        <span className="font-bold" style={{ color: '#ef4444' }}>⑤</span>
                        <span>关闭或复用连接（Keep-Alive）</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ HTTP 特性</div>
                    <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                      <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                        <span>无状态协议</span>
                        <span className="font-bold" style={{ color: '#10b981' }}>每个请求独立</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                        <span>持久连接</span>
                        <span className="font-bold" style={{ color: '#10b981' }}>HTTP/1.1 Keep-Alive</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                        <span>管线化</span>
                        <span className="font-bold" style={{ color: '#10b981' }}>多个请求同时发送</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                        <span>缓存机制</span>
                        <span className="font-bold" style={{ color: '#10b981' }}>ETag / Cache-Control</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>三、HTTP 版本演进</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>HTTP/1.0：</span>每个请求建立新 TCP 连接，完成后立即关闭。<br/>
                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>HTTP/1.1：</span>默认持久连接（Keep-Alive），支持管线化、Host 头域、分块传输编码。<br/>
                <span style={{ color: '#10b981', fontWeight: 600 }}>HTTP/2.0：</span>多路复用、头部压缩（HPACK）、服务器推送、二进制分帧。<br/>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>HTTP/3.0：</span>基于 QUIC（UDP），零 RTT 连接建立，更好的队头阻塞避免。
              </p>
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
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6b7280' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>SYN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>SYN-ACK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>ACK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>GET</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>200 OK</span>
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
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #8b5cf6, #10b981, #f59e0b)` }} />
                </div>
              </div>

              <div className="rounded-xl border p-4 flex-1" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔗</span>
                  <div>
                    <div className="font-bold">当前阶段状态</div>
                    <div className="text-xs" style={{ color: secondaryText }}>HTTP 请求流程实时显示</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="text-xs font-semibold" style={{ color: textColor }}>客户端</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 4 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 4 ? '#3b82f6' : '#64748b' }}>
                      {currentStep >= 1 && currentStep <= 4 ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="text-xs font-semibold" style={{ color: textColor }}>服务器</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 4 ? 'rgba(139, 92, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 4 ? '#8b5cf6' : '#64748b' }}>
                      {currentStep === 3 ? 'PROCESSING' : currentStep >= 1 && currentStep <= 4 ? 'ACTIVE' : 'LISTEN'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📦</span>
                  <div>
                    <div className="font-bold">报文日志</div>
                    <div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 HTTP 报文</div>
                  </div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '100px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                      <span>暂无 HTTP 报文</span>
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

          {/* 底部：报文日志 + 状态机快速参考 */}
          <div className="w-full grid grid-cols-2 gap-4 mb-6 lg:col-span-full">
            <div className="rounded-xl border p-4 w-full" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: borderColor }}>
                <span className="text-lg">📦</span>
                <div>
                  <div className="font-bold">报文交互日志</div>
                  <div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 HTTP 报文（实时显示）</div>
                </div>
              </div>
              <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '120px' }}>
                {packetLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                    <span>暂无 HTTP 报文</span>
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
                  <div className="font-bold">状态码快速参考</div>
                  <div className="text-xs" style={{ color: secondaryText }}>HTTP 响应状态码分类</div>
                </div>
              </div>
              <div className="flex items-center justify-start gap-2 text-xs overflow-x-auto pb-2">
                {Object.entries(statusColors).map(([code, info]) => (
                  <div key={code} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="px-3 py-1.5 rounded-full font-bold text-xs" style={{ backgroundColor: info.bg, color: info.text }}>
                      {code.replace('x', 'xx')}
                    </div>
                    <span style={{ color: secondaryText }}>{info.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 底部：HTTP 常见状态码详解 */}
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、HTTP 常见状态码详解</h2>
            
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                HTTP 状态码由三位数字组成，第一位数字表示响应类别。了解常见状态码有助于快速诊断网络问题。
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>✅ 2xx 成功类</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>200</span> OK</span>
                      <span>请求成功</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>201</span> Created</span>
                      <span>资源已创建</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>204</span> No Content</span>
                      <span>无内容返回</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: '#3b82f6' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>🔄 3xx 重定向类</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>301</span> Moved</span>
                      <span>永久重定向</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>302</span> Found</span>
                      <span>临时重定向</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>304</span> Not Modified</span>
                      <span>缓存有效</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)', borderColor: '#f59e0b' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#f59e0b' }}>❌ 4xx 客户端错误</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>400</span> Bad Request</span>
                      <span>请求错误</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>401</span> Unauthorized</span>
                      <span>未授权</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>404</span> Not Found</span>
                      <span>资源不存在</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)', borderColor: '#ef4444' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#ef4444' }}>🔴 5xx 服务器错误</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#ef4444' }}>500</span> Server Error</span>
                      <span>服务器内部错误</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#ef4444' }}>502</span> Bad Gateway</span>
                      <span>网关错误</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#ef4444' }}>503</span> Unavailable</span>
                      <span>服务不可用</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)', borderColor: '#8b5cf6' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#8b5cf6' }}>📊 请求头常用字段</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>Host</span></span>
                      <span>目标主机域名</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>User-Agent</span></span>
                      <span>客户端信息</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>Content-Type</span></span>
                      <span>内容类型</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>Authorization</span></span>
                      <span>身份认证</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>Cookie</span></span>
                      <span>会话标识</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>
            NetViz - 网络工程可视化平台 | HTTP 请求 - 响应过程动画演示
          </div>
        </div>
      </footer>
    </div>
  );
}
