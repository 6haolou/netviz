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

export default function ARPPage() {
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
      title: 'ARP 请求前',
      description: '主机 A（192.168.1.100）需要向主机 B（192.168.1.200）发送数据，已知目标 IP 地址，但不知道目标 MAC 地址。在数据链路层必须知道目标 MAC 地址才能封装以太网帧。',
      packets: [],
    },
    {
      phase: '广播请求',
      icon: <Emoji label="📢" />,
      title: 'ARP 广播请求',
      description: '主机 A 发送 ARP 请求报文，使用广播 MAC 地址（FF:FF:FF:FF:FF:FF），询问"IP 192.168.1.200 的 MAC 地址是什么？"。同一网段所有主机都能收到此广播。',
      packets: [{ from: 0, to: 1, type: 'ARP Request', delay: 0 }],
    },
    {
      phase: '单播响应',
      icon: <Emoji label="📥" />,
      title: 'ARP 单播响应',
      description: '只有主机 B 识别出自己的 IP 被查询，发送 ARP 响应报文（单播），回复"我的 MAC 地址是 00:0c:29:aa:bb:cc"。其他主机忽略该请求。',
      packets: [{ from: 1, to: 0, type: 'ARP Response', delay: 0 }],
    },
    {
      phase: '解析完成',
      icon: <Emoji label="✅" />,
      title: 'ARP 解析完成',
      description: '主机 A 成功获得主机 B 的 MAC 地址 00:0c:29:aa:bb:cc，并将其存入 ARP 缓存表。现在可以封装以太网帧开始数据传输！',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'ARP Request': { start: '#3b82f6', end: '#2563eb' },
    'ARP Response': { start: '#10b981', end: '#059669' },
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

      const drawNode = (x: number, y: number, label: string, ip: string, mac: string, color: string, isActive: boolean) => {
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
        context.fillText(mac, x, y + 105);
      };

      context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      context.lineWidth = 2;
      context.setLineDash([5, 8]);
      context.beginPath();
      context.moveTo(hostAX + 60, centerY);
      context.lineTo(hostBX - 60, centerY);
      context.stroke();
      context.setLineDash([]);

      const isHostAActive = currentStep >= 1 && currentStep <= 2;
      const isHostBActive = currentStep >= 1 && currentStep <= 3;
      drawNode(hostAX, centerY, '主机 A', '192.168.1.100', '00:0c:29:11:22:33', '#3b82f6', isHostAActive);
      drawNode(hostBX, centerY, '主机 B', '192.168.1.200', '00:0c:29:aa:bb:cc', '#3b82f6', isHostBActive);

      if (currentStep === 3) {
        context.fillStyle = '#22c55e';
        context.font = 'bold 22px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('✓ ARP 解析完成', (hostAX + hostBX) / 2, centerY - 100);
        context.fillStyle = secondaryText;
        context.font = '13px Inter, system-ui, sans-serif';
        context.fillText('192.168.1.200 → 00:0c:29:aa:bb:cc', (hostAX + hostBX) / 2, centerY - 75);
      }

      if (currentStep === 1) {
        context.save();
        context.strokeStyle = '#3b82f6';
        context.lineWidth = 1.5;
        context.setLineDash([3, 4]);
        context.beginPath();
        context.arc(hostAX + 50, centerY, (hostBX - hostAX) * 0.35 * Math.min(1, (Date.now() % 2000) / 1000), 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = '#3b82f6';
        context.font = '10px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('📢 广播 FF:FF:FF:FF:FF:FF', (hostAX + hostBX) / 2, centerY - 50);
        context.restore();
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
        const label = packet.type === 'ARP Request' ? 'ARP\nReq' : 'ARP\nRes';
        context.fillText(packet.type === 'ARP Request' ? 'Req' : 'Res', currentX, currentY);
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

  const opColors: Record<string, string> = {
    '请求': '#3b82f6',
    '响应': '#10b981',
  };

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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>ARP 地址解析过程</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>地址解析协议 | 4 个核心步骤</p>
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
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>ARP 完整工作流程详解</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>一、ARP 简介</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>ARP（Address Resolution Protocol，地址解析协议）</span>用于将 IP 地址解析为 MAC 地址，实现局域网内的通信。ARP 工作在数据链路层和网络层之间，通过广播请求和单播响应的机制完成 IP 到 MAC 的映射。
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: primaryBlue }}>协议位置</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>网络层 ↔ 数据链路层</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>帧类型</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>广播请求 / 单播响应</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#10b981' }}>以太网类型</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>0x0806</div>
                </div>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }} onClick={() => setIsMsgExpanded(!isMsgExpanded)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                        <span className="text-white font-bold text-sm">ARP</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#f59e0b' }}>报文格式</div>
                        <div className="text-lg font-bold" style={{ color: textColor }}>ARP 报文结构详解</div>
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
                              <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>ARP 请求报文</div>
                            </div>
                            <div className="font-mono text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div>硬件类型: 以太网 (0x0001)</div>
                                <div>协议类型: IPv4 (0x0800)</div>
                                <div>操作码: 请求 (1)</div>
                                <div>发送端 MAC: 00:0c:29:11:22:33</div>
                                <div>发送端 IP: 192.168.1.100</div>
                                <div>目标 MAC: 00:00:00:00:00:00（未知）</div>
                                <div>目标 IP: 192.168.1.200</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📥</span>
                              <div className="font-bold text-sm" style={{ color: '#10b981' }}>ARP 响应报文</div>
                            </div>
                            <div className="font-mono text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div>硬件类型: 以太网 (0x0001)</div>
                                <div>协议类型: IPv4 (0x0800)</div>
                                <div>操作码: 响应 (2)</div>
                                <div>发送端 MAC: 00:0c:29:aa:bb:cc</div>
                                <div>发送端 IP: 192.168.1.200</div>
                                <div>目标 MAC: 00:0c:29:11:22:33</div>
                                <div>目标 IP: 192.168.1.100</div>
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
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>二、ARP 核心概念：两种操作类型、缓存机制、安全威胁</h3>
              
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #64748b', paddingLeft: '10px' }}>两种操作类型</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>ARP 请求（Opcode=1）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>广播发送，目标 MAC 地址为 FF:FF:FF:FF:FF:FF。询问"谁的 IP 是 192.168.1.200？"，同一广播域内所有主机都会收到。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>ARP 响应（Opcode=2）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>单播回复，只有目标 IP 地址匹配的主机回复。告诉请求方"我的 MAC 地址是 XX:XX:XX:XX:XX:XX"。</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>ARP 缓存机制</div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#3b82f6' }}>📋 缓存表</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>存储 IP-MAC 映射关系。每次解析成功后自动添加，减少广播次数。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#f59e0b' }}>⏱️ 超时机制</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>ARP 条目有生存时间（TTL），超时后自动删除。动态条目通常 2 分钟，静态条目永久有效。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="font-bold text-sm mb-2" style={{ color: '#ef4444' }}>⚠️ ARP 欺骗</div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>攻击者发送伪造的 ARP 响应，篡改目标主机的 ARP 缓存，实施中间人攻击。可通过静态 ARP 或 DAI 防御。</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>ARP 报文帧结构</div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>硬件类型</div>
                    <div className="text-xs" style={{ color: secondaryText }}>2 字节</div>
                    <div className="text-xs" style={{ color: textColor }}>以太网=1</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="font-bold text-sm" style={{ color: '#8b5cf6' }}>协议类型</div>
                    <div className="text-xs" style={{ color: secondaryText }}>2 字节</div>
                    <div className="text-xs" style={{ color: textColor }}>IPv4=0x0800</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="font-bold text-sm" style={{ color: '#10b981' }}>操作码</div>
                    <div className="text-xs" style={{ color: secondaryText }}>2 字节</div>
                    <div className="text-xs" style={{ color: textColor }}>请求=1 / 响应=2</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="font-bold text-sm" style={{ color: '#f59e0b' }}>硬件地址长度</div>
                    <div className="text-xs" style={{ color: secondaryText }}>1 字节</div>
                    <div className="text-xs" style={{ color: textColor }}>MAC=6</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>三、ARP 工作流程详解</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>步骤 1（缓存查找）：</span>主机 A 首先检查 ARP 缓存表，看是否有 192.168.1.200 对应的 MAC 地址。<br/>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>步骤 2（广播请求）：</span>缓存未命中，主机 A 发送 ARP 广播请求（FF:FF:FF:FF:FF:FF），询问 192.168.1.200 的 MAC 地址。<br/>
                <span style={{ color: '#10b981', fontWeight: 600 }}>步骤 3（单播响应）：</span>主机 B 收到后识别出自己的 IP，发送 ARP 单播响应，回复自己的 MAC 地址。<br/>
                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>步骤 4（缓存更新）：</span>主机 A 收到响应，将 IP-MAC 映射存入缓存，封装以太网帧开始数据传输。
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>🔗 ARP 相关协议</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>GARP</span> 免费 ARP</span>
                      <span>IP 冲突检测</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>RARP</span> 逆地址解析</span>
                      <span>MAC → IP</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>Proxy ARP</span></span>
                      <span>代理 ARP 响应</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>NDP</span>（IPv6）</span>
                      <span>IPv6 邻居发现</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ 查看 ARP 缓存命令</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="p-2 rounded font-mono" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                      <div><span className="font-bold" style={{ color: '#10b981' }}>Windows:</span> arp -a</div>
                      <div><span className="font-bold" style={{ color: '#10b981' }}>Linux/Mac:</span> arp -n</div>
                      <div><span className="font-bold" style={{ color: '#10b981' }}>添加静态 ARP:</span> arp -s IP MAC</div>
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
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>ARP 请求</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>ARP 响应</span></div>
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
                  <div><div className="font-bold">解析状态</div><div className="text-xs" style={{ color: secondaryText }}>ARP 解析实时状态</div></div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>主机 A</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep >= 1 && currentStep <= 2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep >= 1 && currentStep <= 2 ? '#3b82f6' : '#64748b' }}>
                      {currentStep === 0 ? 'IDLE' : currentStep === 3 ? 'COMPLETED' : currentStep === 1 ? 'BROADCAST' : 'RECEIVING'}
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
                  <div><div className="font-bold">报文日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤的 ARP 报文</div></div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '100px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 ARP 报文</span></div>
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
                <div><div className="font-bold">报文交互日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 ARP 报文</div></div>
              </div>
              <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '120px' }}>
                {packetLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 ARP 报文</span></div>
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
                <div><div className="font-bold">ARP 操作码参考</div><div className="text-xs" style={{ color: secondaryText }}>常见的 ARP 操作码</div></div>
              </div>
              <div className="flex items-center justify-start gap-2 text-xs overflow-x-auto pb-2">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#3b82f6', color: 'white' }}>1</div>
                  <span style={{ color: secondaryText }}>ARP 请求</span>
                </div>
                <div style={{ color: '#64748b' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#10b981', color: 'white' }}>2</div>
                  <span style={{ color: secondaryText }}>ARP 响应</span>
                </div>
                <div style={{ color: '#64748b' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>3</div>
                  <span style={{ color: secondaryText }}>RARP 请求</span>
                </div>
                <div style={{ color: '#64748b' }}>→</div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#f59e0b', color: 'white' }}>4</div>
                  <span style={{ color: secondaryText }}>RARP 响应</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、ARP 报文首部详解</h2>
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                ARP 报文直接封装在以太网帧中，帧类型字段为 0x0806。报文大小为 28 字节（无填充），加上以太网首部 14 字节，总长度 42 字节。
              </p>
              
              <div className="overflow-x-auto mb-6">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    {/* 第1行：硬件类型 + 协议类型 */}
                    <div className="col-span-8 p-2 rounded-tl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>硬件类型</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>以太网=1</div>
                    </div>
                    <div className="col-span-8 p-2 rounded-tr-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>协议类型</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>IPv4=0x0800</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>硬件地址长度</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>MAC=6</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>协议地址长度</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>IP=4</div>
                    </div>

                    {/* 第2行：操作码 */}
                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <div className="font-bold" style={{ color: '#ec4899' }}>操作码（Opcode）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>1=ARP 请求 / 2=ARP 响应 / 3=RARP 请求 / 4=RARP 响应</div>
                    </div>

                    {/* 第3行：发送端 MAC（48位） */}
                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>发送端 MAC 地址（Sender MAC Address）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>48位</div>
                      <div className="text-xs" style={{ color: textColor }}>发送方硬件地址，如 00:0c:29:11:22:33</div>
                    </div>

                    {/* 第4行：发送端 IP（32位） */}
                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>发送端 IP 地址（Sender IP Address）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>发送方协议地址，如 192.168.1.100</div>
                    </div>

                    {/* 第5行：目标 MAC（48位） */}
                    <div className="col-span-32 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>目标 MAC 地址（Target MAC Address）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>48位</div>
                      <div className="text-xs" style={{ color: textColor }}>请求时为 00:00:00:00:00:00，响应时为目标 MAC</div>
                    </div>

                    {/* 第6行：目标 IP（32位） */}
                    <div className="col-span-32 p-2 rounded-b-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>目标 IP 地址（Target IP Address）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>被查询方协议地址，如 192.168.1.200</div>
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
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | ARP 地址解析动画演示</div>
        </div>
      </footer>
    </div>
  );
}
