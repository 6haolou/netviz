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

export default function DNSPage() {
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
      title: 'DNS 查询前',
      description: '客户端需要访问 www.example.com，但只知道域名不知道 IP 地址。在发送 HTTP 请求之前，需要先通过 DNS 获取目标服务器的 IP 地址。',
      packets: [],
    },
    {
      phase: '递归查询',
      icon: <Emoji label="🔍" />,
      title: '客户端 → 本地 DNS 服务器',
      description: '客户端向本地 DNS 服务器发送递归查询请求（Query），询问 www.example.com 的 IP 地址。客户端期望本地 DNS 服务器返回最终结果。',
      packets: [{ from: 0, to: 1, type: 'Query', delay: 0 }],
    },
    {
      phase: '迭代查询',
      icon: <Emoji label="🌐" />,
      title: '本地 DNS 迭代查询',
      description: '本地 DNS 服务器没有缓存，开始迭代查询：(1) 向根域名服务器查询；(2) 根返回 .com 顶级服务器地址；(3) 向 .com 服务器查询；(4) 返回权威服务器地址；(5) 最终获得 IP 地址 (1.2.3.4)。',
      packets: [{ from: 1, to: 2, type: 'Iterative', delay: 0 }],
    },
    {
      phase: '返回结果',
      icon: <Emoji label="📥" />,
      title: '返回 IP 地址',
      description: '本地 DNS 服务器获得 IP 地址 1.2.3.4，将结果返回给客户端。本地服务器也会缓存此结果（TTL 时间内）。客户端获得 IP 后即可建立 TCP 连接。',
      packets: [
        { from: 2, to: 1, type: 'Answer', delay: 0 },
        { from: 1, to: 0, type: 'Answer', delay: 400 },
      ],
    },
    {
      phase: '解析完成',
      icon: <Emoji label="✅" />,
      title: 'DNS 解析完成',
      description: '客户端成功获得 www.example.com 的 IP 地址 1.2.3.4。现在可以使用这个 IP 地址建立 TCP 连接，发送 HTTP 请求获取网页内容。整个过程基于 UDP 协议，端口 53。',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'Query': { start: '#3b82f6', end: '#2563eb' },
    'Iterative': { start: '#f59e0b', end: '#d97706' },
    'Answer': { start: '#10b981', end: '#059669' },
  };

  const recordTypes: Record<string, { color: string; desc: string }> = {
    'A': { color: '#3b82f6', desc: 'IPv4 地址记录' },
    'AAAA': { color: '#8b5cf6', desc: 'IPv6 地址记录' },
    'CNAME': { color: '#10b981', desc: '别名记录' },
    'MX': { color: '#f59e0b', desc: '邮件交换记录' },
    'NS': { color: '#ec4899', desc: '名称服务器记录' },
    'TXT': { color: '#14b8a6', desc: '文本记录' },
    'SOA': { color: '#ef4444', desc: '起始授权记录' },
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
      const labels = ['客户端', '本地 DNS', '根/顶级 DNS'];
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

      const clientX = width * 0.2;
      const dnsX = width * 0.5;
      const rootX = width * 0.8;
      const centerY = height * 0.5;

      const drawNode = (x: number, y: number, label: string, sublabel: string, color: string, isActive: boolean, isClient: boolean, isRoot: boolean) => {
        const pulse = Math.sin(timeRef.current * 3) * 4;

        if (isActive) {
          const glowGradient = context.createRadialGradient(x, y, 40, x, y, 80 + pulse);
          glowGradient.addColorStop(0, color + '40');
          glowGradient.addColorStop(1, 'transparent');
          context.fillStyle = glowGradient;
          context.beginPath();
          context.arc(x, y, 80 + pulse, 0, Math.PI * 2);
          context.fill();
        }

        const nodeGradient = context.createLinearGradient(x - 40, y - 40, x + 40, y + 40);
        nodeGradient.addColorStop(0, color);
        nodeGradient.addColorStop(1, color + 'cc');
        context.fillStyle = nodeGradient;

        if (isClient) {
          context.beginPath();
          context.roundRect(x - 40, y - 40, 80, 80, 12);
          context.fill();
          context.fillStyle = 'rgba(255, 255, 255, 0.2)';
          context.fillRect(x - 25, y - 25, 50, 35);
          context.fillRect(x - 15, y + 10, 30, 6);
        } else if (isRoot) {
          context.beginPath();
          context.arc(x, y, 40, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          context.lineWidth = 2;
          context.beginPath();
          context.arc(x, y, 30, 0, Math.PI * 2);
          context.stroke();
          context.beginPath();
          context.moveTo(x - 30, y);
          context.lineTo(x + 30, y);
          context.moveTo(x, y - 30);
          context.lineTo(x, y + 30);
          context.stroke();
        } else {
          context.beginPath();
          context.ellipse(x, y - 25, 40, 12, 0, 0, Math.PI * 2);
          context.fill();
          context.fillRect(x - 40, y - 25, 80, 50);
          context.beginPath();
          context.ellipse(x, y + 25, 40, 12, 0, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = 'rgba(255, 255, 255, 0.3)';
          context.fillRect(x - 30, y - 15, 60, 4);
          context.fillRect(x - 30, y - 5, 60, 4);
          context.fillRect(x - 30, y + 5, 60, 4);
        }

        context.fillStyle = 'white';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 65);

        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText(sublabel, x, y + 80);
      };

      const isClientActive = currentStep >= 1 && currentStep <= 3;
      const isDnsActive = currentStep >= 1 && currentStep <= 3;
      const isRootActive = currentStep >= 2 && currentStep <= 3;

      drawNode(clientX, centerY, '客户端', 'Client', '#3b82f6', isClientActive, true, false);
      drawNode(dnsX, centerY, '本地 DNS', 'Local DNS', '#10b981', isDnsActive, false, false);
      drawNode(rootX, centerY, '根/顶级 DNS', 'Root/TLD', '#f59e0b', isRootActive, false, true);

      context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      context.lineWidth = 2;
      context.setLineDash([5, 8]);
      context.beginPath();
      context.moveTo(clientX + 40, centerY - 20);
      context.lineTo(dnsX - 40, centerY - 20);
      context.moveTo(dnsX + 40, centerY + 20);
      context.lineTo(rootX - 40, centerY + 20);
      context.stroke();
      context.setLineDash([]);

      if (currentStep === 4) {
        context.fillStyle = '#22c55e';
        context.font = 'bold 22px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('✓ 域名解析完成', width / 2, centerY - 100);
        context.fillStyle = secondaryText;
        context.font = '14px Inter, system-ui, sans-serif';
        context.fillText('www.example.com → 1.2.3.4', width / 2, centerY - 75);
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
              progress: Math.min(1, packet.progress + 0.007),
              size: Math.min(18, (packet.size || 0) + 0.5),
            };
          }
          return { ...packet, completed: true };
        });
        return updated ? newPackets : prevPackets;
      });

      packets.forEach((packet) => {
        if (!packet.active) return;
        const positions = [
          { x: clientX, y: centerY },
          { x: dnsX, y: centerY },
          { x: rootX, y: centerY },
        ];
        const fromNode = positions[packet.from];
        const toNode = positions[packet.to];
        const currentX = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        const currentY = fromNode.y + (toNode.y - fromNode.y) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };
        const size = packet.size || 18;

        const tailProgress = Math.max(0, packet.progress - 0.15);
        const tailX = fromNode.x + (toNode.x - fromNode.x) * tailProgress;
        const tailY = fromNode.y + (toNode.y - fromNode.y) * tailProgress;

        context.strokeStyle = colors.start;
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.setLineDash([8, 6]);
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(currentX, currentY);
        context.stroke();
        context.setLineDash([]);

        context.save();
        context.translate(currentX, currentY);
        context.rotate(timeRef.current * 2);

        const glowGradient = context.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2);
        glowGradient.addColorStop(0, colors.start + '60');
        glowGradient.addColorStop(1, 'transparent');
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(0, 0, size * 2, 0, Math.PI * 2);
        context.fill();

        const packetGradient = context.createRadialGradient(0, 0, 0, 0, 0, size);
        packetGradient.addColorStop(0, colors.start);
        packetGradient.addColorStop(1, colors.end);
        context.fillStyle = packetGradient;
        context.beginPath();
        context.arc(0, 0, size, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        context.lineWidth = 2;
        context.stroke();
        context.restore();

        context.fillStyle = 'white';
        context.font = 'bold 8px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 4;
        context.fillText(packet.type, currentX, currentY);
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
  const toggleDarkMode = () => {
    if (typeof window !== 'undefined') {
      const newMode = !isDarkMode;
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', newMode.toString());
      setIsDarkMode(newMode);
    }
  };

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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>DNS 域名解析过程</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>域名系统 | 5 个核心步骤</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)' }}>
                <div className="text-xs" style={{ color: secondaryText }}>当前步骤</div>
              

                <div className="text-xl font-bold" style={{ color: primaryBlue }}>{currentStep + 1} / {steps.length}</div>
              </div>
<button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isDarkMode ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  )}
                </svg>
              </button>
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
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>DNS 完整工作流程详解</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>一、DNS 简介</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>DNS（Domain Name System，域名系统）</span>是互联网的电话簿，将人类可读的域名（如 www.example.com）转换为机器可读的 IP 地址（如 1.2.3.4）。DNS 使用 UDP 协议，默认端口 53，当响应超过 512 字节时切换为 TCP。
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: primaryBlue }}>应用层协议</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>DNS</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>默认端口</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>53（UDP/TCP）</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#10b981' }}>查询类型</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>递归查询 / 迭代查询</div>
                </div>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }} onClick={() => setIsMsgExpanded(!isMsgExpanded)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                        <span className="text-white font-bold text-sm">DNS</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#f59e0b' }}>报文格式</div>
                        <div className="text-lg font-bold" style={{ color: textColor }}>DNS 报文结构</div>
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
                              <span className="text-lg">📋</span>
                              <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>DNS 查询报文</div>
                            </div>
                            <div className="font-mono text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div className="font-bold" style={{ color: '#3b82f6' }}>DNS 首部（12 字节）</div>
                                <div>Transaction ID: 0x1234（事务 ID）</div>
                                <div>Flags: 0x0100（标准查询）</div>
                                <div>Questions: 1, Answers: 0</div>
                                <div>Authority: 0, Additional: 0</div>
                                <div className="font-bold mt-1" style={{ color: '#10b981' }}>问题部分</div>
                                <div>Name: www.example.com</div>
                                <div>Type: A（IPv4 地址）</div>
                                <div>Class: IN（互联网）</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📥</span>
                              <div className="font-bold text-sm" style={{ color: '#10b981' }}>DNS 响应报文</div>
                            </div>
                            <div className="font-mono text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div className="font-bold" style={{ color: '#10b981' }}>DNS 首部</div>
                                <div>Transaction ID: 0x1234</div>
                                <div>Flags: 0x8180（响应+无错误）</div>
                                <div>Questions: 1, Answers: 1</div>
                                <div className="font-bold mt-1" style={{ color: '#3b82f6' }}>回答部分</div>
                                <div>Name: www.example.com</div>
                                <div>Type: A, Class: IN</div>
                                <div>TTL: 3600（缓存时长）</div>
                                <div>IP: 1.2.3.4</div>
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
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>二、DNS 核心概念：七种记录类型、两种查询方式、域名层次结构</h3>
              
              {/* 7 种记录类型 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #64748b', paddingLeft: '10px' }}>七种记录类型</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>A 记录</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>地址记录（Address），将域名映射到 IPv4 地址。最常用的 DNS 记录类型，用于网站访问。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>AAAA 记录</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>IPv6 地址记录，将域名映射到 IPv6 地址。与 A 记录功能相同，但使用 128 位地址。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>CNAME 记录</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>别名记录（Canonical Name），将一个域名指向另一个域名。常用于 CDN 和子域名指向。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>MX 记录</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>邮件交换记录（Mail Exchange），指定邮件服务器的域名和优先级。优先级值越小越优先。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.05)', borderColor: '#ec4899' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ec4899' }} />
                      <span className="font-bold" style={{ color: textColor }}>NS 记录</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>名称服务器记录（Name Server），指定域名的 DNS 服务器。用于域名委派和 DNS 查询。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(20, 184, 166, 0.1)' : 'rgba(20, 184, 166, 0.05)', borderColor: '#14b8a6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#14b8a6' }} />
                      <span className="font-bold" style={{ color: textColor }}>TXT 记录</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>文本记录，存储任意文本信息。用于 SPF 发件人验证、域名所有权验证等。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="font-bold" style={{ color: textColor }}>SOA 记录</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>起始授权记录（Start of Authority），包含该域名的管理信息。每个区域必须有且仅有一个 SOA。</p>
                  </div>
                </div>
              </div>

              {/* 两种查询方式 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>两种查询方式</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>🔄 递归查询</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                      客户端向本地 DNS 服务器发起递归查询，要求服务器必须返回最终结果。如果本地服务器没有缓存，它会代替客户端向其他服务器查询，直到获得答案。客户端只需发送一次请求，等待一个回复。
                    </p>
                    <div className="mt-2 text-xs" style={{ color: secondaryText }}>
                      典型场景：<span className="font-bold" style={{ color: '#3b82f6' }}>家庭电脑 → ISP 的 DNS 服务器</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#f59e0b' }}>🌐 迭代查询</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                      DNS 服务器之间使用迭代查询。服务器不直接返回最终结果，而是告诉客户端"去问谁"。客户端（或本地服务器）根据指引，一步步向不同服务器查询，最终获得答案。
                    </p>
                    <div className="mt-2 text-xs" style={{ color: secondaryText }}>
                      典型场景：<span className="font-bold" style={{ color: '#f59e0b' }}>本地 DNS → 根服务器 → TLD → 权威服务器</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 域名层次结构 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>域名层次结构</div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>根域名服务器</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>全球 13 组根服务器，存储顶级域名（.com, .org, .cn 等）的 NS 记录，是 DNS 查询的起点。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>顶级域名服务器</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>TLD 服务器，管理特定顶级域名（如 .com, .org）。存储该域下所有二级域名的权威服务器信息。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>权威域名服务器</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>最终存储域名和 IP 映射关系的服务器。负责响应对特定域名的查询，返回最终的 A 或 AAAA 记录。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>本地 DNS 服务器</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>ISP 或企业提供的 DNS 缓存服务器。接收客户端的递归查询，缓存查询结果，加速后续查询。</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>三、DNS 解析过程详解</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>步骤 1（递归查询）：</span>客户端向本地 DNS 服务器发送递归查询，请求 www.example.com 的 IP 地址。<br/>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>步骤 2（迭代查询）：</span>本地 DNS 向根服务器查询 → 获取 .com 服务器地址 → 向 .com 服务器查询 → 获取 example.com 权威服务器地址 → 向权威服务器查询 → 获得 IP 地址 1.2.3.4。<br/>
                <span style={{ color: '#10b981', fontWeight: 600 }}>步骤 3（返回结果）：</span>本地 DNS 将 IP 地址返回给客户端，并缓存结果（根据 TTL）。客户端开始建立 TCP 连接。
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>🔗 DNS 缓存机制</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>浏览器缓存</span>
                      <span className="font-bold" style={{ color: '#3b82f6' }}>几秒 - 几分钟</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>操作系统缓存</span>
                      <span className="font-bold" style={{ color: '#8b5cf6' }}>几分钟</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>本地 DNS 缓存</span>
                      <span className="font-bold" style={{ color: '#10b981' }}>TTL 值决定</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>DNS 劫持防范</span>
                      <span className="font-bold" style={{ color: '#f59e0b' }}>DNSSEC 验证</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ DNS 查询流程</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }}>
                      <span className="font-bold" style={{ color: '#3b82f6' }}>①</span>
                      <span>浏览器检查本地缓存</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }}>
                      <span className="font-bold" style={{ color: '#8b5cf6' }}>②</span>
                      <span>检查操作系统 hosts 文件</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }}>
                      <span className="font-bold" style={{ color: '#10b981' }}>③</span>
                      <span>发送到本地 DNS 服务器</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }}>
                      <span className="font-bold" style={{ color: '#f59e0b' }}>④</span>
                      <span>迭代查询各级服务器</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }}>
                      <span className="font-bold" style={{ color: '#10b981' }}>⑤</span>
                      <span>返回 IP 并缓存结果</span>
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
                      <button key={index} onClick={() => handleStepClick(index)} disabled={index > currentStep + 1} className="w-10 h-10 rounded-lg font-bold text-sm transition-all disabled:opacity-30" style={{ backgroundColor: index < currentStep ? 'rgba(34, 197, 94, 0.2)' : index === currentStep ? 'rgba(59, 130, 246, 0.2)' : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', borderColor: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : 'transparent', borderWidth: '2px', color: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : secondaryText, transform: index === currentStep ? 'scale(1.1)' : 'scale(1)' }}>{index + 1}</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Query</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Iterative</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Answer</span></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderColor }}>
                  <span className="text-2xl">{steps[currentStep].icon}</span>
                  <div><h3 className="font-bold text-lg">{steps[currentStep].title}</h3><p className="text-xs" style={{ color: secondaryText }}>步骤 {currentStep + 1} / {steps.length}</p></div>
                </div>
                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: textColor }}>{steps[currentStep].description}</p>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #10b981, #f59e0b)` }} />
                </div>
              </div>

              <div className="rounded-xl border p-4 flex-1" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔗</span>
                  <div><div className="font-bold">当前查询状态</div><div className="text-xs" style={{ color: secondaryText }}>DNS 查询实时状态</div></div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>客户端</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 3 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 3 ? '#3b82f6' : '#64748b' }}>
                      {currentStep === 0 ? 'IDLE' : currentStep === 4 ? 'COMPLETED' : 'QUERYING'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>DNS 服务器</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 3 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 3 ? '#10b981' : '#64748b' }}>
                      {currentStep === 0 ? 'READY' : currentStep === 4 ? 'CACHED' : 'QUERYING'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📦</span>
                  <div><div className="font-bold">报文日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤的 DNS 报文</div></div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '100px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 DNS 报文</span></div>
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

          {/* 报文日志 + 状态快速参考 */}
          <div className="w-full grid grid-cols-2 gap-4 mb-6 lg:col-span-full">
            <div className="rounded-xl border p-4 w-full" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: borderColor }}>
                <span className="text-lg">📦</span>
                <div><div className="font-bold">报文交互日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 DNS 报文</div></div>
              </div>
              <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '120px' }}>
                {packetLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 DNS 报文</span></div>
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
                <div><div className="font-bold">DNS 记录类型快速参考</div><div className="text-xs" style={{ color: secondaryText }}>常见 DNS 资源记录</div></div>
              </div>
              <div className="flex items-center justify-start gap-2 text-xs overflow-x-auto pb-2">
                {Object.entries(recordTypes).map(([type, info]) => (
                  <div key={type} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: info.color, color: 'white' }}>{type}</div>
                    <span style={{ color: secondaryText, maxWidth: '60px', textAlign: 'center', lineHeight: '1.2' }}>{info.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 底部：DNS 查询过程详解 */}
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、DNS 深层机制详解</h2>
            
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                DNS 是互联网基础设施的关键组成部分，除基本的域名解析外，还涉及缓存、安全、负载均衡等高级机制。
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: '#3b82f6' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>⚡ DNS 缓存</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• 减少 DNS 查询延迟</li>
                    <li>• 降低根/TLD 服务器负载</li>
                    <li>• TTL 控制缓存时长</li>
                    <li>• 多级缓存（浏览器→OS→本地 DNS）</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>🛡️ DNSSEC</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• DNS 安全扩展（DNS Security）</li>
                    <li>• 使用数字签名验证 DNS 数据</li>
                    <li>• 防止 DNS 劫持和缓存投毒</li>
                    <li>• 链式信任模型（根→TLD→权威）</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)', borderColor: '#f59e0b' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#f59e0b' }}>⚖️ DNS 负载均衡</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• 一个域名对应多个 IP 地址</li>
                    <li>• DNS 轮询（Round Robin）</li>
                    <li>• 地理位置智能解析</li>
                    <li>• CDN 加速核心机制</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)', borderColor: '#8b5cf6' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#8b5cf6' }}>🔍 常见 DNS 工具</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>nslookup</span> example.com</span>
                      <span>查询 DNS 记录</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>dig</span> example.com ANY</span>
                      <span>详细 DNS 分析</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>traceroute</span></span>
                      <span>网络路径追踪</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)', borderColor: '#ef4444' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#ef4444' }}>⚠️ DNS 常见问题</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>DNS 劫持</span>
                      <span className="font-bold" style={{ color: '#ef4444' }}>DNS 被篡改</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>DNS 缓存投毒</span>
                      <span className="font-bold" style={{ color: '#ef4444' }}>虚假缓存注入</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>DDos 放大攻击</span>
                      <span className="font-bold" style={{ color: '#ef4444' }}>利用 UDP 特性</span>
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
            NetViz - 网络工程可视化平台 | DNS 域名解析动画演示
          </div>
        </div>
      </footer>
    </div>
  );
}
