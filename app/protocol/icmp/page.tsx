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

export default function ICMPPage() {
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
      if (savedMode !== null) setIsDarkMode(savedMode === 'true');
      else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
      }
    }
  }, []);

  const steps: StepInfo[] = [
    {
      phase: '初始状态',
      icon: <Emoji label="📍" />,
      title: 'Ping 测试前',
      description: '主机 A（192.168.1.10）需要测试与主机 B（192.168.1.20）的网络连通性。使用 Ping 命令发送 ICMP Echo Request 报文，检测目标主机是否可达。',
      packets: [],
    },
    {
      phase: '请求发送',
      icon: <Emoji label="📤" />,
      title: '发送 Echo Request',
      description: '主机 A 向主机 B 发送 ICMP Echo Request（回显请求）报文。ICMP 协议位于网络层，封装在 IP 数据包中（协议号=1）。报文包含标识符、序列号和可选数据负载。',
      packets: [{ from: 0, to: 1, type: 'Echo Request', delay: 0 }],
    },
    {
      phase: '响应返回',
      icon: <Emoji label="📥" />,
      title: '接收 Echo Reply',
      description: '主机 B 收到 Echo Request 后，校验报文后立即回复 ICMP Echo Reply（回显应答）报文。主机 A 收到应答后显示"Reply from 192.168.1.20: bytes=32 time<1ms TTL=128"。',
      packets: [{ from: 1, to: 0, type: 'Echo Reply', delay: 0 }],
    },
    {
      phase: '完成',
      icon: <Emoji label="✅" />,
      title: 'Ping 测试完成',
      description: '主机 A 成功收到主机 B 的 Echo Reply，网络连通正常！ICMP 不仅用于 Ping，还用于 Traceroute、Path MTU Discovery 等网络诊断工具。',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'Echo Request': { start: '#3b82f6', end: '#2563eb' },
    'Echo Reply': { start: '#10b981', end: '#059669' },
  };

  const typeColors: Record<string, { bg: string; desc: string }> = {
    '0': { bg: '#10b981', desc: 'Echo Reply' },
    '3': { bg: '#ef4444', desc: '不可达' },
    '5': { bg: '#f59e0b', desc: '重定向' },
    '8': { bg: '#3b82f6', desc: 'Echo Request' },
    '11': { bg: '#8b5cf6', desc: '超时' },
    '13/14': { bg: '#ec4899', desc: '时间戳' },
  };

  useEffect(() => {
    const step = steps[currentStep];
    if (step.packets.length === 0) { setPackets([]); setPacketLogs([]); return; }
    const newPackets: Packet[] = step.packets.map((p) => ({
      type: p.type, from: p.from, to: p.to, progress: 0, delay: p.delay,
      startTime: Date.now() + p.delay, active: false, completed: false, size: 0,
    }));
    setPackets(newPackets);
    setPacketLogs(step.packets.map((p) => {
      const labels = ['主机 A', '主机 B'];
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

      const hostAX = width * 0.25;
      const hostBX = width * 0.75;
      const centerY = height * 0.5;

      const drawNode = (x: number, y: number, label: string, ip: string, color: string, isActive: boolean) => {
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
        const nodeGradient = context.createLinearGradient(x - 50, y - 50, x + 50, y + 50);
        nodeGradient.addColorStop(0, color);
        nodeGradient.addColorStop(1, color + 'cc');
        context.fillStyle = nodeGradient;
        context.beginPath();
        context.roundRect(x - 50, y - 50, 100, 100, 12);
        context.fill();
        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        context.fillRect(x - 35, y - 30, 70, 45);
        context.fillRect(x - 20, y + 15, 40, 8);
        context.fillStyle = 'white';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 75);
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText(ip, x, y + 90);
      };

      context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      context.lineWidth = 2;
      context.setLineDash([5, 8]);
      context.beginPath();
      context.moveTo(hostAX + 60, centerY);
      context.lineTo(hostBX - 60, centerY);
      context.stroke();
      context.setLineDash([]);

      const isHostAActive = currentStep >= 1 && currentStep <= 3;
      const isHostBActive = currentStep >= 1 && currentStep <= 3;
      drawNode(hostAX, centerY, '主机 A', '192.168.1.10', '#3b82f6', isHostAActive);
      drawNode(hostBX, centerY, '主机 B', '192.168.1.20', '#3b82f6', isHostBActive);

      if (currentStep === 3) {
        context.fillStyle = '#22c55e';
        context.font = 'bold 22px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('✓ Ping 测试通过', (hostAX + hostBX) / 2, centerY - 100);
        context.fillStyle = secondaryText;
        context.font = '12px Inter, system-ui, sans-serif';
        context.fillText('Reply from 192.168.1.20: bytes=32 time<1ms TTL=128', (hostAX + hostBX) / 2, centerY - 75);
      }

      const now = Date.now();
      setPackets((prevPackets) => {
        let updated = false;
        const newPackets = prevPackets.map((packet) => {
          if (packet.completed) return packet;
          if (now < packet.startTime) return packet;
          if (!packet.active) { updated = true; return { ...packet, active: true, size: 0 }; }
          if (packet.progress < 1) {
            updated = true;
            return { ...packet, progress: Math.min(1, packet.progress + 0.007), size: Math.min(20, (packet.size || 0) + 0.5) };
          }
          return { ...packet, completed: true };
        });
        return updated ? newPackets : prevPackets;
      });

      packets.forEach((packet) => {
        if (!packet.active) return;
        const positions = [{ x: hostAX, y: centerY }, { x: hostBX, y: centerY }];
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
        context.font = 'bold 7px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 4;
        context.fillText(packet.type === 'Echo Request' ? 'Req' : 'Rep', currentX, currentY);
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="font-medium">返回主页</span>
              </a>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>ICMP 协议与 Ping 诊断</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>网际控制报文协议 | 4 个核心步骤</p>
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
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>ICMP 完整工作流程详解</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>一、ICMP 简介</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>ICMP（Internet Control Message Protocol，网际控制报文协议）</span>用于在 IP 网络设备之间传递控制信息和错误报告。ICMP 封装在 IP 数据包中（协议号=1），主要功能包括网络连通性检测、错误报告和网络诊断。
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: primaryBlue }}>网络层协议</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>ICMP</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>IP 协议号</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>1</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#10b981' }}>主要用途</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>Ping / Traceroute / 错误报告</div>
                </div>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }} onClick={() => setIsMsgExpanded(!isMsgExpanded)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                        <span className="text-white font-bold text-sm">ICMP</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#f59e0b' }}>报文格式</div>
                        <div className="text-lg font-bold" style={{ color: textColor }}>ICMP 报文结构</div>
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
                              <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>Echo Request 报文</div>
                            </div>
                            <div className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div>Type: 8（Echo Request）</div>
                                <div>Code: 0</div>
                                <div>Checksum: 16 位校验和</div>
                                <div>Identifier: 进程 ID 标识</div>
                                <div>Sequence Number: 序列号</div>
                                <div>Data: 可选数据（通常 32 字节）</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📥</span>
                              <div className="font-bold text-sm" style={{ color: '#10b981' }}>Echo Reply 报文</div>
                            </div>
                            <div className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div>Type: 0（Echo Reply）</div>
                                <div>Code: 0</div>
                                <div>Checksum: 16 位校验和</div>
                                <div>Identifier: 与请求相同</div>
                                <div>Sequence Number: 与请求相同</div>
                                <div>Data: 与请求相同的数据</div>
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
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>二、ICMP 核心概念：报文类型、错误报告、诊断工具</h3>
              
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #64748b', paddingLeft: '10px' }}>常见 ICMP 报文类型</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>Type 0 / 8</span>
                    </div>
                    <div className="font-bold text-sm" style={{ color: '#10b981' }}>Echo 请求/应答</div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: secondaryText }}>Ping 命令的核心报文。Type=8 请求，Type=0 应答。用于测试网络连通性和延迟。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="font-bold" style={{ color: textColor }}>Type 3</span>
                    </div>
                    <div className="font-bold text-sm" style={{ color: '#ef4444' }}>目标不可达</div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: secondaryText }}>网络/主机/协议/端口不可达。常见：Code=0 网络不可达，Code=1 主机不可达，Code=3 端口不可达。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>Type 5</span>
                    </div>
                    <div className="font-bold text-sm" style={{ color: '#f59e0b' }}>重定向</div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: secondaryText }}>路由器通知主机有更优路径。用于优化网络路径，减少不必要的中转跳数。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>Type 11</span>
                    </div>
                    <div className="font-bold text-sm" style={{ color: '#8b5cf6' }}>超时</div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: secondaryText }}>TTL 超时。Traceroute 利用此类型探测路径。每经过一跳路由器返回超时通知。</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>ICMP 错误报告与诊断</div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>📢 Ping 命令</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>发送 Echo Request（Type=8），等待 Echo Reply（Type=0）。通过 RTT 判断网络质量。ping -t 持续测试，ping -n 指定次数。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#f59e0b' }}>🔄 Traceroute</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>利用 TTL 超时（Type 11）探测路径。发送 TTL=1,2,3...的 UDP 包，每跳路由返回超时通知。Windows 使用 tracert，Linux 使用 traceroute。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#ef4444' }}>⚠️ 错误报告场景</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>路由器在无法转发数据包时发送 ICMP 错误报文告知源主机。包括网络不可达、主机不可达、端口不可达、需要分片（DF=1）等。</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>常见 ICMP 类型与 Code</div>
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    <table className="w-full text-xs" style={{ color: textColor }}>
                      <thead>
                        <tr>
                          <th className="p-2 text-left font-bold" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderBottom: '2px solid #3b82f6' }}>类型</th>
                          <th className="p-2 text-center font-bold" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderBottom: '2px solid #3b82f6' }}>Code</th>
                          <th className="p-2 text-center font-bold" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderBottom: '2px solid #3b82f6' }}>含义</th>
                          <th className="p-2 text-center font-bold" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderBottom: '2px solid #3b82f6' }}>说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-2 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>0</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: '#10b981' }}>0</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor }}>Echo Reply</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: secondaryText }}>Ping 应答</td></tr>
                        <tr><td className="p-2 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>3</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: '#ef4444' }}>0</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor }}>网络不可达</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: secondaryText }}>路由器无路由</td></tr>
                        <tr><td className="p-2 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>3</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: '#ef4444' }}>1</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor }}>主机不可达</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: secondaryText }}>目标主机无响应</td></tr>
                        <tr><td className="p-2 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>3</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: '#ef4444' }}>3</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor }}>端口不可达</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: secondaryText }}>端口未监听</td></tr>
                        <tr><td className="p-2 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>3</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: '#ef4444' }}>4</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor }}>需分片（DF）</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: secondaryText }}>MTU 问题</td></tr>
                        <tr><td className="p-2 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>5</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: '#f59e0b' }}>0</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor }}>重定向</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: secondaryText }}>更优路径</td></tr>
                        <tr><td className="p-2 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>8</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: '#3b82f6' }}>0</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor }}>Echo Request</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: secondaryText }}>Ping 请求</td></tr>
                        <tr><td className="p-2 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>11</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: '#8b5cf6' }}>0</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor }}>TTL 超时</td><td className="p-2 text-center border-b" style={{ borderColor: borderColor, color: secondaryText }}>Traceroute 利用</td></tr>
                        <tr><td className="p-2" style={{ fontWeight: 600 }}>13/14</td><td className="p-2 text-center" style={{ color: '#ec4899' }}>0</td><td className="p-2 text-center">时间戳</td><td className="p-2 text-center" style={{ color: secondaryText }}>请求/应答</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>三、Ping 工作流程详解</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>步骤 1（构建报文）：</span>主机 A 构建 ICMP Echo Request 报文，Type=8，Code=0，填充标识符、序列号和 32 字节数据。<br/>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>步骤 2（IP 封装与发送）：</span>ICMP 报文被封装在 IP 数据包中（协议号=1），通过路由转发到达主机 B。<br/>
                <span style={{ color: '#10b981', fontWeight: 600 }}>步骤 3（响应生成）：</span>主机 B 收到后，交换源/目的 IP，将 Type 改为 0（Echo Reply），重新计算校验和并回复。<br/>
                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>步骤 4（结果输出）：</span>主机 A 收到 Reply 后计算 RTT，输出"Reply from ... time=... TTL=..."，判断连通性。
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>🔧 Ping 常用命令</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>ping</span> 192.168.1.1</span>
                      <span>默认 4 次探测</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>ping -t</span> 192.168.1.1</span>
                      <span>持续 Ping</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>ping -n 10</span></span>
                      <span>指定次数</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>ping -l 1000</span></span>
                      <span>指定数据大小</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>📊 Ping 输出解读</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="p-2 rounded font-mono" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                      <div>Reply from 192.168.1.1: bytes=32</div>
                      <div>time=12ms TTL=128</div>
                      <div>--- 统计 ---</div>
                      <div>已发送=4，已接收=4</div>
                      <div>最短=1ms，最长=12ms</div>
                      <div>平均=5ms</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Echo Request</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Echo Reply</span></div>
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
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #10b981)` }} />
                </div>
              </div>
              <div className="rounded-xl border p-4 flex-1" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔗</span>
                  <div><div className="font-bold">诊断状态</div><div className="text-xs" style={{ color: secondaryText }}>ICMP 诊断实时状态</div></div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>主机 A</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 2 ? '#3b82f6' : '#64748b' }}>
                      {currentStep === 0 ? 'IDLE' : currentStep === 3 ? 'COMPLETED' : currentStep === 1 ? 'SENDING' : 'RECEIVING'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>主机 B</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 2 ? '#10b981' : '#64748b' }}>
                      {currentStep <= 1 ? 'LISTEN' : currentStep === 2 ? 'RESPONDING' : 'IDLE'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📦</span>
                  <div><div className="font-bold">报文日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤的 ICMP 报文</div></div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '100px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 ICMP 报文</span></div>
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

          <div className="w-full grid grid-cols-2 gap-4 mb-6 lg:col-span-full">
            <div className="rounded-xl border p-4 w-full" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: borderColor }}>
                <span className="text-lg">📦</span>
                <div><div className="font-bold">报文交互日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 ICMP 报文</div></div>
              </div>
              <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '120px' }}>
                {packetLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 ICMP 报文</span></div>
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
                <div><div className="font-bold">ICMP 类型参考</div><div className="text-xs" style={{ color: secondaryText }}>常见 ICMP 报文类型</div></div>
              </div>
              <div className="flex items-center justify-start gap-2 text-xs overflow-x-auto pb-2">
                {Object.entries(typeColors).map(([type, info]) => (
                  <div key={type} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="px-3 py-1.5 rounded-full font-bold text-xs" style={{ backgroundColor: info.bg, color: 'white' }}>{type}</div>
                    <span style={{ color: secondaryText, textAlign: 'center' }}>{info.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、ICMP 报文首部详解</h2>
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                ICMP 报文封装在 IP 数据包中（协议号=1），首部为 8 字节，加上可变数据部分。报文由类型（Type）、代码（Code）和校验和等字段组成。
              </p>
              
              <div className="overflow-x-auto mb-6">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-8 p-2 rounded-tl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>类型（Type）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>0/3/5/8/11 等</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>代码（Code）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>类型下的细分</div>
                    </div>
                    <div className="col-span-16 p-2 rounded-tr-lg" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>校验和（Checksum）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>覆盖整个 ICMP 报文</div>
                    </div>

                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>标识符（Identifier）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位（Echo 请求/应答使用）</div>
                      <div className="text-xs" style={{ color: textColor }}>用于匹配请求和响应，通常为进程 ID</div>
                    </div>

                    <div className="col-span-32 p-2 rounded-b-lg" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <div className="font-bold" style={{ color: '#ec4899' }}>序列号（Sequence Number）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位（Echo 请求/应答使用）</div>
                      <div className="text-xs" style={{ color: textColor }}>递增序列，用于判断丢包和乱序</div>
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
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | ICMP 协议与 Ping 诊断动画演示</div>
        </div>
      </footer>
    </div>
  );
}
