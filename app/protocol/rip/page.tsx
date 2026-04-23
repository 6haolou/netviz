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

export default function RIPPage() {
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
      title: 'RIP 路由更新前', 
      description: '路由器 R1、R2、R3 运行 RIP 协议。RIP 使用距离向量算法，以跳数（Hop Count）作为度量值，最大跳数为 15。路由器周期性地向邻居发送路由表。',
      clientStatus: 'IDLE',
      serverStatus: 'READY',
      packets: [] 
    },
    { 
      phase: '路由更新', 
      icon: <Emoji label="🔄" />, 
      title: '发送路由表', 
      description: '路由器周期性（30 秒）向邻居发送完整路由表。RIP 使用 UDP 520 端口，通过组播地址 224.0.0.9 或广播发送路由更新报文。',
      clientStatus: 'UPDATING',
      serverStatus: 'RECEIVING',
      packets: [{ from: 0, to: 1, type: 'RIP Update', delay: 0 }] 
    },
    { 
      phase: '距离计算', 
      icon: <Emoji label="🧮" />, 
      title: '更新路由表', 
      description: '路由器收到邻居的路由表后，比较到达各目的地的跳数。如果通过邻居到达某目的地的跳数更少，则更新路由表，下一跳设为该邻居。',
      clientStatus: 'CALCULATING',
      serverStatus: 'CALCULATING',
      packets: [] 
    },
    { 
      phase: '完成', 
      icon: <Emoji label="✅" />, 
      title: 'RIP 收敛完成', 
      description: '所有路由器完成路由表更新，网络达到收敛状态。RIP 路由表稳定，数据包可以沿着最优路径（跳数最少）转发。',
      clientStatus: 'CONVERGED',
      serverStatus: 'CONVERGED',
      packets: [] 
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'RIP Update': { start: '#f59e0b', end: '#d97706' },
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
      const labels = ['R1', 'R2'];
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

      const r1X = width * 0.3;
      const r2X = width * 0.7;
      const centerY = height * 0.5;

      // 绘制连接虚线
      context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      context.lineWidth = 2;
      context.setLineDash([5, 8]);
      context.beginPath();
      context.moveTo(r1X + 60, centerY);
      context.lineTo(r2X - 60, centerY);
      context.stroke();
      context.setLineDash([]);

      // 绘制路由器节点
      const drawRouter = (x: number, y: number, label: string, color: string, isActive: boolean) => {
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

        // 路由器图标
        context.beginPath();
        context.roundRect(x - 50, y - 40, 100, 80, 12);
        context.fill();
        
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        context.fillRect(x - 40, y - 25, 80, 4);
        context.fillRect(x - 40, y - 15, 80, 4);
        context.fillRect(x - 40, y - 5, 80, 4);

        // 标签 - 根据模式调整颜色
        context.fillStyle = isDarkMode ? '#ffffff' : '#1f2937';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 75);
      };

      const routerColor = '#f59e0b';
      const isR1Active = currentStep >= 1 && currentStep <= 2;
      const isR2Active = currentStep >= 1 && currentStep <= 2;

      drawRouter(r1X, centerY, '路由器 R1', routerColor, isR1Active);
      drawRouter(r2X, centerY, '路由器 R2', routerColor, isR2Active);

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
          { x: r1X, y: centerY },
          { x: r2X, y: centerY },
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
        context.font = 'bold 9px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 4;
        context.fillText('RIP', currentX, currentY);
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
    'UPDATING': '#f59e0b',
    'RECEIVING': '#10b981',
    'CALCULATING': '#8b5cf6',
    'READY': '#10b981',
    'CONVERGED': '#10b981',
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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>RIP 路由协议</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>Routing Information Protocol</p>
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
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>RIP 路由信息协议完整流程</h3>
            <p className="text-base leading-relaxed mb-4 font-medium" style={{ color: textColor }}>
              RIP（Routing Information Protocol）是一种基于距离向量的内部网关协议，使用跳数作为度量值，最大跳数为 15。以下是 RIP 的完整工作过程：
            </p>
            <div className="space-y-3" style={{ color: textColor }}>
              <p className="text-sm leading-relaxed">
                <span style={{ color: primaryBlue, fontWeight: 600, fontSize: '15px' }}>1. 周期性更新：</span>
                路由器每隔 30 秒向邻居发送完整路由表，使用 UDP 520 端口，通过组播 224.0.0.9 或广播发送。
              </p>
              <p className="text-sm leading-relaxed">
                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '15px' }}>2. 路由学习：</span>
                路由器收到邻居的路由表后，比较到达各目的地的跳数。如果通过邻居到达某目的地的跳数更少（加 1 后），则更新路由表。
              </p>
              <p className="text-sm leading-relaxed">
                <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '15px' }}>3. 收敛：</span>
                经过多次更新后，所有路由器的路由表达到稳定状态，网络收敛。RIP 使用水平分割、毒性逆转等机制防止路由环路。
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
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>RIP Update</span>
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
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #f59e0b)` }} />
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
                      <span>暂无 RIP 报文</span>
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
                <h4 className="font-bold mb-3">收敛状态</h4>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>路由器 R1</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: statusColors[steps[currentStep].clientStatus] || '#6b7280', color: 'white' }}>
                        {steps[currentStep].clientStatus}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: secondaryText }}>Router R1</div>
                  </div>
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>路由器 R2</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: statusColors[steps[currentStep].serverStatus] || '#6b7280', color: 'white' }}>
                        {steps[currentStep].serverStatus}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: secondaryText }}>Router R2</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | RIP 路由协议动画演示</div>
        </div>
      </footer>
    </div>
  );
}
