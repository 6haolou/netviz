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
}

interface StepInfo {
  phase: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  clientStatus: string;
  serverStatus: string;
  packets: { from: number; to: number; type: string; delay: number }[];
}

export default function BGPPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [packetLogs, setPacketLogs] = useState<{ type: string; from: string; to: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
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
      title: 'BGP 会话建立前', 
      description: 'AS 65001 和 AS 65002 是两个不同的自治系统。BGP 路由器之间需要建立 TCP 连接（端口 179），然后交换 Open 报文建立 BGP 会话。',
      clientStatus: 'IDLE',
      serverStatus: 'READY',
      packets: [] 
    },
    { 
      phase: 'TCP 连接', 
      icon: <Emoji label="🔗" />, 
      title: '建立 TCP 连接', 
      description: 'BGP 使用 TCP 作为传输协议（端口 179）。两个 BGP 路由器之间建立可靠的 TCP 连接，确保路由信息的可靠传输。',
      clientStatus: 'CONNECTING',
      serverStatus: 'LISTENING',
      packets: [{ from: 0, to: 1, type: 'TCP SYN', delay: 0 }] 
    },
    { 
      phase: 'Open 报文', 
      icon: <Emoji label="📩" />, 
      title: '交换 Open 报文', 
      description: '双方交换 BGP Open 报文，包含版本号、AS 号、Hold Time、BGP Identifier 等信息。协商参数后建立 BGP 对等关系。',
      clientStatus: 'OPEN',
      serverStatus: 'OPEN',
      packets: [{ from: 1, to: 0, type: 'BGP Open', delay: 0 }] 
    },
    { 
      phase: '路由更新', 
      icon: <Emoji label="🔄" />, 
      title: '发送 Update 报文', 
      description: 'BGP 路由器发送 Update 报文，通告可达路由信息。Update 报文包含 NLRI（网络层可达信息）和路径属性（AS_PATH、NEXT_HOP 等）。',
      clientStatus: 'UPDATING',
      serverStatus: 'UPDATING',
      packets: [{ from: 0, to: 1, type: 'Update', delay: 0 }] 
    },
    { 
      phase: '完成', 
      icon: <Emoji label="✅" />, 
      title: 'BGP 收敛完成', 
      description: 'BGP 会话稳定，路由信息交换完成。双方定期发送 Keepalive 报文维持连接。BGP 路由表收敛，数据包可以跨 AS 转发。',
      clientStatus: 'ESTABLISHED',
      serverStatus: 'ESTABLISHED',
      packets: [] 
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'TCP SYN': { start: '#3b82f6', end: '#2563eb' },
    'BGP Open': { start: '#8b5cf6', end: '#7c3aed' },
    'Update': { start: '#10b981', end: '#059669' },
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
    }));

    setPackets(newPackets);
    setPacketLogs(step.packets.map((p) => {
      const labels = ['AS 65001', 'AS 65002'];
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

      const as1X = width * 0.25;
      const as2X = width * 0.75;
      const centerY = height * 0.5;

      // 绘制连接虚线
      context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      context.lineWidth = 2;
      context.setLineDash([5, 8]);
      context.beginPath();
      context.moveTo(as1X + 80, centerY);
      context.lineTo(as2X - 80, centerY);
      context.stroke();
      context.setLineDash([]);

      // 绘制 AS 边界
      context.strokeStyle = isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)';
      context.lineWidth = 2;
      context.setLineDash([10, 5]);
      context.strokeRect(as1X - 80, centerY - 120, 160, 240);
      context.strokeRect(as2X - 80, centerY - 120, 160, 240);
      context.setLineDash([]);

      context.fillStyle = isDarkMode ? '#8b5cf6' : '#7c3aed';
      context.font = 'bold 12px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('AS 65001', as1X, centerY - 135);
      context.fillText('AS 65002', as2X, centerY - 135);

      // 绘制 BGP 路由器
      const drawBgpRouter = (x: number, y: number, label: string, as: string, color: string, isActive: boolean) => {
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

        // BGP 路由器图标（带地球标识）
        context.beginPath();
        context.roundRect(x - 50, y - 50, 100, 100, 12);
        context.fill();
        
        // 地球图标
        context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x, y - 10, 25, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.moveTo(x - 25, y - 10);
        context.lineTo(x + 25, y - 10);
        context.moveTo(x, y - 35);
        context.lineTo(x, y + 15);
        context.stroke();

        // 标签 - 根据模式调整颜色
        context.fillStyle = isDarkMode ? '#ffffff' : '#1f2937';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 75);

        context.fillStyle = secondaryText;
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText(as, x, y + 90);
      };

      const routerColor = '#8b5cf6';
      const isR1Active = currentStep >= 1 && currentStep <= 3;
      const isR2Active = currentStep >= 1 && currentStep <= 3;

      drawBgpRouter(as1X, centerY, 'BGP 路由器', 'AS 65001', routerColor, isR1Active);
      drawBgpRouter(as2X, centerY, 'BGP 路由器', 'AS 65002', routerColor, isR2Active);

      // 更新报文状态
      const now = Date.now();
      setPackets((prevPackets) => {
        let updated = false;
        const newPackets = prevPackets.map((packet) => {
          if (packet.completed) return packet;
          if (now < packet.startTime) return packet;
          if (!packet.active) {
            updated = true;
            return { ...packet, active: true };
          }
          if (packet.progress < 1) {
            updated = true;
            return { ...packet, progress: Math.min(1, packet.progress + 0.008) };
          }
          return { ...packet, completed: true };
        });
        return updated ? newPackets : prevPackets;
      });

      // 绘制报文
      packets.forEach((packet) => {
        if (!packet.active) return;

        const nodePositions = [
          { x: as1X, y: centerY },
          { x: as2X, y: centerY },
        ];

        const fromNode = nodePositions[packet.from];
        const toNode = nodePositions[packet.to];
        const currentX = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        const currentY = fromNode.y + (toNode.y - fromNode.y) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };

        // 绘制拖尾（虚线）
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

        // 绘制球球
        context.save();
        context.translate(currentX, currentY);
        context.rotate(timeRef.current * 2);

        const size = 22;
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

        // 球球中间的文字
        context.fillStyle = 'white';
        context.font = 'bold 8px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 4;
        const shortType = packet.type.replace('BGP ', '');
        context.fillText(shortType, currentX, currentY);
        context.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
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

  const statusColors: Record<string, string> = {
    'IDLE': '#6b7280',
    'CONNECTING': '#3b82f6',
    'LISTENING': '#10b981',
    'OPEN': '#8b5cf6',
    'UPDATING': '#f59e0b',
    'READY': '#10b981',
    'ESTABLISHED': '#10b981',
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: bgColor, color: textColor }}>
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">返回主页</span>
              </a>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>BGP 路由协议</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>Border Gateway Protocol</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)' }}>
                <div className="text-xs" style={{ color: secondaryText }}>当前步骤</div>
                <div className="text-xl font-bold" style={{ color: primaryBlue }}>{currentStep + 1} / {steps.length}</div>
              </div>
              <button onClick={handleReset} className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>重置</button>
              <button onClick={handleNext} disabled={currentStep >= steps.length - 1} className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50" style={{ backgroundColor: primaryBlue, color: 'white' }}>下一步</button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>BGP 边界网关协议完整流程</h3>
            <p className="text-base leading-relaxed mb-4 font-medium" style={{ color: textColor }}>
              BGP（Border Gateway Protocol）是互联网的核心路由协议，用于在不同自治系统（AS）之间交换路由信息。以下是 BGP 会话建立和路由交换的完整过程：
            </p>
            <div className="space-y-3" style={{ color: textColor }}>
              <p className="text-sm leading-relaxed">
                <span style={{ color: primaryBlue, fontWeight: 600, fontSize: '15px' }}>1. TCP 连接：</span>
                BGP 使用 TCP 端口 179 建立可靠连接。两个 BGP 路由器（对等体）之间建立 TCP 连接，为 BGP 报文传输提供可靠通道。
              </p>
              <p className="text-sm leading-relaxed">
                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '15px' }}>2. Open 报文：</span>
                双方交换 Open 报文，协商 BGP 版本、AS 号、Hold Time、BGP Identifier 等参数。参数匹配后进入 OpenConfirm 状态。
              </p>
              <p className="text-sm leading-relaxed">
                <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '15px' }}>3. Update 报文：</span>
                BGP 路由器发送 Update 报文，通告或撤销路由信息。Update 包含 NLRI、AS_PATH、NEXT_HOP 等路径属性，用于无环路由选择。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '450px' }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold" style={{ color: secondaryText }}>步骤:</span>
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
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>TCP SYN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>BGP Open</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>Update</span>
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
                    <p className="text-xs" style={{ color: secondaryText }}>步骤 {currentStep + 1} of {steps.length} | {steps[currentStep].phase}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: textColor }}>{steps[currentStep].description}</p>
                </div>

                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #8b5cf6, #10b981)` }} />
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">报文日志</span>
                </div>

                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '150px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                      <span>暂无 BGP 报文</span>
                    </div>
                  ) : (
                    packetLogs.map((log, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} />
                        <span className="text-sm font-semibold" style={{ color: textColor }}>{log.type}: {log.from} → {log.to}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <h4 className="font-bold mb-3">会话状态</h4>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>AS 65001</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: statusColors[steps[currentStep].clientStatus] || '#6b7280', color: 'white' }}>
                        {steps[currentStep].clientStatus}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: secondaryText }}>Local AS</div>
                  </div>
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>AS 65002</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: statusColors[steps[currentStep].serverStatus] || '#6b7280', color: 'white' }}>
                        {steps[currentStep].serverStatus}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: secondaryText }}>Remote AS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | BGP 路由协议动画演示</div>
        </div>
      </footer>
    </div>
  );
}
