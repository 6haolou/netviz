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

interface PortRole {
  sideA: string; // port role on the first switch side
  sideB: string; // port role on the second switch side
}

interface StepInfo {
  phase: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  packets: { from: number; to: number; type: string; delay: number }[];
  linkStates: string[]; // 'forwarding' | 'blocked' | 'alternate' per link
  portRoles: PortRole[]; // per link
  rootBridge: number; // index of root bridge, -1 if not elected
}

const SWITCH_NAMES = ['SW-A', 'SW-B', 'SW-C', 'SW-D'];
const SWITCH_MACS = ['00:01:02:03:04:AA (Prio: 4096)', '00:01:02:03:04:BB (Prio: 32768)', '00:01:02:03:04:CC (Prio: 32768)', '00:01:02:03:04:DD (Prio: 32768)'];
const SWITCH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

// Link definitions: [from, to, label]
const LINKS = [
  { from: 0, to: 1, label: 'A↔B' },
  { from: 0, to: 2, label: 'A↔C' },
  { from: 1, to: 2, label: 'B↔C' },
  { from: 1, to: 3, label: 'B↔D' },
];

const LINK_COST = [19, 19, 19, 19];

export default function STPPage() {
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
      title: '网络启动',
      description: '四台交换机刚启动，所有端口处于初始 Blocking 状态。SW-A↔SW-B↔SW-C 形成三角环路，需要 STP 阻断冗余链路来消除环路。',
      packets: [],
      linkStates: ['blocked', 'blocked', 'blocked', 'blocked'],
      portRoles: [
        { sideA: 'Block', sideB: 'Block' },
        { sideA: 'Block', sideB: 'Block' },
        { sideA: 'Block', sideB: 'Block' },
        { sideA: 'Block', sideB: 'Block' },
      ],
      rootBridge: -1,
    },
    {
      phase: '根桥选举',
      icon: <Emoji label="👑" />,
      title: '选举 Root Bridge',
      description: '所有交换机发送 BPDU，比较 Bridge ID（优先级 + MAC 地址）。SW-A 的优先级 4096 最低，成为根桥 👑。其他交换机优先级均为默认值 32768。',
      packets: [
        { from: 1, to: 0, type: 'BPDU', delay: 0 },
        { from: 2, to: 0, type: 'BPDU', delay: 300 },
        { from: 3, to: 1, type: 'BPDU', delay: 600 },
        { from: 1, to: 2, type: 'BPDU', delay: 900 },
      ],
      linkStates: ['alternate', 'alternate', 'alternate', 'alternate'],
      portRoles: [
        { sideA: 'DP', sideB: '' },
        { sideA: 'DP', sideB: '' },
        { sideA: '', sideB: '' },
        { sideA: '', sideB: '' },
      ],
      rootBridge: 0,
    },
    {
      phase: '根端口选举',
      icon: <Emoji label="🔌" />,
      title: '选举 Root Port',
      description: '每台非根桥交换机选择到达根桥路径成本最低的端口作为根端口（RP）。SW-B 和 SW-C 的直连端口到根桥成本 19，成为 RP。SW-D 通过 SW-B 到达根桥成本 38，其连接到 SW-B 的端口为 RP。',
      packets: [
        { from: 0, to: 1, type: 'BPDU', delay: 0 },
        { from: 0, to: 2, type: 'BPDU', delay: 300 },
        { from: 1, to: 3, type: 'BPDU', delay: 600 },
      ],
      linkStates: ['forwarding', 'forwarding', 'alternate', 'alternate'],
      portRoles: [
        { sideA: 'DP', sideB: 'RP' },
        { sideA: 'DP', sideB: 'RP' },
        { sideA: '', sideB: '' },
        { sideA: 'DP', sideB: 'RP' },
      ],
      rootBridge: 0,
    },
    {
      phase: '指定端口选举',
      icon: <Emoji label="🎯" />,
      title: '选举 Designated Port',
      description: '每个网段选举一个指定端口（DP）。根桥的端口都是 DP。B↔C 网段中，SW-B 到根桥路径成本更低，所以 SW-B 侧为 DP。B↔D 网段中，SW-B 侧为 DP。',
      packets: [],
      linkStates: ['forwarding', 'forwarding', 'alternate', 'forwarding'],
      portRoles: [
        { sideA: 'DP', sideB: 'RP' },
        { sideA: 'DP', sideB: 'RP' },
        { sideA: 'DP', sideB: '' },
        { sideA: 'DP', sideB: 'RP' },
      ],
      rootBridge: 0,
    },
    {
      phase: '阻塞端口',
      icon: <Emoji label="🚫" />,
      title: '阻塞冗余端口',
      description: 'SW-C 连接到 SW-B 的端口既不是 RP 也不是 DP，被置为 Blocking 状态，阻断此链路。B↔C 链路断开，三角环路被消除，网络形成无环树形拓扑。',
      packets: [
        { from: 0, to: 1, type: 'Data', delay: 0 },
        { from: 0, to: 2, type: 'Data', delay: 200 },
        { from: 1, to: 3, type: 'Data', delay: 400 },
      ],
      linkStates: ['forwarding', 'forwarding', 'blocked', 'forwarding'],
      portRoles: [
        { sideA: 'DP', sideB: 'RP' },
        { sideA: 'DP', sideB: 'RP' },
        { sideA: 'DP', sideB: 'Block' },
        { sideA: 'DP', sideB: 'RP' },
      ],
      rootBridge: 0,
    },
    {
      phase: '收敛完成',
      icon: <Emoji label="✅" />,
      title: 'STP 收敛完成',
      description: '树形拓扑已形成！根桥 SW-A 位于树根，所有数据沿绿色路径转发。B↔C 链路被阻塞，消除了环路。网络稳定，广播帧只在树形路径上传播。',
      packets: [
        { from: 0, to: 1, type: 'Data', delay: 0 },
        { from: 1, to: 3, type: 'Data', delay: 300 },
        { from: 3, to: 1, type: 'Data', delay: 600 },
      ],
      linkStates: ['forwarding', 'forwarding', 'blocked', 'forwarding'],
      portRoles: [
        { sideA: 'DP', sideB: 'RP' },
        { sideA: 'DP', sideB: 'RP' },
        { sideA: 'DP', sideB: 'Block' },
        { sideA: 'DP', sideB: 'RP' },
      ],
      rootBridge: 0,
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'BPDU': { start: '#3b82f6', end: '#2563eb' },
    'Data': { start: '#10b981', end: '#059669' },
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
      return { type: p.type, from: SWITCH_NAMES[p.from], to: SWITCH_NAMES[p.to] };
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

      const step = steps[currentStep];
      const linkStates = step.linkStates;

      // Switch positions: tree layout
      const swPositions = [
        { x: width * 0.5, y: height * 0.15 },   // SW-A (root, top)
        { x: width * 0.25, y: height * 0.48 },  // SW-B (left)
        { x: width * 0.75, y: height * 0.48 },  // SW-C (right)
        { x: width * 0.25, y: height * 0.82 },  // SW-D (bottom)
      ];

      // === Draw links ===
      LINKS.forEach((link, idx) => {
        const from = swPositions[link.from];
        const to = swPositions[link.to];
        const state = linkStates[idx];

        let linkColor = '#64748b';
        let linkWidth = 2;
        let isDashed = true;
        let showX = false;

        if (state === 'forwarding') {
          linkColor = '#22c55e';
          linkWidth = 4;
          isDashed = false;
        } else if (state === 'blocked') {
          linkColor = '#ef4444';
          linkWidth = 3;
          isDashed = true;
          showX = true;
        } else if (state === 'alternate') {
          linkColor = isDarkMode ? '#4b5563' : '#9ca3af';
          linkWidth = 2;
          isDashed = true;
        }

        if (isDashed) {
          context.setLineDash([8, 6]);
          context.lineDashOffset = -(timeRef.current * 20) % 14;
        } else {
          context.setLineDash([]);
        }

        context.strokeStyle = linkColor;
        context.lineWidth = linkWidth;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.setLineDash([]);

        // Show X on blocked link
        if (showX) {
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          const xSize = 14;
          context.strokeStyle = '#ef4444';
          context.lineWidth = 4;
          context.lineCap = 'round';
          context.beginPath();
          context.moveTo(mx - xSize, my - xSize);
          context.lineTo(mx + xSize, my + xSize);
          context.stroke();
          context.beginPath();
          context.moveTo(mx + xSize, my - xSize);
          context.lineTo(mx - xSize, my + xSize);
          context.stroke();
        }

        // Link cost label
        if (state !== 'blocked') {
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const labelOffX = Math.sin(angle) * 18;
          const labelOffY = -Math.cos(angle) * 18;

          context.fillStyle = secondaryText;
          context.font = '11px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(`Cost: ${LINK_COST[idx]}`, mx + labelOffX, my + labelOffY);
        }

        // Port role labels near each switch
        const portRoles = step.portRoles[idx];
        if (portRoles.sideA) {
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const labelX = from.x + Math.cos(angle) * 58;
          const labelY = from.y + Math.sin(angle) * 58;
          const roleColor = portRoles.sideA === 'Block' ? '#ef4444' : (portRoles.sideA === 'RP' ? '#f59e0b' : '#22c55e');
          context.fillStyle = roleColor;
          context.font = 'bold 10px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(portRoles.sideA, labelX, labelY - 14);
        }
        if (portRoles.sideB) {
          const angle = Math.atan2(from.y - to.y, from.x - to.x);
          const labelX = to.x + Math.cos(angle) * 58;
          const labelY = to.y + Math.sin(angle) * 58;
          const roleColor = portRoles.sideB === 'Block' ? '#ef4444' : (portRoles.sideB === 'RP' ? '#f59e0b' : '#22c55e');
          context.fillStyle = roleColor;
          context.font = 'bold 10px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(portRoles.sideB, labelX, labelY - 14);
        }
      });

      // === Draw switches ===
      const drawSwitch = (x: number, y: number, label: string, mac: string, color: string, index: number) => {
        const isRoot = step.rootBridge === index;
        const pulse = Math.sin(timeRef.current * 3) * 4;

        // Glow for root
        if (isRoot) {
          const glowColor = '#fbbf24';
          const glowGradient = context.createRadialGradient(x, y, 30, x, y, 70 + pulse);
          glowGradient.addColorStop(0, glowColor + '40');
          glowGradient.addColorStop(1, 'transparent');
          context.fillStyle = glowGradient;
          context.beginPath();
          context.arc(x, y, 70 + pulse, 0, Math.PI * 2);
          context.fill();
        }

        // Switch body
        const gradient = context.createLinearGradient(x - 40, y - 35, x + 40, y + 35);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + 'cc');
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(x - 40, y - 35, 80, 70, 10);
        context.fill();

        // Port indicators on the switch face
        context.fillStyle = 'rgba(255, 255, 255, 0.25)';
        context.fillRect(x - 28, y - 20, 56, 4);
        context.fillRect(x - 28, y - 10, 56, 4);
        context.fillRect(x - 28, y, 56, 4);

        // Link LEDs (small dots on sides)
        const ledColor = isDarkMode ? '#22c55e' : '#16a34a';
        context.fillStyle = ledColor;
        context.beginPath();
        context.arc(x + 35, y - 8, 3, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(x - 35, y + 8, 3, 0, Math.PI * 2);
        context.fill();

        // Crown for root bridge
        if (isRoot) {
          context.font = '28px sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'bottom';
          context.fillText('👑', x, y - 48);
        }

        // Switch name
        context.fillStyle = 'white';
        context.font = 'bold 15px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(label, x, y + 55);

        // MAC and priority
        context.fillStyle = 'rgba(255, 255, 255, 0.6)';
        context.font = '8px Inter, system-ui, sans-serif';
        context.fillText(mac, x, y + 70);
      };

      // Draw each switch
      swPositions.forEach((pos, idx) => {
        drawSwitch(pos.x, pos.y, SWITCH_NAMES[idx], SWITCH_MACS[idx], SWITCH_COLORS[idx], idx);
      });

      // === Update and draw packets ===
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
            return { ...packet, progress: Math.min(1, packet.progress + 0.006) };
          }
          return { ...packet, completed: true };
        });
        return updated ? newPackets : prevPackets;
      });

      packets.forEach((packet) => {
        if (!packet.active || packet.completed) return;

        const fromPos = swPositions[packet.from];
        const toPos = swPositions[packet.to];
        const currentX = fromPos.x + (toPos.x - fromPos.x) * packet.progress;
        const currentY = fromPos.y + (toPos.y - fromPos.y) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };

        // Tail
        const tailProgress = Math.max(0, packet.progress - 0.12);
        const tailX = fromPos.x + (toPos.x - fromPos.x) * tailProgress;
        const tailY = fromPos.y + (toPos.y - fromPos.y) * tailProgress;

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

        const size = packet.type === 'Data' ? 16 : 20;
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

        if (packet.type === 'Data') {
          context.beginPath();
          context.arc(0, 0, size, 0, Math.PI * 2);
        } else {
          context.beginPath();
          context.roundRect(-size, -size * 0.7, size * 2, size * 1.4, 4);
        }
        context.fill();

        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        context.lineWidth = 2;
        context.stroke();
        context.restore();

        // Label
        context.fillStyle = 'white';
        context.font = `bold ${packet.type === 'Data' ? 7 : 8}px Inter, system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 3;
        context.fillText(packet.type, currentX, currentY);
        context.shadowBlur = 0;
      });

      // Show topology formed message in final step
      if (currentStep === 5) {
        context.fillStyle = '#22c55e';
        context.font = 'bold 18px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('✓ 无环树形拓扑已形成', width * 0.5, height * 0.94);
      }

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

  const linkStateLabels: Record<string, string> = {
    'forwarding': '转发',
    'blocked': '阻塞',
    'alternate': '待定',
  };
  const linkStateColors: Record<string, string> = {
    'forwarding': '#22c55e',
    'blocked': '#ef4444',
    'alternate': '#6b7280',
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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>STP 生成树协议</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>Spanning Tree Protocol</p>
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
          {/* Overview */}
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>STP 生成树协议（Spanning Tree Protocol）</h3>
            <p className="text-sm leading-relaxed" style={{ color: textColor }}>
              <span style={{ color: primaryBlue, fontWeight: 600 }}>防止环路：</span>STP 通过计算生成一棵树形拓扑，阻塞冗余端口，防止二层网络出现广播风暴。<br/>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>端口角色：</span>根端口（RP）— 到达根桥最优路径的端口；指定端口（DP）— 每个网段负责转发数据的端口；阻塞端口（Block）— 阻断的冗余端口。<br/>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>状态变迁：</span>Blocking → Listening → Learning → Forwarding（收敛时间约 30-50 秒）。<br/>
              <span style={{ color: '#8b5cf6', fontWeight: 600 }}>桥优先级：</span>值越小越优先成为根桥，默认 32768，步长 4096（只能设置为 4096 的倍数）。
            </p>
          </div>

          {/* 二、STP vs RSTP vs MSTP 对比 */}
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>二、STP 与 RSTP/MSTP 对比</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: primaryBlue }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>STP</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} /><span style={{ color: textColor }}>收敛时间 30-50 秒</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} /><span style={{ color: textColor }}>单一生成树实例</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} /><span style={{ color: textColor }}>端口状态：5 种</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} /><span style={{ color: textColor }}>IEEE 802.1D</span></div>
                </div>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: '#10b981' }}>RSTP</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} /><span style={{ color: textColor }}>快速收敛（1-2 秒）</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} /><span style={{ color: textColor }}>单一生成树实例</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} /><span style={{ color: textColor }}>端口角色：3 种</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} /><span style={{ color: textColor }}>IEEE 802.1w</span></div>
                </div>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: '#8b5cf6' }}>MSTP</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} /><span style={{ color: textColor }}>多实例负载均衡</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} /><span style={{ color: textColor }}>快速收敛（1-2 秒）</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} /><span style={{ color: textColor }}>MST 域概念</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} /><span style={{ color: textColor }}>IEEE 802.1s</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* 三、STP 报文首部详解 */}
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>三、STP 报文首部详解</h2>
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                STP 使用 BPDU（Bridge Protocol Data Unit）进行通信，封装在以太网帧中，目的 MAC 地址为 01:80:C2:00:00:00。BPDU 包含协议标识符、根桥 ID、路径开销、桥 ID、端口 ID、定时器等关键字段。
              </p>
              <div className="overflow-x-auto mb-6">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-16 p-2 rounded-tl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>协议标识符</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>0x0000</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>协议版本</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>0=STP</div>
                    </div>
                    <div className="col-span-8 p-2 rounded-tr-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>BPDU 类型</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>0x00=配置BPDU</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}>
                      <div className="font-bold" style={{ color: '#ef4444' }}>标志（Flags）</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>TC、TCA 标志位</div>
                    </div>
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)', border: '1px solid #f97316' }}>
                      <div className="font-bold" style={{ color: '#f97316' }}>根桥 ID</div>
                      <div className="text-xs" style={{ color: secondaryText }}>64位</div>
                      <div className="text-xs" style={{ color: textColor }}>优先级 + MAC 地址</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7' }}>
                      <div className="font-bold" style={{ color: '#a855f7' }}>根路径开销</div>
                      <div className="text-xs" style={{ color: secondaryText }}>32位</div>
                      <div className="text-xs" style={{ color: textColor }}>到达根桥的路径开销</div>
                    </div>
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}>
                      <div className="font-bold" style={{ color: '#ec4899' }}>桥 ID</div>
                      <div className="text-xs" style={{ color: secondaryText }}>64位</div>
                      <div className="text-xs" style={{ color: textColor }}>发送 BPDU 的桥 ID</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(14, 165, 233, 0.3)' : 'rgba(14, 165, 233, 0.2)', border: '1px solid #0ea5e9' }}>
                      <div className="font-bold" style={{ color: '#0ea5e9' }}>端口 ID</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>发送端口标识</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e' }}>
                      <div className="font-bold" style={{ color: '#22c55e' }}>消息年龄</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>BPDU 生存时间</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(107, 114, 128, 0.2)', border: '1px solid #64748b' }}>
                      <div className="font-bold" style={{ color: '#64748b' }}>最大年龄</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>Max Age = 20s</div>
                    </div>
                    <div className="col-span-8 p-2 rounded-br-lg" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>Hello 时间</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>Hello Time = 2s</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>⏱️ STP 定时器</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>Hello Time</span></span><span>2 秒</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>Forward Delay</span></span><span>15 秒</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>Max Age</span></span><span>20 秒</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ 常见配置命令</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>spanning-tree vlan 1</span></span><span>启用 STP</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>spanning-tree priority 4096</span></span><span>设置桥优先级</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>spanning-tree portfast</span></span><span>快速端口</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>show spanning-tree</span></span><span>查看 STP 状态</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 四、STP 端口状态与收敛 */}
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、STP 端口状态与收敛</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: primaryBlue }}>
                <div className="text-2xl font-bold mb-2" style={{ color: primaryBlue }}>32768</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>默认优先级</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>桥优先级（步长 4096）</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#10b981' }}>30-50s</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>收敛时间</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>STP 收敛时间</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#8b5cf6' }}>5</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>端口状态</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>Blocking→Listening→Learning→Forwarding</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)', borderColor: '#f97316' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#f97316' }}>20</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>最大年龄</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>BPDU 最大生存时间（Max Age）</p>
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
              </div>

              {/* Step controls */}
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
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>BPDU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>Data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>转发端口</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>阻塞端口</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderColor }}>
                  <span className="text-2xl">{steps[currentStep].icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{steps[currentStep].title}</h3>
                    <p className="text-xs" style={{ color: secondaryText }}>步骤 {currentStep + 1} / {steps.length} | {steps[currentStep].phase}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: textColor }}>{steps[currentStep].description}</p>
                </div>

                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #10b981, #f59e0b, #ef4444)` }} />
                </div>
              </div>

              {/* Packet log */}
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📦</span>
                  <div>
                    <h4 className="font-bold">BPDU 报文日志</h4>
                    <p className="text-xs" style={{ color: secondaryText }}>当前步骤报文交互</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '150px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                      <span>暂无报文</span>
                    </div>
                  ) : (
                    packetLogs.map((log, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} />
                        <span className="text-sm font-semibold" style={{ color: textColor }}>{log.from} → {log.to}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: (packetColors[log.type]?.start || '#64748b') + '30', color: packetColors[log.type]?.start || '#64748b' }}>{log.type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Link state status */}
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <h4 className="font-bold mb-3">链路状态</h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {LINKS.map((link, idx) => {
                    const state = steps[currentStep].linkStates[idx];
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: linkStateColors[state] || '#6b7280' }} />
                          <span style={{ color: textColor }}>{link.label}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold" style={{ backgroundColor: (linkStateColors[state] || '#6b7280') + '30', color: linkStateColors[state] || '#6b7280' }}>
                          {linkStateLabels[state] || state}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | STP 生成树协议动画演示</div>
        </div>
      </footer>
    </div>
  );
}
