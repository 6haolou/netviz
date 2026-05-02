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

export default function IPPage() {
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
      title: 'IP 转发前',
      description: '主机 A（192.168.1.10）需要向主机 B（192.168.2.20）发送数据包。源地址和目的地址不在同一网段，需要通过路由器进行转发。两个网络通过路由器 R1 连接。',
      packets: [],
    },
    {
      phase: '路由查找',
      icon: <Emoji label="🔍" />,
      title: '查找路由表',
      description: '主机 A 检查目的 IP 192.168.2.20，发现不在本地网段（192.168.1.0/24）。主机 A 将数据包发送给默认网关 192.168.1.1（路由器 R1）。数据包包含源/目的 IP、TTL 等首部信息。',
      packets: [{ from: 0, to: 1, type: 'IP 数据包', delay: 0 }],
    },
    {
      phase: '路由器转发',
      icon: <Emoji label="🔄" />,
      title: '路由器转发数据包',
      description: '路由器 R1 收到数据包后，查看 IP 首部的目的地址 192.168.2.20，查找路由表，发现目的网络 192.168.2.0/24 从 G0/1 接口可达。TTL 减 1，重新计算校验和后转发。',
      packets: [{ from: 1, to: 2, type: 'IP 数据包', delay: 0 }],
    },
    {
      phase: '到达目标',
      icon: <Emoji label="📥" />,
      title: '数据包到达目标',
      description: '数据包成功到达主机 B 所在的网络 192.168.2.0/24，最终送达主机 B（192.168.2.20）。主机 B 检查 IP 首部，确认目的地址是自己，处理数据包内容。IP 路由转发完成！',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'IP 数据包': { start: '#3b82f6', end: '#2563eb' },
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
      const labels = ['主机 A', '路由器 R1', '主机 B'];
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

      const hostAX = width * 0.15;
      const routerX = width * 0.5;
      const hostBX = width * 0.85;
      const centerY = height * 0.5;

      const drawNode = (x: number, y: number, label: string, ip: string, color: string, isActive: boolean, isRouter: boolean) => {
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

        if (isRouter) {
          context.beginPath();
          context.roundRect(x - 50, y - 40, 100, 80, 12);
          context.fill();
          context.strokeStyle = color;
          context.lineWidth = 4;
          context.beginPath();
          context.moveTo(x - 30, y - 40);
          context.lineTo(x - 30, y - 55);
          context.moveTo(x + 30, y - 40);
          context.lineTo(x + 30, y - 55);
          context.stroke();
          context.fillStyle = 'rgba(255, 255, 255, 0.3)';
          context.fillRect(x - 40, y - 25, 80, 4);
          context.fillRect(x - 40, y - 15, 80, 4);
          context.fillRect(x - 40, y - 5, 80, 4);
        } else {
          context.beginPath();
          context.roundRect(x - 50, y - 50, 100, 100, 12);
          context.fill();
          context.fillStyle = 'rgba(255, 255, 255, 0.2)';
          context.fillRect(x - 35, y - 30, 70, 45);
          context.fillRect(x - 20, y + 15, 40, 8);
        }
        context.fillStyle = 'white';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 75);
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText(ip, x, y + 90);
      };

      const isHostAActive = currentStep >= 1 && currentStep <= 2;
      const isRouterActive = currentStep >= 1 && currentStep <= 3;
      const isHostBActive = currentStep === 3;

      context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      context.lineWidth = 2;
      context.setLineDash([5, 8]);
      context.beginPath();
      context.moveTo(hostAX + 60, centerY);
      context.lineTo(routerX - 60, centerY);
      context.moveTo(routerX + 60, centerY);
      context.lineTo(hostBX - 60, centerY);
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = '#8b5cf6';
      context.font = 'bold 11px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('192.168.1.0/24', width * 0.28, height * 0.2);
      context.fillText('192.168.2.0/24', width * 0.72, height * 0.2);

      drawNode(hostAX, centerY, '主机 A', '192.168.1.10', '#3b82f6', isHostAActive, false);
      drawNode(routerX, centerY, '路由器 R1', '192.168.1.1', '#10b981', isRouterActive, true);
      drawNode(hostBX, centerY, '主机 B', '192.168.2.20', '#3b82f6', isHostBActive, false);

      if (currentStep === 3) {
        context.fillStyle = '#22c55e';
        context.font = 'bold 22px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('✓ IP 路由转发完成', width / 2, centerY - 100);
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
        const positions = [{ x: hostAX, y: centerY }, { x: routerX, y: centerY }, { x: hostBX, y: centerY }];
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
        context.fillText('IP', currentX, currentY);
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="font-medium">返回主页</span>
              </a>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>IP 路由转发过程</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>网际协议 | 4 个核心步骤</p>
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
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>IP 完整工作流程详解</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>一、IP 简介</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>IP（Internet Protocol，网际协议）</span>是 TCP/IP 协议栈中网络层的核心协议，负责在不同网络之间进行数据包的路由和转发。IP 提供无连接、不可靠的数据报投递服务，每个数据包独立路由。当前主流为 IPv4，IPv6 正在逐步推广。
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: primaryBlue }}>网络层协议</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>IPv4 / IPv6</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>地址长度</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>32 位（IPv4）/ 128 位（IPv6）</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#10b981' }}>首部长度</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>20 - 60 字节</div>
                </div>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }} onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                        <span className="text-white font-bold text-sm">IP</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#f59e0b' }}>首部结构</div>
                        <div className="text-lg font-bold" style={{ color: textColor }}>IPv4 / IPv6 首部字段详解</div>
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
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📐</span>
                              <div className="font-bold text-sm" style={{ color: '#f59e0b' }}>IPv4 首部结构</div>
                            </div>
                            <div className="text-xs leading-relaxed space-y-1" style={{ color: secondaryText }}>
                              <div>• 版本（4位）+ 首部长度（4位）+ 服务类型（8位）</div>
                              <div>• 总长度（16位）+ 标识（16位）+ 标志（3位）+ 片偏移（13位）</div>
                              <div>• TTL（8位）+ 协议（8位）+ 首部校验和（16位）</div>
                              <div>• 源 IP 地址（32位）+ 目的 IP 地址（32位）</div>
                              <div>• 选项（0-40字节，可变）</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📐</span>
                              <div className="font-bold text-sm" style={{ color: primaryBlue }}>IPv6 首部结构</div>
                            </div>
                            <div className="text-xs leading-relaxed space-y-1" style={{ color: secondaryText }}>
                              <div>• 版本（4位）+ 流量类型（8位）+ 流标签（20位）</div>
                              <div>• 有效载荷长度（16位）+ 下一个首部（8位）+ 跳数限制（8位）</div>
                              <div>• 源 IPv6 地址（128位）+ 目的 IPv6 地址（128位）</div>
                              <div>• 首部固定为 40 字节，无校验和</div>
                              <div>• 无分片字段（Path MTU Discovery）</div>
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
                                <span className="text-xs" style={{ color: secondaryText }}>无连接</span>
                                <span className="text-xs font-bold" style={{ color: '#10b981' }}>无需建立连接</span>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: secondaryText }}>不可靠</span>
                                <span className="text-xs font-bold" style={{ color: '#10b981' }}>尽最大努力交付</span>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: secondaryText }}>无状态</span>
                                <span className="text-xs font-bold" style={{ color: '#10b981' }}>每个包独立处理</span>
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
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>二、IP 核心概念：IPv4 首部字段、IP 地址分类、路由转发</h3>
              
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #64748b', paddingLeft: '10px' }}>IPv4 首部关键字段</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>版本</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>4 位，标识 IP 版本号。IPv4 值为 4，IPv6 值为 6。接收方根据此字段确定如何解析后续内容。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>TTL</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>8 位，数据包生存时间。每经过一个路由器减 1，为 0 时丢弃并发送 ICMP 超时通知。防止无限路由循环。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>协议</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>8 位，标识上层协议类型。常见值：1（ICMP）、6（TCP）、17（UDP）。接收端据此交付给正确协议。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>分片相关</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>标识（16位）+ 标志（3位）+ 片偏移（13位）。当数据包超过 MTU 时进行分片，目的端重组。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.05)', borderColor: '#ec4899' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ec4899' }} />
                      <span className="font-bold" style={{ color: textColor }}>源 IP 地址</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>32 位，发送方的 IP 地址。接收方用此地址回复数据包。在整个传输过程中保持不变。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(14, 184, 166, 0.1)' : 'rgba(14, 184, 166, 0.05)', borderColor: '#0ea5e9' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0ea5e9' }} />
                      <span className="font-bold" style={{ color: textColor }}>目的 IP 地址</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>32 位，最终接收方的 IP 地址。路由器根据此地址查找路由表，确定转发路径。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="font-bold" style={{ color: textColor }}>首部校验和</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>16 位，仅校验 IP 首部。每经过一个路由器 TTL 变化后需重新计算。数据部分由上层协议校验。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.05)', borderColor: '#64748b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#64748b' }} />
                      <span className="font-bold" style={{ color: textColor }}>总长度</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>16 位，IP 数据包总长度（首部+数据），最大 65535 字节。数据部分长度 = 总长度 - 首部长度。</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>IP 地址分类</div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm mb-1" style={{ color: '#3b82f6' }}>A 类</div>
                    <div className="text-xs" style={{ color: textColor }}>0.0.0.0 - 127.255.255.255</div>
                    <div className="text-xs" style={{ color: secondaryText }}>大型网络，/8</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="font-bold text-sm mb-1" style={{ color: '#10b981' }}>B 类</div>
                    <div className="text-xs" style={{ color: textColor }}>128.0.0.0 - 191.255.255.255</div>
                    <div className="text-xs" style={{ color: secondaryText }}>中型网络，/16</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="font-bold text-sm mb-1" style={{ color: '#f59e0b' }}>C 类</div>
                    <div className="text-xs" style={{ color: textColor }}>192.0.0.0 - 223.255.255.255</div>
                    <div className="text-xs" style={{ color: secondaryText }}>小型网络，/24</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="font-bold text-sm mb-1" style={{ color: '#8b5cf6' }}>D 类</div>
                    <div className="text-xs" style={{ color: textColor }}>224.0.0.0 - 239.255.255.255</div>
                    <div className="text-xs" style={{ color: secondaryText }}>组播地址</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="font-bold text-sm mb-1" style={{ color: '#ef4444' }}>E 类</div>
                    <div className="text-xs" style={{ color: textColor }}>240.0.0.0 - 255.255.255.255</div>
                    <div className="text-xs" style={{ color: secondaryText }}>保留/实验</div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>路由转发三要素</div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>🔍 路由表</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>存储目的网络/掩码、下一跳地址、出接口等信息。路由器根据目的 IP 查找最精确匹配的路由条目。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#f59e0b' }}>🔄 下一跳</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>到达目的网络的下一个路由器地址。数据包逐跳转发，每个路由器只负责将数据包发送到下一跳。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>🎯 默认网关</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>当目的地址不在本地路由表中时，数据包发送到默认网关（0.0.0.0/0）。通常是连接 ISP 的路由器。</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>三、IP 数据包转发过程详解</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>步骤 1（封装）：</span>主机 A 构建 IP 数据包，填写源 IP（192.168.1.10）、目的 IP（192.168.2.20）、TTL=64 等字段。<br/>
                <span style={{ color: '#10b981', fontWeight: 600 }}>步骤 2（网关转发）：</span>发现目的地址不在同一网段，数据包发送到默认网关 192.168.1.1（路由器 R1）。<br/>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>步骤 3（路由查找）：</span>路由器 R1 查看路由表，找到目的网络 192.168.2.0/24 的出接口 G0/1，TTL 减 1 后转发。<br/>
                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>步骤 4（交付）：</span>数据包到达主机 B 所在网络，主机 B 确认目的 IP 是自己，处理数据包。
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>📦 IP 封装过程</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>应用层数据</span>
                      <span className="font-bold" style={{ color: '#3b82f6' }}>HTTP/DNS 等</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>↓ 传输层封装</span>
                      <span className="font-bold" style={{ color: '#8b5cf6' }}>TCP/UDP 首部</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>↓ 网络层封装</span>
                      <span className="font-bold" style={{ color: '#10b981' }}>IP 首部 + 数据</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>↓ 数据链路层封装</span>
                      <span className="font-bold" style={{ color: '#f59e0b' }}>帧首部 + IP 包</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ IPv4 vs IPv6</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>地址长度</span>
                      <span className="font-bold" style={{ color: '#10b981' }}>32位 vs 128位</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>首部长度</span>
                      <span className="font-bold" style={{ color: '#10b981' }}>20-60B vs 40B 固定</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>分片机制</span>
                      <span className="font-bold" style={{ color: '#10b981' }}>路由器 vs 发送端</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span>校验和</span>
                      <span className="font-bold" style={{ color: '#10b981' }}>有 vs 无（依赖链路）</span>
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
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>IP 数据包</span></div>
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
                  <div><div className="font-bold">转发状态</div><div className="text-xs" style={{ color: secondaryText }}>IP 数据包实时状态</div></div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>主机 A</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 2 ? '#3b82f6' : '#64748b' }}>
                      {currentStep === 0 ? 'IDLE' : currentStep >= 3 ? 'SENT' : 'SENDING'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>路由器 R1</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 2 ? '#10b981' : '#64748b' }}>
                      {currentStep === 2 ? 'FORWARDING' : currentStep >= 1 ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📦</span>
                  <div><div className="font-bold">报文日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤的 IP 报文</div></div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '100px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 IP 报文</span></div>
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
                <div><div className="font-bold">报文交互日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 IP 报文</div></div>
              </div>
              <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '120px' }}>
                {packetLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 IP 报文</span></div>
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
                <div><div className="font-bold">IP 地址分类参考</div><div className="text-xs" style={{ color: secondaryText }}>IPv4 地址类别一览</div></div>
              </div>
              <div className="flex items-center justify-start gap-2 text-xs overflow-x-auto pb-2">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#3b82f6', color: 'white' }}>A</div>
                  <span style={{ color: secondaryText }}>大型 /8</span>
                </div>
                <div style={{ color: '#64748b' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#10b981', color: 'white' }}>B</div>
                  <span style={{ color: secondaryText }}>中型 /16</span>
                </div>
                <div style={{ color: '#64748b' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#f59e0b', color: 'white' }}>C</div>
                  <span style={{ color: secondaryText }}>小型 /24</span>
                </div>
                <div style={{ color: '#64748b' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>D</div>
                  <span style={{ color: secondaryText }}>组播</span>
                </div>
                <div style={{ color: '#64748b' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#ef4444', color: 'white' }}>E</div>
                  <span style={{ color: secondaryText }}>保留</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、IPv4 报文首部详解</h2>
            
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                IPv4 首部是 IP 协议的核心组成部分，包含版本、首部长度、服务类型、总长度、标识、标志、片偏移、TTL、协议、首部校验和、源/目的 IP 地址等关键字段。标准 IPv4 首部为 20 字节，可选字段可扩展到 60 字节。
              </p>
              
              {/* 首部结构可视化 */}
              <div className="overflow-x-auto mb-6">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    {/* 第1行：版本 + 首部长度 + 服务类型 + 总长度 */}
                    <div className="col-span-4 p-2 rounded-tl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>版本</div>
                      <div className="text-xs" style={{ color: secondaryText }}>4位</div>
                      <div className="text-xs" style={{ color: textColor }}>IPv4=4</div>
                    </div>
                    <div className="col-span-4 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>首部长度</div>
                      <div className="text-xs" style={{ color: secondaryText }}>4位</div>
                      <div className="text-xs" style={{ color: textColor }}>20-60B</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>服务类型（DSCP+ECN）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>区分服务 + 拥塞通知</div>
                    </div>
                    <div className="col-span-16 p-2 rounded-tr-lg" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>总长度（Total Length）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>首部+数据，最大65535字节</div>
                    </div>

                    {/* 第2行：标识 + 标志 + 片偏移 */}
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <div className="font-bold" style={{ color: '#ec4899' }}>标识（Identification）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>标识数据包，用于分片重组</div>
                    </div>
                    <div className="col-span-3 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}>
                      <div className="font-bold text-xs" style={{ color: '#ef4444' }}>标志</div>
                      <div className="text-xs" style={{ color: secondaryText }}>3位</div>
                      <div className="text-xs" style={{ color: textColor }}>DF/MF</div>
                    </div>
                    <div className="col-span-13 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>片偏移（Fragment Offset）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>13位</div>
                      <div className="text-xs" style={{ color: textColor }}>分片在原包中的位置</div>
                    </div>

                    {/* 第3行：TTL + 协议 + 首部校验和 */}
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>TTL</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>生存时间，每跳减1</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>协议（Protocol）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>TCP=6, UDP=17, ICMP=1</div>
                    </div>
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>首部校验和（Header Checksum）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>仅校验 IP 首部，每跳重新计算</div>
                    </div>

                    {/* 第4行：源 IP 地址 */}
                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>源 IP 地址（Source IP Address）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>发送方的 IP 地址，如 192.168.1.10</div>
                    </div>

                    {/* 第5行：目的 IP 地址 */}
                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <div className="font-bold" style={{ color: '#ec4899' }}>目的 IP 地址（Destination IP Address）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>最终接收方的 IP 地址，如 192.168.2.20</div>
                    </div>

                    {/* 第6行：选项（可选） */}
                    <div className="col-span-32 p-2 rounded-b-lg" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)', border: '2px dashed #64748b' }}>
                      <div className="font-bold" style={{ color: '#64748b' }}>选项（Options）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>0-320位（0-40字节），可选，如安全、时间戳、路由记录等</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: '#3b82f6' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>🔧 子网掩码</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• 区分网络位和主机位</li>
                    <li>• 常见：255.0.0.0（/8）、255.255.0.0（/16）、255.255.255.0（/24）</li>
                    <li>• VLSM 实现子网划分</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>🔄 NAT 网络地址转换</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• 私有 IP 转换为公网 IP</li>
                    <li>• 节省公网 IP 地址</li>
                    <li>• 常用：SNAT / DNAT / PAT</li>
                    <li>• 私有网段：10.x、172.16-31.x、192.168.x</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)', borderColor: '#f59e0b' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#f59e0b' }}>📦 分片与重组</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• MTU 限制数据包最大尺寸</li>
                    <li>• 超过 MTU 时路由器分片</li>
                    <li>• 目的主机进行重组</li>
                    <li>• IPv6 中只有发送端分片</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>五、IPv6 协议详解</h2>
            
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>IPv6（Internet Protocol version 6）</span>是下一代网际协议，旨在解决 IPv4 地址耗尽问题。IPv6 使用 128 位地址，提供约 3.4×10³⁸ 个地址。IPv6 首部固定为 40 字节，结构更简洁高效。
              </p>

              <div className="overflow-x-auto mb-6">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-4 p-2 rounded-tl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>版本</div>
                      <div className="text-xs" style={{ color: secondaryText }}>4位</div>
                      <div className="text-xs" style={{ color: textColor }}>IPv6=6</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>流量类型</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>类似 IPv4 服务类型</div>
                    </div>
                    <div className="col-span-20 p-2 rounded-tr-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>流标签（Flow Label）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>20位</div>
                      <div className="text-xs" style={{ color: textColor }}>标识特定流，用于 QoS</div>
                    </div>

                    <div className="col-span-10 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>有效载荷长度</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <div className="font-bold" style={{ color: '#ec4899' }}>下一个首部</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                    </div>
                    <div className="col-span-14 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}>
                      <div className="font-bold" style={{ color: '#ef4444' }}>跳数限制</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                    </div>

                    <div className="col-span-32 p-3" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>源 IPv6 地址（Source Address）- 128 位</div>
                      <div className="text-xs" style={{ color: secondaryText }}>例如：2001:0db8:85a3:0000:0000:8a2e:0370:7334</div>
                    </div>

                    <div className="col-span-32 p-3 rounded-b-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>目的 IPv6 地址（Destination Address）- 128 位</div>
                      <div className="text-xs" style={{ color: secondaryText }}>例如：fe80::1（链路本地地址）</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: '#3b82f6' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>📐 IPv6 地址格式</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• 128 位，8 组 16 位十六进制数</li>
                    <li>• 每组前导零可省略，连续零可用 :: 替代</li>
                    <li>• 示例：2001:db8::1</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>🔗 IPv6 单播地址类型</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• <span className="font-bold" style={{ color: '#10b981' }}>全球单播地址（Global Unicast）</span></li>
                    <li className="pl-4">2000::/3，公网可路由</li>
                    <li>• <span className="font-bold" style={{ color: '#3b82f6' }}>唯一本地地址（Unique Local）</span></li>
                    <li className="pl-4">FC00::/7，类似 IPv4 私有地址</li>
                    <li>• <span className="font-bold" style={{ color: '#f59e0b' }}>链路本地地址（Link-Local）</span></li>
                    <li className="pl-4">FE80::/10，同一链路通信</li>
                    <li>• <span className="font-bold" style={{ color: '#8b5cf6' }}>回环地址（Loopback）</span></li>
                    <li className="pl-4">::1/128，类似 127.0.0.1</li>
                    <li>• <span className="font-bold" style={{ color: '#ec4899' }}>未指定地址（Unspecified）</span></li>
                    <li className="pl-4">::/128，类似 0.0.0.0</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)', borderColor: '#f59e0b' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#f59e0b' }}>⚡ IPv6 新特性</div>
                  <ul className="text-xs space-y-1" style={{ color: secondaryText }}>
                    <li>• SLAAC 无状态地址自动配置</li>
                    <li>• NDP 邻居发现协议</li>
                    <li>• 内置 IPsec 安全支持</li>
                    <li>• 不再需要 NAT</li>
                  </ul>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="font-bold text-sm mb-3" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>IPv4 vs IPv6 对比</div>
                  <table className="w-full text-xs" style={{ color: textColor }}>
                    <thead>
                      <tr>
                        <th className="p-3 text-left font-bold" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderBottom: '2px solid #3b82f6' }}>对比项</th>
                        <th className="p-3 text-center font-bold" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderBottom: '2px solid #3b82f6' }}>IPv4</th>
                        <th className="p-3 text-center font-bold" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)', borderBottom: '2px solid #10b981' }}>IPv6</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="p-3 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>地址长度</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#3b82f6' }}>32 位</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#10b981' }}>128 位</td></tr>
                      <tr><td className="p-3 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>首部长度</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#3b82f6' }}>20-60 字节</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#10b981' }}>40 字节（固定）</td></tr>
                      <tr><td className="p-3 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>校验和</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#3b82f6' }}>有（每跳重新计算）</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#10b981' }}>无（依赖链路层）</td></tr>
                      <tr><td className="p-3 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>分片</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#3b82f6' }}>路由器分片</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#10b981' }}>仅发送端分片</td></tr>
                      <tr><td className="p-3 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>地址配置</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#3b82f6' }}>DHCP</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#10b981' }}>SLAAC + DHCPv6</td></tr>
                      <tr><td className="p-3 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>ARP</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#3b82f6' }}>ARP 广播查询</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#10b981' }}>NDP 邻居发现</td></tr>
                      <tr><td className="p-3 border-b" style={{ borderColor: borderColor, fontWeight: 600 }}>广播</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#3b82f6' }}>有广播地址</td><td className="p-3 text-center border-b" style={{ borderColor: borderColor, color: '#10b981' }}>无广播，使用多播</td></tr>
                      <tr><td className="p-3" style={{ fontWeight: 600 }}>NAT</td><td className="p-3 text-center" style={{ color: '#3b82f6' }}>普适（地址不足）</td><td className="p-3 text-center" style={{ color: '#10b981' }}>无需 NAT（地址充足）</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | IP 路由转发动画演示</div>
        </div>
      </footer>
    </div>
  );
}
