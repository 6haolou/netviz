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
      description: '三台路由器 R1、R2、R3 运行 RIP 协议。R1 直连 10.0.1.0/24 网络，跳数 0。R2 和 R3 尚无该网络的路由。RIP 以跳数（Hop Count）作为度量值，最大跳数为 15。',
      clientStatus: 'IDLE',
      serverStatus: 'READY',
      packets: [],
    },
    {
      phase: '路由更新',
      icon: <Emoji label="🔄" />,
      title: 'R1 发送路由表给 R2',
      description: 'R1 周期性（30 秒）向邻居 R2 发送完整路由表（UDP 520 端口，组播 224.0.0.9），宣告 10.0.1.0/24 可达，跳数 0。R2 收到后更新路由表：10.0.1.0/24 下一跳为 R1，跳数加 1 → 1。',
      clientStatus: 'UPDATING',
      serverStatus: 'RECEIVING',
      packets: [{ from: 0, to: 1, type: 'RIP Update', delay: 0 }],
    },
    {
      phase: '路由转发',
      icon: <Emoji label="📤" />,
      title: 'R2 转发给 R3',
      description: 'R2 的路由表已更新（10.0.1.0/24 跳数 1），继续向邻居 R3 发送路由更新。R3 收到后添加路由：10.0.1.0/24 下一跳为 R2，跳数加 1 → 2。路由信息逐跳传播。',
      clientStatus: 'RECEIVING',
      serverStatus: 'UPDATING',
      packets: [{ from: 1, to: 2, type: 'RIP Update', delay: 0 }],
    },
    {
      phase: '触发更新',
      icon: <Emoji label="⚡" />,
      title: 'R2 触发更新回 R1',
      description: 'R2 路由表变化后，触发触发更新（Triggered Update），立即向 R1 发送更新报文。R1 确认所有路由器已同步。R3 的路由表也已完成更新。',
      clientStatus: 'CONVERGED',
      serverStatus: 'UPDATING',
      packets: [{ from: 1, to: 0, type: 'Triggered', delay: 0 }],
    },
    {
      phase: '路由表稳定',
      icon: <Emoji label="📋" />,
      title: '查看路由表',
      description: '所有路由表已稳定：R1 直达 10.0.1.0/24（跳数 0）；R2 下一跳 R1（跳数 1）；R3 下一跳 R2（跳数 2）。数据流量沿最优路径（跳数最少）转发。',
      clientStatus: 'CONVERGED',
      serverStatus: 'CONVERGED',
      packets: [],
    },
    {
      phase: '收敛完成',
      icon: <Emoji label="✅" />,
      title: 'RIP 收敛完成',
      description: 'R1、R2、R3 路由表完全同步，网络达到收敛状态。RIP 使用水平分割防止路由环路：R2 不会将从 R1 学到的路由再告诉 R1。',
      clientStatus: 'CONVERGED',
      serverStatus: 'CONVERGED',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'RIP Update': { start: '#f59e0b', end: '#d97706' },
    'Triggered': { start: '#8b5cf6', end: '#7c3aed' },
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
      const labels = ['R1', 'R2', 'R3'];
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

      // Background particles
      if (!isDarkMode) {
        for (let i = 0; i < 20; i++) {
          const x = (Math.sin(timeRef.current * 0.2 + i * 0.5) * 0.5 + 0.5) * width;
          const y = (Math.cos(timeRef.current * 0.15 + i * 0.7) * 0.5 + 0.5) * height;
          const alpha = Math.sin(timeRef.current * 0.5 + i) * 0.1 + 0.15;
          context.beginPath();
          context.arc(x, y, 2, 0, Math.PI * 2);
          context.fillStyle = `rgba(59, 130, 246, ${alpha})`;
          context.fill();
        }
      }

      // 3 routers in a chain
      const rPositions = [
        { x: width * 0.18, y: height * 0.4 },
        { x: width * 0.5, y: height * 0.4 },
        { x: width * 0.82, y: height * 0.4 },
      ];
      const rLabels = ['R1', 'R2', 'R3'];
      const rNetworks = ['直连: 10.0.1.0/24', '', ''];

      // Draw links R1-R2 and R2-R3
      context.setLineDash([5, 5]);
      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(rPositions[0].x + 50, rPositions[0].y);
      context.lineTo(rPositions[1].x - 50, rPositions[1].y);
      context.stroke();
      context.beginPath();
      context.moveTo(rPositions[1].x + 50, rPositions[1].y);
      context.lineTo(rPositions[2].x - 50, rPositions[2].y);
      context.stroke();
      context.setLineDash([]);

      // Hop count labels on links
      context.fillStyle = secondaryText;
      context.font = '11px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('Hop 1', (rPositions[0].x + rPositions[1].x) / 2, rPositions[0].y - 30);
      context.fillText('Hop 2', (rPositions[1].x + rPositions[2].x) / 2, rPositions[1].y - 30);

      // Routing table display per router
      const hopCounts = [0, 1, 2];
      const currentHop0 = currentStep >= 1 ? 0 : '-';
      const currentHop1 = currentStep >= 2 ? 1 : (currentStep >= 1 ? '学习中' : '-');
      const currentHop2 = currentStep >= 3 ? 2 : (currentStep >= 2 ? '学习中' : '-');
      const tableHops = [currentHop0, currentHop1, currentHop2];

      // Draw routers
      const drawRouter = (x: number, y: number, label: string, color: string, isActive: boolean) => {
        const pulse = Math.sin(timeRef.current * 3) * 4;

        if (isActive) {
          const glowGradient = context.createRadialGradient(x, y, 35, x, y, 70 + pulse);
          glowGradient.addColorStop(0, color + '40');
          glowGradient.addColorStop(1, 'transparent');
          context.fillStyle = glowGradient;
          context.beginPath();
          context.arc(x, y, 70 + pulse, 0, Math.PI * 2);
          context.fill();
        }

        const nodeGradient = context.createLinearGradient(x - 45, y - 45, x + 45, y + 45);
        nodeGradient.addColorStop(0, color);
        nodeGradient.addColorStop(1, color + 'cc');
        context.fillStyle = nodeGradient;
        context.beginPath();
        context.roundRect(x - 45, y - 38, 90, 76, 10);
        context.fill();

        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        context.fillRect(x - 35, y - 22, 70, 4);
        context.fillRect(x - 35, y - 12, 70, 4);
        context.fillRect(x - 35, y - 2, 70, 4);

        context.fillStyle = 'white';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        context.fillText(label, x, y + 55);
      };

      const isActive = (idx: number) => {
        if (currentStep === 0) return false;
        if (currentStep === 1) return idx <= 1;
        if (currentStep === 2) return idx >= 1;
        if (currentStep === 3) return idx <= 1;
        return true;
      };

      rPositions.forEach((pos, idx) => {
        drawRouter(pos.x, pos.y, rLabels[idx], '#f59e0b', isActive(idx));
      });

      // Draw routing table entries below each router
      const routingTables = [
        {
          network: '10.0.1.0/24',
          hop: String(tableHops[0]),
          via: '直连',
        },
        {
          network: '10.0.1.0/24',
          hop: String(tableHops[1]),
          via: tableHops[1] !== '-' && tableHops[1] !== '学习中' ? 'R1' : '-',
        },
        {
          network: '10.0.1.0/24',
          hop: String(tableHops[2]),
          via: tableHops[2] !== '-' && tableHops[2] !== '学习中' ? 'R2' : '-',
        },
      ];

      rPositions.forEach((pos, idx) => {
        const table = routingTables[idx];
        const tableY = pos.y + 72;
        const tableX = pos.x;

        // Table background
        context.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.9)';
        context.beginPath();
        context.roundRect(tableX - 60, tableY, 120, 50, 6);
        context.fill();

        context.strokeStyle = isDarkMode ? '#4b5563' : '#d1d5db';
        context.lineWidth = 1;
        context.beginPath();
        context.roundRect(tableX - 60, tableY, 120, 50, 6);
        context.stroke();

        // Table header
        context.fillStyle = primaryBlue;
        context.font = 'bold 8px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('目标网络', tableX - 20, tableY + 10);
        context.fillText('跳数', tableX + 15, tableY + 10);
        context.fillText('下一跳', tableX + 45, tableY + 10);

        // Separator
        context.strokeStyle = isDarkMode ? '#4b5563' : '#d1d5db';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(tableX - 55, tableY + 18);
        context.lineTo(tableX + 55, tableY + 18);
        context.stroke();

        // Table data
        const hopColor = table.hop === '-' ? '#6b7280' : (table.hop === '0' ? '#22c55e' : '#f59e0b');
        context.fillStyle = textColor;
        context.font = '9px monospace';
        context.fillText(table.network, tableX - 20, tableY + 34);
        context.fillStyle = hopColor;
        context.font = 'bold 10px monospace';
        context.fillText(table.hop, tableX + 15, tableY + 34);
        context.fillStyle = secondaryText;
        context.font = '9px monospace';
        context.fillText(table.via, tableX + 45, tableY + 34);

        // Destination label above R1
        if (idx === 0 && currentStep >= 0) {
          context.fillStyle = '#22c55e';
          context.font = 'bold 11px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'bottom';
          context.fillText('10.0.1.0/24', pos.x, pos.y - 48);
        }
      });

      // Update packets
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
            return { ...packet, progress: Math.min(1, packet.progress + 0.007) };
          }
          return { ...packet, completed: true };
        });
        return updated ? newPackets : prevPackets;
      });

      // Draw packets
      packets.forEach((packet) => {
        if (!packet.active || packet.completed) return;

        const fromNode = rPositions[packet.from];
        const toNode = rPositions[packet.to];
        const currentX = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        const currentY = fromNode.y + (toNode.y - fromNode.y) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };

        // Tail
        const tailProgress = Math.max(0, packet.progress - 0.12);
        const tailX = fromNode.x + (toNode.x - fromNode.x) * tailProgress;
        const tailY = fromNode.y + (toNode.y - fromNode.y) * tailProgress;

        context.strokeStyle = colors.start;
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.setLineDash([6, 5]);
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(currentX, currentY);
        context.stroke();
        context.setLineDash([]);

        // Packet
        context.save();
        context.translate(currentX, currentY);
        context.rotate(timeRef.current * 2);

        const size = 20;
        const glow = context.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2);
        glow.addColorStop(0, colors.start + '60');
        glow.addColorStop(1, 'transparent');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(0, 0, size * 2, 0, Math.PI * 2);
        context.fill();

        const pktGrad = context.createRadialGradient(0, 0, 0, 0, 0, size);
        pktGrad.addColorStop(0, colors.start);
        pktGrad.addColorStop(1, colors.end);
        context.fillStyle = pktGrad;
        context.beginPath();
        context.arc(0, 0, size, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        context.lineWidth = 2;
        context.stroke();
        context.restore();

        // Label
        const shortLabel = packet.type === 'RIP Update' ? 'RIP' : 'Trig';
        context.fillStyle = 'white';
        context.font = 'bold 8px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 3;
        context.fillText(shortLabel, currentX, currentY);
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

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>二、RIPv1 与 RIPv2 对比</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: primaryBlue }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>RIPv1</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>使用广播地址 255.255.255.255</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>不支持子网掩码（有类路由）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>不支持认证</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>RFC 1058（1988年）</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: '#10b981' }}>RIPv2</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>使用组播地址 224.0.0.9</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>支持子网掩码（无类路由）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>支持 MD5 认证</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>RFC 2453（1998年）</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>三、RIP 报文首部详解</h2>
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                RIP 报文封装在 UDP 数据报中（端口 520），报文大小可变，最多可包含 25 条路由条目。RIPv2 报文在 RIPv1 基础上增加了子网掩码、下一跳和认证等字段。
              </p>
              
              <div className="overflow-x-auto mb-6">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-8 p-2 rounded-tl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>命令（Command）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>1=请求，2=响应</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>版本（Version）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>1=RIPv1，2=RIPv2</div>
                    </div>
                    <div className="col-span-16 p-2 rounded-tr-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>必须为零（Must be Zero）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>全0，保留字段</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}>
                      <div className="font-bold" style={{ color: '#ef4444' }}>地址族标识符</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>2=IP</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)', border: '1px solid #f97316' }}>
                      <div className="font-bold" style={{ color: '#f97316' }}>路由标签</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>区分内部/外部路由</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7' }}>
                      <div className="font-bold" style={{ color: '#a855f7' }}>IP 地址</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>目的网络地址</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <div className="font-bold" style={{ color: '#ec4899' }}>子网掩码</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>RIPv2 特有</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(14, 165, 233, 0.3)' : 'rgba(14, 165, 233, 0.2)', border: '1px solid #0ea5e9' }}>
                      <div className="font-bold" style={{ color: '#0ea5e9' }}>下一跳</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>RIPv2 特有</div>
                    </div>
                    <div className="col-span-8 p-2 rounded-bl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e' }}>
                      <div className="font-bold" style={{ color: '#22c55e' }}>度量值</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>跳数（1-16）</div>
                    </div>
                    <div className="col-span-16 p-2 rounded-br-lg" style={{ backgroundColor: isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(107, 114, 128, 0.2)', border: '1px solid #64748b' }}>
                      <div className="font-bold" style={{ color: '#64748b' }}>认证字段（可选）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>128位</div>
                      <div className="text-xs" style={{ color: textColor }}>RIPv2 MD5 认证</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>🔧 RIP 报文类型</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>请求报文</span>（Command=1）</span>
                      <span>请求完整路由表</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>响应报文</span>（Command=2）</span>
                      <span>发送路由更新</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>触发更新</span></span>
                      <span>网络变化时立即发送</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ RIP 防环机制</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>水平分割</span></span>
                      <span>不向来源方向回传</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>毒性逆转</span></span>
                      <span>回传跳数16（不可达）</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#ef4444' }}>抑制计时器</span></span>
                      <span>180秒内不更新</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、RIP 计时器与状态</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: primaryBlue }}>
                <div className="text-2xl font-bold mb-2" style={{ color: primaryBlue }}>30s</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>更新计时器</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>周期性发送路由表的时间间隔</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#10b981' }}>180s</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>失效计时器</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>路由条目无更新时的失效时间</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#8b5cf6' }}>240s</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>垃圾收集计时器</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>失效路由被删除前的等待时间</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)', borderColor: '#f97316' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#f97316' }}>16</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>最大跳数</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>跳数≥16 表示网络不可达</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>🔧 常见配置命令</div>
                <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                  <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                    <span><span className="font-bold" style={{ color: '#3b82f6' }}>router rip</span></span>
                    <span>启用 RIP 路由进程</span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                    <span><span className="font-bold" style={{ color: '#10b981' }}>version 2</span></span>
                    <span>配置 RIPv2</span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                    <span><span className="font-bold" style={{ color: '#f59e0b' }}>network 192.168.1.0</span></span>
                    <span>宣告直连网络</span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                    <span><span className="font-bold" style={{ color: '#8b5cf6' }}>no auto-summary</span></span>
                    <span>关闭自动汇总</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ 状态转换</div>
                <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                  <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                    <span><span className="font-bold" style={{ color: '#3b82f6' }}>初始状态</span></span>
                    <span>等待更新周期</span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                    <span><span className="font-bold" style={{ color: '#f59e0b' }}>更新状态</span></span>
                    <span>发送路由更新</span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                    <span><span className="font-bold" style={{ color: '#10b981' }}>收敛状态</span></span>
                    <span>路由表稳定</span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                    <span><span className="font-bold" style={{ color: '#ef4444' }}>失效状态</span></span>
                    <span>路由不可达</span>
                  </div>
                </div>
              </div>
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
