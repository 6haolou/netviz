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

interface LinkState {
  id: number;
  r1: number;
  r2: number;
  name: string;
  state: string;
}

interface StepInfo {
  phase: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  packets: { from: number; to: number; type: string; delay: number }[];
  linkStates: string[];
}

export default function OSPFPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [packetLogs, setPacketLogs] = useState<{ type: string; from: string; to: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [linkStates, setLinkStates] = useState<LinkState[]>([]);
  const [isCostExpanded, setIsCostExpanded] = useState(false);
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
      title: '网络启动',
      description: '网络刚启动，所有 5 台路由器都处于 Down 状态。所有链路状态均为 Down，尚未建立任何邻居关系。',
      packets: [],
      linkStates: ['Down', 'Down', 'Down', 'Down', 'Down', 'Down', 'Down'],
    },
    {
      phase: '邻居发现',
      icon: <Emoji label="🔍" />,
      title: '发送 Hello 报文',
      description: 'R1 向组播地址 224.0.0.5 发送 Hello 报文。所有直连路由器 (R2-R5) 都会收到此 Hello 报文。Hello 报文包含 Router ID、Area ID、Hello Interval 等信息。',
      packets: [
        { from: 0, to: 1, type: 'Hello', delay: 0 },
        { from: 0, to: 2, type: 'Hello', delay: 200 },
        { from: 0, to: 3, type: 'Hello', delay: 400 },
        { from: 0, to: 4, type: 'Hello', delay: 600 },
      ],
      linkStates: ['Init', 'Init', 'Init', 'Init', 'Down', 'Down', 'Down'],
    },
    {
      phase: '双向通信',
      icon: <Emoji label="🤝" />,
      title: '2-Way 状态建立',
      description: '邻居回复 Hello 报文，R1 在 Neighbor 字段看到自己的 Router ID。所有链路状态：Init → 2-Way。双向通信已建立，双方都确认了对方的存在。',
      packets: [
        { from: 1, to: 0, type: 'Hello', delay: 0 },
        { from: 2, to: 0, type: 'Hello', delay: 200 },
        { from: 3, to: 0, type: 'Hello', delay: 400 },
        { from: 4, to: 0, type: 'Hello', delay: 600 },
      ],
      linkStates: ['2-Way', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way'],
    },
    {
      phase: 'DR/BDR 选举',
      icon: <Emoji label="👑" />,
      title: '选举完成',
      description: '在广播网络中选举 DR 和 BDR：DR: R1 (优先级 255 最高)，BDR: R2 (优先级 100 次高)，DROther: R3, R4, R5。DR/BDR 负责与其他路由器建立完全邻接关系。',
      packets: [],
      linkStates: ['2-Way', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way'],
    },
    {
      phase: 'ExStart',
      icon: <Emoji label="📋" />,
      title: '协商主从关系',
      description: 'DR (R1) 与 BDR (R2) 开始数据库同步。链路 R1-R2 状态：2-Way → ExStart。通过交换空的 DD 报文协商主从关系 (Router ID 大者为主)。',
      packets: [{ from: 0, to: 1, type: 'DD', delay: 0 }],
      linkStates: ['ExStart', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way'],
    },
    {
      phase: 'Exchange',
      icon: <Emoji label="🔄" />,
      title: '交换 DD 报文',
      description: '链路 R1-R2 状态：ExStart → Exchange。双方交换 DD (Database Description) 报文，描述各自 LSDB 的摘要。DD 报文包含 LSA 头部信息，用于比对数据库差异。',
      packets: [
        { from: 0, to: 1, type: 'DD', delay: 0 },
        { from: 1, to: 0, type: 'DD', delay: 300 },
      ],
      linkStates: ['Exchange', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way'],
    },
    {
      phase: 'Loading',
      icon: <Emoji label="⏳" />,
      title: 'LSR/LSU 交换',
      description: '链路 R1-R2 状态：Exchange → Loading → Full。R2 发送 LSR 请求缺失的 LSA，R1 回复 LSU 包含完整 LSA 信息，R2 发送 LSAck 确认。',
      packets: [
        { from: 1, to: 0, type: 'LSR', delay: 0 },
        { from: 0, to: 1, type: 'LSU', delay: 300 },
        { from: 1, to: 0, type: 'LSAck', delay: 600 },
      ],
      linkStates: ['Full', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way', '2-Way'],
    },
    {
      phase: 'DR 同步',
      icon: <Emoji label="📡" />,
      title: 'DR 与 DROther 同步',
      description: 'DR (R1) 与所有 DROther (R3, R4, R5) 进行数据库同步。同样经过 ExStart → Exchange → Loading → Full 过程。链路 R1-R3、R1-R4、R1-R5 → Full。',
      packets: [
        { from: 0, to: 2, type: 'DD', delay: 0 },
        { from: 0, to: 3, type: 'DD', delay: 200 },
        { from: 0, to: 4, type: 'DD', delay: 400 },
        { from: 2, to: 0, type: 'LSAck', delay: 600 },
        { from: 3, to: 0, type: 'LSAck', delay: 800 },
        { from: 4, to: 0, type: 'LSAck', delay: 1000 },
      ],
      linkStates: ['Full', 'Full', 'Full', 'Full', '2-Way', '2-Way', '2-Way'],
    },
    {
      phase: 'BDR 同步',
      icon: <Emoji label="📡" />,
      title: 'BDR 与 DROther 同步',
      description: 'BDR (R2) 与 DROther (R3, R4) 进行数据库同步。链路 R2-R3、R2-R4 → Full。注意：DROther 之间 (R4-R5) 保持 2-Way 状态，不建立完全邻接。',
      packets: [
        { from: 1, to: 2, type: 'DD', delay: 0 },
        { from: 1, to: 3, type: 'DD', delay: 300 },
        { from: 2, to: 1, type: 'LSAck', delay: 600 },
        { from: 3, to: 1, type: 'LSAck', delay: 900 },
      ],
      linkStates: ['Full', 'Full', 'Full', 'Full', 'Full', 'Full', '2-Way'],
    },
    {
      phase: '邻接建立完成',
      icon: <Emoji label="✅" />,
      title: 'Full 状态',
      description: 'OSPF 邻居建立演示完成！所有 DR/BDR 相关链路已达 Full 状态。所有路由器的 LSDB 已完全同步，可以开始运行 SPF 算法计算最短路径。',
      packets: [
        { from: 0, to: 1, type: 'Hello', delay: 0 },
        { from: 0, to: 2, type: 'Hello', delay: 200 },
        { from: 0, to: 3, type: 'Hello', delay: 400 },
        { from: 0, to: 4, type: 'Hello', delay: 600 },
      ],
      linkStates: ['Full', 'Full', 'Full', 'Full', 'Full', 'Full', '2-Way'],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'Hello': { start: '#3b82f6', end: '#2563eb' },
    'DD': { start: '#8b5cf6', end: '#7c3aed' },
    'LSR': { start: '#f59e0b', end: '#d97706' },
    'LSU': { start: '#10b981', end: '#059669' },
    'LSAck': { start: '#ec4899', end: '#db2777' },
  };

  const stateColors: Record<string, string> = {
    'Down': '#64748b',
    'Init': '#3b82f6',
    '2-Way': '#8b5cf6',
    'ExStart': '#a855f7',
    'Exchange': '#c084fc',
    'Loading': '#10b981',
    'Full': '#22c55e',
  };

  useEffect(() => {
    const step = steps[currentStep];
    
    setLinkStates([
      { id: 0, r1: 0, r2: 1, name: 'R1-R2', state: step.linkStates[0] },
      { id: 1, r1: 0, r2: 2, name: 'R1-R3', state: step.linkStates[1] },
      { id: 2, r1: 0, r2: 3, name: 'R1-R4', state: step.linkStates[2] },
      { id: 3, r1: 0, r2: 4, name: 'R1-R5', state: step.linkStates[3] },
      { id: 4, r1: 1, r2: 2, name: 'R2-R3', state: step.linkStates[4] },
      { id: 5, r1: 1, r2: 3, name: 'R2-R4', state: step.linkStates[5] },
      { id: 6, r1: 3, r2: 4, name: 'R4-R5', state: step.linkStates[6] },
    ]);

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
      const labels = ['R1', 'R2', 'R3', 'R4', 'R5'];
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

      // 背景粒子
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

      // 路由器位置
      const cx = width * 0.5;
      const cy = height * 0.5;
      const rx = width * 0.22;
      const ry = height * 0.28;

      const routerPositions = [
        { x: cx, y: cy },
        { x: cx - rx, y: cy - ry },
        { x: cx - rx, y: cy + ry },
        { x: cx + rx, y: cy - ry },
        { x: cx + rx, y: cy + ry },
      ];

      const routerLabels = ['R1', 'R2', 'R3', 'R4', 'R5'];
      const routerIPs = ['192.168.1.1', '192.168.1.2', '192.168.1.3', '192.168.1.4', '192.168.1.5'];
      const routerRoles = ['DR', 'BDR', 'DROther', 'DROther', 'DROther'];
      const routerColors = [primaryBlue, '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

      // 绘制链路
      const links = [
        { r1: 0, r2: 1 },
        { r1: 0, r2: 2 },
        { r1: 0, r2: 3 },
        { r1: 0, r2: 4 },
        { r1: 1, r2: 2 },
        { r1: 1, r2: 3 },
        { r1: 3, r2: 4 },
      ];

      links.forEach((link, index) => {
        const r1 = routerPositions[link.r1];
        const r2 = routerPositions[link.r2];
        const linkState = linkStates[index];
        const state = linkState?.state || 'Down';
        const color = stateColors[state] || '#64748b';
        const isFull = state === 'Full';
        const is2Way = state === '2-Way';

        context.strokeStyle = isFull ? '#22c55e' : (is2Way ? '#8b5cf6' : color);
        context.lineWidth = isFull ? 5 : (is2Way ? 3 : 2);

        if (!isFull) {
          context.setLineDash([10, 5]);
          context.lineDashOffset = -(timeRef.current * 30) % 15;
        } else {
          context.setLineDash([]);
        }

        context.beginPath();
        context.moveTo(r1.x, r1.y);
        context.lineTo(r2.x, r2.y);
        context.stroke();
        context.setLineDash([]);

        // 链路状态标签
        const mx = (r1.x + r2.x) / 2;
        const my = (r1.y + r2.y) / 2;
        context.fillStyle = color + '40';
        context.beginPath();
        context.roundRect(mx - 28, my - 11, 56, 22, 5);
        context.fill();
        context.fillStyle = color;
        context.font = 'bold 10px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(state, mx, my);
      });

      // 绘制路由器
      routerPositions.forEach((pos, index) => {
        const pulse = Math.sin(timeRef.current * 2) * 4;
        const color = routerColors[index];
        const role = routerRoles[index];

        // 光晕
        const glowGradient = context.createRadialGradient(pos.x, pos.y, 30, pos.x, pos.y, 65 + pulse);
        glowGradient.addColorStop(0, color + '30');
        glowGradient.addColorStop(1, 'transparent');
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(pos.x, pos.y, 65 + pulse, 0, Math.PI * 2);
        context.fill();

        // 路由器主体
        const gradient = context.createLinearGradient(pos.x - 32, pos.y - 32, pos.x + 32, pos.y + 32);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + 'cc');
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(pos.x - 32, pos.y - 32, 64, 64, 10);
        context.fill();

        // 内部线条
        context.fillStyle = 'rgba(255, 255, 255, 0.25)';
        context.fillRect(pos.x - 20, pos.y - 16, 40, 5);
        context.fillRect(pos.x - 20, pos.y - 5, 40, 5);
        context.fillRect(pos.x - 20, pos.y + 6, 40, 5);

        // 天线
        context.strokeStyle = '#64748b';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(pos.x, pos.y - 32);
        context.lineTo(pos.x, pos.y - 48);
        context.stroke();

        // 天线指示灯
        context.fillStyle = '#22c55e';
        context.beginPath();
        context.arc(pos.x, pos.y - 52, 5, 0, Math.PI * 2);
        context.fill();

        // 标签
        context.fillStyle = 'white';
        context.font = 'bold 16px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(routerLabels[index], pos.x, pos.y + 55);

        context.fillStyle = 'rgba(255, 255, 255, 0.6)';
        context.font = '11px Inter, system-ui, sans-serif';
        context.fillText(routerIPs[index], pos.x, pos.y + 70);

        context.fillStyle = color;
        context.font = 'bold 11px Inter, system-ui, sans-serif';
        context.fillText(role, pos.x, pos.y + 85);
      });

      // Area 0 标签
      context.fillStyle = 'rgba(59, 130, 246, 0.95)';
      context.font = 'bold 12px Inter, system-ui, sans-serif';
      context.fillText('DR', routerPositions[0].x, routerPositions[0].y - 70);
      context.fillStyle = 'rgba(139, 92, 246, 0.95)';
      context.fillText('BDR', routerPositions[1].x, routerPositions[1].y - 70);

      // 更新报文状态
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
            const sizeIncrease = 0.6;
            return {
              ...packet,
              progress: Math.min(1, packet.progress + 0.006),
              size: Math.min(18, packet.size + sizeIncrease),
            };
          }
          return { ...packet, completed: true };
        });
        return updated ? newPackets : prevPackets;
      });

      // 绘制报文
      packets.forEach((packet) => {
        if (!packet.active) return;

        const fromNode = routerPositions[packet.from];
        const toNode = routerPositions[packet.to];
        const currentX = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        const currentY = fromNode.y + (toNode.y - fromNode.y) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };
        const size = packet.size || 18;

        // 光晕
        const glowGradient = context.createRadialGradient(currentX, currentY, size * 0.5, currentX, currentY, size * 2.5);
        glowGradient.addColorStop(0, colors.start + '90');
        glowGradient.addColorStop(1, 'transparent');
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(currentX, currentY, size * 2.5, 0, Math.PI * 2);
        context.fill();

        // 报文主体（八角形）
        context.save();
        context.translate(currentX, currentY);
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
          if (i === 0) {
            context.moveTo(px, py);
          } else {
            context.lineTo(px, py);
          }
        }
        context.closePath();
        context.fill();
        context.restore();

        // 报文文字
        context.fillStyle = 'white';
        context.font = 'bold 11px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 4;
        context.fillText(packet.type.toUpperCase(), currentX, currentY);
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
  }, [currentStep, packets, linkStates, isDarkMode]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setPackets([]);
    setPacketLogs([]);
  };

  const handleStepClick = (index: number) => {
    if (index <= currentStep + 1) {
      setCurrentStep(index);
    }
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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>OSPF 邻居建立过程</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>广播网络拓扑 | 10 个核心步骤</p>
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
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>OSPF 完整工作流程详解</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>一、OSPF 简介</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>OSPF（Open Shortest Path First，开放式最短路径优先）</span>是一种链路状态路由协议，使用 Dijkstra SPF 算法计算最短路径树。OSPF 将网络划分为不同的区域（Area），每个区域有独立的链路状态数据库（LSDB）。
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: primaryBlue }}>管理距离</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>110</div>
                </div>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981' }} onClick={() => setIsCostExpanded(!isCostExpanded)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
                        <span className="text-white font-bold text-sm">Cost</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#10b981' }}>度量值（Metric）</div>
                        <div className="text-lg font-bold" style={{ color: textColor }}>链路开销</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>COST = 10⁸ / BW</div>
                      <div className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: isCostExpanded ? '#10b981' : 'transparent', color: isCostExpanded ? 'white' : '#10b981' }}>
                        {isCostExpanded ? '▲ 收起详情' : '▼ 点击查看'}
                      </div>
                    </div>
                  </div>
                  
                  {isCostExpanded && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)' }}>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 左侧：计算公式 */}
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📐</span>
                              <div className="font-bold text-sm" style={{ color: '#10b981' }}>计算公式</div>
                            </div>
                            <div className="p-3 rounded-lg text-center font-mono text-base font-bold mb-2" style={{ backgroundColor: isDarkMode ? '#0a0a0a' : '#ffffff', color: '#10b981', border: '2px solid #10b981' }}>
                              COST = Reference Bandwidth / Interface Bandwidth
                            </div>
                            <div className="text-xs text-center" style={{ color: secondaryText }}>
                              开销 = 参考带宽 / 接口带宽
                            </div>
                          </div>
                          
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">⚙️</span>
                              <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>核心参数</div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: secondaryText }}>Cisco 默认参考带宽</span>
                                <span className="text-xs font-bold" style={{ color: '#3b82f6' }}>100 Mbps (10⁸ bps)</span>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: secondaryText }}>COST 最小值</span>
                                <span className="text-xs font-bold" style={{ color: '#3b82f6' }}>1</span>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: secondaryText }}>总路径 COST</span>
                                <span className="text-xs font-bold" style={{ color: '#3b82f6' }}>所有入接口 COST 之和</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 右侧：常见接口示例 */}
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📊</span>
                              <div className="font-bold text-sm" style={{ color: '#f59e0b' }}>常见接口 COST 值</div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: textColor }}>10 Mbps Ethernet</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#10b981', color: 'white' }}>COST = 10</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: textColor }}>100 Mbps FastEthernet</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#10b981', color: 'white' }}>COST = 1</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: textColor }}>1 Gbps GigabitEthernet</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#10b981', color: 'white' }}>COST = 1</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <span className="text-xs" style={{ color: textColor }}>10 Gbps TenGigE</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#10b981', color: 'white' }}>COST = 1</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">⚠️</span>
                              <div className="font-bold text-sm" style={{ color: '#ef4444' }}>重要提示</div>
                            </div>
                            <div className="text-xs space-y-1.5" style={{ color: secondaryText }}>
                              <div>• 高速链路 COST 都为 1，无法区分优劣</div>
                              <div>• 建议修改参考带宽：<code className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)' }}>auto-cost reference-bandwidth 10000</code></div>
                              <div>• 所有路由器必须使用相同的参考带宽</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>组播地址</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>224.0.0.5/6</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>协议号</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>89</div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>二、OSPF 邻居建立七大状态、五种报文类型、五种状态机</h3>
              
              {/* 7 大状态 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #64748b', paddingLeft: '10px' }}>七大状态</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.05)', borderColor: '#64748b' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#64748b' }} />
                    <span className="font-bold" style={{ color: textColor }}>1. Down</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>初始状态，尚未收到任何 Hello 报文。路由器开始发送 Hello 报文前处于此状态。</p>
                </div>
                <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="font-bold" style={{ color: textColor }}>2. Init</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>收到邻居的 Hello 报文，但 Hello 报文中 Neighbor 字段没有自己的 Router ID。</p>
                </div>
                <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="font-bold" style={{ color: textColor }}>3. 2-Way</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>双向通信已建立。在收到的 Hello 报文中看到自己的 Router ID，确认双向通信正常。</p>
                </div>
                <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)', borderColor: '#a855f7' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
                    <span className="font-bold" style={{ color: textColor }}>4. ExStart</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>准备交换链路状态信息。通过交换空的 DD 报文协商主从关系，Router ID 大者为主。</p>
                </div>
                <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(192, 132, 252, 0.1)' : 'rgba(192, 132, 252, 0.05)', borderColor: '#c084fc' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#c084fc' }} />
                    <span className="font-bold" style={{ color: textColor }}>5. Exchange</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>交换 DD 报文（数据库描述），包含 LSA 头部信息，用于比对 LSDB 差异。</p>
                </div>
                <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span className="font-bold" style={{ color: textColor }}>6. Loading</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>同步 LSDB。发送 LSR 请求缺失的 LSA，接收 LSU 更新，发送 LSAck 确认。</p>
                </div>
                <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)', borderColor: '#22c55e' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                    <span className="font-bold" style={{ color: textColor }}>7. Full</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>邻接关系完全建立。LSDB 已完全同步，可以开始运行 SPF 算法计算路由。</p>
                </div>
              </div>
              </div>

              {/* 5 种报文类型 */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>五种报文类型</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>Hello</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>发现和维护邻居关系。组播地址 224.0.0.5，周期性发送以发现邻居并维持邻接关系。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>DD (DBD)</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>数据库描述报文。描述 LSDB 摘要，协商主从关系，包含 LSA 头部信息用于比对数据库差异。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>LSR</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>链路状态请求。发现数据库差异后发送，请求缺失的 LSA，单播发送给邻居路由器。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>LSU</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>链路状态更新。发送完整 LSA 信息，响应 LSR 请求或触发更新，包含完整的 LSA 内容。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.05)', borderColor: '#ec4899' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ec4899' }} />
                      <span className="font-bold" style={{ color: textColor }}>LSAck</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>链路状态确认。确认收到 LSU，保证可靠传输，可组播或单播发送。</p>
                  </div>
                </div>
              </div>

              {/* 5 种状态机 */}
              <div>
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>五种状态机</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.05)', borderColor: '#64748b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#64748b' }} />
                      <span className="font-bold" style={{ color: textColor }}>1. Down</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>初始状态，尚未收到任何 Hello 报文。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>2. Init</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>收到邻居的 Hello 报文，但 Neighbor 字段没有自己的 Router ID。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>3. 2-Way</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>双向通信已建立，在 Hello 报文中看到自己的 Router ID。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)', borderColor: '#a855f7' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
                      <span className="font-bold" style={{ color: textColor }}>4. ExStart</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>准备交换链路状态信息，协商主从关系。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(192, 132, 252, 0.1)' : 'rgba(192, 132, 252, 0.05)', borderColor: '#c084fc' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#c084fc' }} />
                      <span className="font-bold" style={{ color: textColor }}>5. Exchange</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>交换 DD 报文，描述各自 LSDB 的摘要。</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>三、DR/BDR 选举机制</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                在广播多路访问网络（如以太网）中，为了减少邻接关系数量，需要选举<span style={{ color: primaryBlue, fontWeight: 600 }}>DR（指定路由器）</span>和<span style={{ color: '#8b5cf6', fontWeight: 600 }}>BDR（备份指定路由器）</span>。
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                    <div className="font-bold text-sm" style={{ color: primaryBlue }}>DR（指定路由器）</div>
                  </div>
                  <ul className="text-xs space-y-0.5" style={{ color: secondaryText }}>
                    <li>• 优先级最高者当选（0-255）</li>
                    <li>• 优先级相同时，Router ID 大者胜出</li>
                    <li>• 负责与其他所有路由器建立 Full 邻接</li>
                    <li>• 非抢占式选举</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                    <div className="font-bold text-sm" style={{ color: '#8b5cf6' }}>BDR（备份指定路由器）</div>
                  </div>
                  <ul className="text-xs space-y-0.5" style={{ color: secondaryText }}>
                    <li>• 优先级次高者当选</li>
                    <li>• 监控 DR 状态</li>
                    <li>• DR 故障时自动接管</li>
                    <li>• 同样与所有路由器建立 Full 邻接</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <div className="font-bold text-sm" style={{ color: '#10b981' }}>DROther</div>
                  </div>
                  <ul className="text-xs space-y-0.5" style={{ color: secondaryText }}>
                    <li>• 未当选 DR/BDR 的路由器</li>
                    <li>• 只与 DR 和 BDR 建立 Full 邻接</li>
                    <li>• DROther 之间保持 2-Way 状态</li>
                    <li>• 减少邻接关系数量（从 n² 降到 2n）</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 中间主区域：左侧动画 + 步骤控制，右侧当前状态 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-3 flex flex-col gap-4">
              {/* Canvas 动画区域 */}
              <div className="rounded-xl border overflow-hidden flex-1" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
              </div>

              {/* 步骤控制 */}
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

                {/* 报文图例 */}
                <div className="flex justify-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>Hello</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>DD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>LSR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>LSU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ec4899' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>LSAck</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧当前步骤信息 */}
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
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #8b5cf6, #10b981)` }} />
                </div>
              </div>

              {/* 当前链路状态 */}
              <div className="rounded-xl border p-4 flex-1" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔗</span>
                  <div>
                    <div className="font-bold">当前链路状态</div>
                    <div className="text-xs" style={{ color: secondaryText }}>实时显示各链路状态</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {linkStates.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stateColors[link.state] || '#64748b' }} />
                        <span className="text-xs font-semibold" style={{ color: textColor }}>{link.name}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: stateColors[link.state] + '40', color: stateColors[link.state] }}>{link.state}</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          {/* 底部区域：报文日志 + 状态机说明 - 分成两个独立容器 */}
          <div className="w-full grid grid-cols-2 gap-4 mb-6 lg:col-span-full">
            {/* 报文交互日志 */}
            <div className="rounded-xl border p-4 w-full" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: borderColor }}>
                  <span className="text-lg">📦</span>
                  <div>
                    <div className="font-bold">报文交互日志</div>
                    <div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 OSPF 报文</div>
                  </div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '120px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                      <span>暂无 OSPF 报文</span>
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

              {/* 状态机快速参考 */}
              <div className="rounded-xl border p-4 w-full" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: borderColor }}>
                  <span className="text-lg">📊</span>
                  <div>
                    <div className="font-bold">状态机快速参考</div>
                    <div className="text-xs" style={{ color: secondaryText }}>OSPF 邻居状态转换</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 text-xs overflow-x-auto pb-2">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#64748b', color: 'white' }}>D</div>
                    <span style={{ color: secondaryText }}>Down</span>
                  </div>
                  <div style={{ color: secondaryText, fontSize: '10px' }}>→</div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#3b82f6', color: 'white' }}>I</div>
                    <span style={{ color: secondaryText }}>Init</span>
                  </div>
                  <div style={{ color: secondaryText, fontSize: '10px' }}>→</div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>2W</div>
                    <span style={{ color: secondaryText }}>2-Way</span>
                  </div>
                  <div style={{ color: secondaryText, fontSize: '10px' }}>→</div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#a855f7', color: 'white' }}>ES</div>
                    <span style={{ color: secondaryText }}>ExStart</span>
                  </div>
                  <div style={{ color: secondaryText, fontSize: '10px' }}>→</div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#c084fc', color: 'white' }}>EX</div>
                    <span style={{ color: secondaryText }}>Exchange</span>
                  </div>
                  <div style={{ color: secondaryText, fontSize: '10px' }}>→</div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#10b981', color: 'white' }}>L</div>
                    <span style={{ color: secondaryText }}>Loading</span>
                  </div>
                  <div style={{ color: secondaryText, fontSize: '10px' }}>→</div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#22c55e', color: 'white' }}>F</div>
                    <span style={{ color: secondaryText }}>Full</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部：OSPF 区域类型讲解 + Canvas 动画 */}
          <div className="rounded-xl border p-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、OSPF 区域类型详解</h2>
            
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                OSPF 使用区域（Area）概念来组织大型网络，每个区域有独立的 LSDB，减少路由更新泛洪范围，提高网络可扩展性。
              </p>
            </div>

            {/* 区域类型卡片 - 5 列布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* 骨干区域卡片 */}
              <div className="rounded-xl border-2 p-4 lg:col-span-1" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                  <span className="font-bold" style={{ color: textColor }}>骨干区域 (Area 0)</span>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: secondaryText }}>
                  核心区域，所有其他区域必须连接到 Area 0。防止路由环路，汇总区域间路由。
                </p>
                <div className="text-xs space-y-1" style={{ color: secondaryText }}>
                  <div>• 所有区域必须连接</div>
                  <div>• 防止路由环路</div>
                  <div>• 必须连续</div>
                </div>
              </div>

              <div className="rounded-xl border-2 p-4" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                  <span className="font-bold" style={{ color: textColor }}>标准区域 (Standard Area)</span>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: secondaryText }}>
                  默认区域类型，接收所有 LSA（1、2、3、4、5 类）。区域内路由器学习完整路由信息。
                </p>
                <div className="text-xs p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }}>
                  <span style={{ color: textColor }}>✓ 接收外部路由 (External Routes)</span><br/>
                  <span style={{ color: textColor }}>✓ 接收区域间路由 (Inter-Area Routes)</span>
                </div>
              </div>

              <div className="rounded-xl border-2 p-4" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                  <span className="font-bold" style={{ color: textColor }}>末节区域 (Stub Area)</span>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: secondaryText }}>
                  不接收 5 类 LSA（外部路由），ABR 自动下发默认路由。减少 LSDB 大小，适合边缘网络。
                </p>
                <div className="text-xs p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)' }}>
                  <span style={{ color: '#ef4444' }}>✗ 不接收外部路由 (No External Routes)</span><br/>
                  <span style={{ color: '#10b981' }}>✓ ABR 下发默认路由 (Default Route)</span>
                </div>
              </div>

              <div className="rounded-xl border-2 p-4" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                  <span className="font-bold" style={{ color: textColor }}>完全末节区域 (Totally Stubby Area)</span>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: secondaryText }}>
                  Cisco 专有。不接收 3、4、5 类 LSA，ABR 只下发默认路由。LSDB 最小化。
                </p>
                <div className="text-xs p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }}>
                  <span style={{ color: '#ef4444' }}>✗ 不接收区域间路由 (No Inter-Area)</span><br/>
                  <span style={{ color: '#ef4444' }}>✗ 不接收外部路由 (No External)</span>
                </div>
              </div>

              <div className="rounded-xl border-2 p-4" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
                  <span className="font-bold" style={{ color: textColor }}>非纯末节区域 (NSSA)</span>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: secondaryText }}>
                  允许引入外部路由但不接收外部路由。7 类 LSA 在区域内泛洪，ABR 转换为 5 类 LSA。
                </p>
                <div className="text-xs p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)' }}>
                  <span style={{ color: '#10b981' }}>✓ 可以引入外部路由 (Can Import External)</span><br/>
                  <span style={{ color: '#ef4444' }}>✗ 不接收外部路由 (No Receive External)</span>
                </div>
              </div>
            </div>

            {/* 区域类型 Canvas 动画图 */}
            <div className="rounded-xl border overflow-hidden mb-6" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(249,250,251,0.5)', borderColor: borderColor }}>
              <div className="p-4 border-b" style={{ borderColor: borderColor }}>
                <h3 className="font-bold" style={{ color: textColor }}>OSPF 多区域拓扑示意图</h3>
              </div>
              <div className="relative" style={{ height: '400px' }}>
                <AreaDiagramCanvas isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* LSA 类型表格 */}
            <div className="mt-6 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }}>
                      <th className="p-3 text-left font-bold" style={{ color: primaryBlue }}>LSA 类型 (Type)</th>
                      <th className="p-3 text-left font-bold" style={{ color: primaryBlue }}>名称 (Name)</th>
                      <th className="p-3 text-left font-bold" style={{ color: primaryBlue }}>描述 (Description)</th>
                      <th className="p-3 text-left font-bold" style={{ color: primaryBlue }}>泛洪范围 (Flooding Scope)</th>
                      <th className="p-3 text-center font-bold" style={{ color: primaryBlue }}>标准区域 (Standard)</th>
                      <th className="p-3 text-center font-bold" style={{ color: primaryBlue }}>Stub 区域</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ divideColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                    <tr style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      <td className="p-3 font-bold" style={{ color: textColor }}>Type 1</td>
                      <td className="p-3" style={{ color: textColor }}>Router LSA<br/><span className="text-xs" style={{ color: secondaryText }}>(路由器 LSA)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>每台路由器产生<br/><span className="text-xs">(Generated by Each Router)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>区域内<br/><span className="text-xs">(Within Area)</span></td>
                      <td className="p-3 text-center" style={{ color: '#10b981' }}>✓</td>
                      <td className="p-3 text-center" style={{ color: '#10b981' }}>✓</td>
                    </tr>
                    <tr style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      <td className="p-3 font-bold" style={{ color: textColor }}>Type 2</td>
                      <td className="p-3" style={{ color: textColor }}>Network LSA<br/><span className="text-xs" style={{ color: secondaryText }}>(网络 LSA)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>DR 产生<br/><span className="text-xs">(Generated by DR)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>区域内<br/><span className="text-xs">(Within Area)</span></td>
                      <td className="p-3 text-center" style={{ color: '#10b981' }}>✓</td>
                      <td className="p-3 text-center" style={{ color: '#10b981' }}>✓</td>
                    </tr>
                    <tr style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      <td className="p-3 font-bold" style={{ color: textColor }}>Type 3</td>
                      <td className="p-3" style={{ color: textColor }}>Summary LSA<br/><span className="text-xs" style={{ color: secondaryText }}>(汇总 LSA)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>ABR 产生<br/><span className="text-xs">(Generated by ABR)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>区域间<br/><span className="text-xs">(Inter-Area)</span></td>
                      <td className="p-3 text-center" style={{ color: '#10b981' }}>✓</td>
                      <td className="p-3 text-center" style={{ color: '#10b981' }}>✓</td>
                    </tr>
                    <tr style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      <td className="p-3 font-bold" style={{ color: textColor }}>Type 4</td>
                      <td className="p-3" style={{ color: textColor }}>ASBR Summary LSA<br/><span className="text-xs" style={{ color: secondaryText }}>(ASBR 汇总 LSA)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>ABR 产生<br/><span className="text-xs">(Generated by ABR)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>区域间<br/><span className="text-xs">(Inter-Area)</span></td>
                      <td className="p-3 text-center" style={{ color: '#10b981' }}>✓</td>
                      <td className="p-3 text-center" style={{ color: '#ef4444' }}>✗</td>
                    </tr>
                    <tr style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      <td className="p-3 font-bold" style={{ color: textColor }}>Type 5</td>
                      <td className="p-3" style={{ color: textColor }}>External LSA<br/><span className="text-xs" style={{ color: secondaryText }}>(外部 LSA)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>ASBR 产生<br/><span className="text-xs">(Generated by ASBR)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>整个 AS<br/><span className="text-xs">(Entire AS)</span></td>
                      <td className="p-3 text-center" style={{ color: '#10b981' }}>✓</td>
                      <td className="p-3 text-center" style={{ color: '#ef4444' }}>✗</td>
                    </tr>
                    <tr style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      <td className="p-3 font-bold" style={{ color: textColor }}>Type 7</td>
                      <td className="p-3" style={{ color: textColor }}>NSSA External LSA<br/><span className="text-xs" style={{ color: secondaryText }}>(NSSA 外部 LSA)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>NSSA ASBR 产生<br/><span className="text-xs">(Generated by NSSA ASBR)</span></td>
                      <td className="p-3" style={{ color: secondaryText }}>NSSA 区域内<br/><span className="text-xs">(Within NSSA Area)</span></td>
                      <td className="p-3 text-center" style={{ color: secondaryText }}>-</td>
                      <td className="p-3 text-center" style={{ color: '#f59e0b' }}>NSSA 专用</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t mt-8" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>
            NetViz - 网络工程可视化平台 | OSPF 邻居建立过程与区域类型动画演示
          </div>
        </div>
      </footer>
    </div>
  );
}

// 区域类型 Canvas 动画组件
function AreaDiagramCanvas({ isDarkMode }: { isDarkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);

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

      context.fillStyle = bgColor;
      context.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;

      // 绘制周围区域（先绘制，让 Area 0 覆盖部分区域，体现重叠）
      const areas = [
        { name: 'Area 1', type: 'Standard', color: '#10b981', x: cx - 200, y: cy - 130, radius: 90 },
        { name: 'Area 2', type: 'Stub', color: '#8b5cf6', x: cx + 200, y: cy - 130, radius: 90 },
        { name: 'Area 3', type: 'NSSA', color: '#f59e0b', x: cx - 200, y: cy + 130, radius: 90 },
        { name: 'Area 4', type: 'Totally Stubby', color: '#ec4899', x: cx + 200, y: cy + 130, radius: 90 },
      ];

      // 先绘制各个区域（在 Area 0 下层）
      areas.forEach((area, index) => {
        const pulse = Math.sin(timeRef.current * 2 + index) * 3;
        
        // 区域光晕
        const areaGradient = context.createRadialGradient(area.x, area.y, 0, area.x, area.y, area.radius + pulse);
        areaGradient.addColorStop(0, area.color + '15');
        areaGradient.addColorStop(1, 'transparent');
        context.fillStyle = areaGradient;
        context.beginPath();
        context.arc(area.x, area.y, area.radius + pulse, 0, Math.PI * 2);
        context.fill();

        // 区域边界
        context.strokeStyle = area.color + '60';
        context.lineWidth = 2;
        context.setLineDash([5, 3]);
        context.beginPath();
        context.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);

        // 区域名称
        context.fillStyle = area.color;
        context.font = 'bold 13px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(area.name, area.x, area.y - 15);

        // 区域类型
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillStyle = isDarkMode ? '#9ca3af' : '#6b7280';
        context.fillText(area.type, area.x, area.y);
      });

      // 绘制 Area 0（骨干区域）- 中心圆（覆盖在其他区域之上，体现重叠）
      const area0Gradient = context.createRadialGradient(cx, cy, 0, cx, cy, 120);
      area0Gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      area0Gradient.addColorStop(0.7, 'rgba(59, 130, 246, 0.1)');
      area0Gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
      context.fillStyle = area0Gradient;
      context.beginPath();
      context.arc(cx, cy, 120, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      context.lineWidth = 3;
      context.setLineDash([8, 4]);
      context.beginPath();
      context.arc(cx, cy, 120, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);

      // Area 0 标签
      context.fillStyle = '#3b82f6';
      context.font = 'bold 15px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Area 0 (Backbone)', cx, cy - 10);
      context.font = '11px Inter, system-ui, sans-serif';
      context.fillStyle = isDarkMode ? '#9ca3af' : '#6b7280';
      context.fillText('骨干区域', cx, cy + 10);

      // ABR 位置（在 Area 0 和其他区域的重合处）
      const abrPositions = [
        { areaIndex: 0, angle: Math.PI * 1.35, label: 'ABR1' },
        { areaIndex: 1, angle: Math.PI * 0.35, label: 'ABR2' },
        { areaIndex: 2, angle: Math.PI * 1.15, label: 'ABR3' },
        { areaIndex: 3, angle: Math.PI * 0.65, label: 'ABR4' },
      ];

      abrPositions.forEach((abr) => {
        const area = areas[abr.areaIndex];
        // ABR 在两个区域重合的位置（Area 0 边界附近）
        const abrDistance = 100; // 在 Area 0 边界附近
        const abrX = cx + Math.cos(abr.angle) * abrDistance;
        const abrY = cy + Math.sin(abr.angle) * abrDistance;

        // ABR 光晕
        const abrGlow = context.createRadialGradient(abrX, abrY, 0, abrX, abrY, 25);
        abrGlow.addColorStop(0, area.color + '40');
        abrGlow.addColorStop(1, 'transparent');
        context.fillStyle = abrGlow;
        context.beginPath();
        context.arc(abrX, abrY, 25, 0, Math.PI * 2);
        context.fill();

        // ABR 路由器（跨两个区域）
        const pulse = Math.sin(timeRef.current * 3) * 2;
        context.fillStyle = area.color;
        context.beginPath();
        context.arc(abrX, abrY, 14 + pulse, 0, Math.PI * 2);
        context.fill();

        // ABR 边框（白色，体现重要性）
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(abrX, abrY, 14 + pulse, 0, Math.PI * 2);
        context.stroke();

        // ABR 标签
        context.fillStyle = 'white';
        context.font = 'bold 9px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('ABR', abrX, abrY - 2);
        
        // ABR 说明标签
        context.font = '8px Inter, system-ui, sans-serif';
        context.fillText(abr.label, abrX, abrY + 8);
      });

      // 连接 ABR 到其他路由器的链路
      areas.forEach((area, index) => {
        const abrPos = abrPositions[index];
        const abrX = cx + Math.cos(abrPos.angle) * 100;
        const abrY = cy + Math.sin(abrPos.angle) * 100;

        // 连接到区域内路由器
        const innerRouterX = area.x;
        const innerRouterY = area.y;

        context.strokeStyle = area.color + '50';
        context.lineWidth = 2;
        context.setLineDash([4, 3]);
        context.lineDashOffset = -(timeRef.current * 15) % 7;
        context.beginPath();
        context.moveTo(abrX, abrY);
        context.lineTo(innerRouterX, innerRouterY);
        context.stroke();
        context.setLineDash([]);
      });

      // 绘制各个区域内的路由器（不同类型）
      areas.forEach((area, index) => {
        // 区域内路由器（普通路由器）
        const innerRouters = [
          { x: area.x - 35, y: area.y - 25, type: 'IR' },
          { x: area.x + 35, y: area.y - 25, type: 'IR' },
          { x: area.x, y: area.y + 40, type: 'IR' },
        ];

        innerRouters.forEach((pos) => {
          context.fillStyle = area.color + 'c0';
          context.beginPath();
          context.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
          context.fill();

          // 路由器图标（十字）
          context.strokeStyle = 'white';
          context.lineWidth = 1.5;
          context.beginPath();
          context.moveTo(pos.x - 3, pos.y);
          context.lineTo(pos.x + 3, pos.y);
          context.moveTo(pos.x, pos.y - 3);
          context.lineTo(pos.x, pos.y + 3);
          context.stroke();
        });

        // 在 Area 3 (NSSA) 中添加 ASBR
        if (index === 2) {
          const asbrX = area.x + 45;
          const asbrY = area.y + 20;
          
          // ASBR 光晕（红色，表示特殊）
          const asbrGlow = context.createRadialGradient(asbrX, asbrY, 0, asbrX, asbrY, 20);
          asbrGlow.addColorStop(0, '#ef4444' + '50');
          asbrGlow.addColorStop(1, 'transparent');
          context.fillStyle = asbrGlow;
          context.beginPath();
          context.arc(asbrX, asbrY, 20, 0, Math.PI * 2);
          context.fill();

          // ASBR 路由器（带星号标记）
          context.fillStyle = '#ef4444';
          context.beginPath();
          context.arc(asbrX, asbrY, 9, 0, Math.PI * 2);
          context.fill();

          context.strokeStyle = 'white';
          context.lineWidth = 2;
          context.beginPath();
          context.arc(asbrX, asbrY, 9, 0, Math.PI * 2);
          context.stroke();

          // ASBR 标签
          context.fillStyle = 'white';
          context.font = 'bold 8px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText('ASBR', asbrX, asbrY);
        }
      });

      // 中心路由器（Area 0 内部路由器）
      const centerRouters = [
        { x: cx - 60, y: cy - 40, type: 'IR' },
        { x: cx + 60, y: cy - 40, type: 'IR' },
        { x: cx, y: cy + 70, type: 'IR' },
      ];

      centerRouters.forEach((pos, idx) => {
        const pulse = Math.sin(timeRef.current * 2 + idx) * 2;
        
        context.fillStyle = '#3b82f6';
        context.beginPath();
        context.arc(pos.x, pos.y, 10 + pulse, 0, Math.PI * 2);
        context.fill();

        // 路由器图标
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(pos.x - 4, pos.y);
        context.lineTo(pos.x + 4, pos.y);
        context.moveTo(pos.x, pos.y - 4);
        context.lineTo(pos.x, pos.y + 4);
        context.stroke();

        // IR 标签
        context.font = 'bold 7px Inter, system-ui, sans-serif';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('IR', pos.x, pos.y + 18);
      });

      // 图例说明
      const legendY = height - 30;
      const legendItems = [
        { color: '#3b82f6', label: 'Area 0 IR' },
        { color: '#10b981', label: 'Area IR' },
        { color: '#ef4444', label: 'ASBR' },
      ];

      legendItems.forEach((item, idx) => {
        const x = 20 + idx * 90;
        context.fillStyle = item.color;
        context.beginPath();
        context.arc(x, legendY, 5, 0, Math.PI * 2);
        context.fill();

        context.font = '9px Inter, system-ui, sans-serif';
        context.fillStyle = isDarkMode ? '#9ca3af' : '#6b7280';
        context.textAlign = 'left';
        context.fillText(item.label, x + 10, legendY + 3);
      });

      // ABR 图例
      context.fillStyle = '#8b5cf6';
      context.beginPath();
      context.arc(width - 120, legendY, 5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'white';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(width - 120, legendY, 5, 0, Math.PI * 2);
      context.stroke();
      context.font = '9px Inter, system-ui, sans-serif';
      context.fillStyle = isDarkMode ? '#9ca3af' : '#6b7280';
      context.textAlign = 'left';
      context.fillText('ABR (重合处)', width - 110, legendY + 3);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDarkMode]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />;
}
