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
  packets: { from: number; to: number; type: string; delay: number }[];
}

export default function MSTPPage() {
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
      title: 'MSTP 计算前',
      description: '三台交换机配置相同的 MSTP 域名（AZURE）和 VLAN 映射。Instance 1 映射 VLAN 10，Instance 2 映射 VLAN 20。',
      packets: [],
    },
    {
      phase: '域配置',
      icon: <Emoji label="🔧" />,
      title: 'MST 域配置',
      description: '交换机配置相同的域名 AZURE、修订级别 0，并将 VLAN 10 映射到 Instance 1，VLAN 20 映射到 Instance 2。',
      packets: [{ from: 0, to: 1, type: 'MSTP', delay: 0 }, { from: 1, to: 2, type: 'MSTP', delay: 200 }],
    },
    {
      phase: '实例 1 选举',
      icon: <Emoji label="🔢" />,
      title: 'Instance 1 根桥选举',
      description: '在 Instance 1 中，通过比较 Bridge ID 选举根桥。SW-A 的优先级最低（4096）成为 Instance 1 的根桥，负责转发 VLAN 10 的流量。',
      packets: [{ from: 0, to: 1, type: 'MSTI-1', delay: 0 }, { from: 0, to: 2, type: 'MSTI-1', delay: 300 }],
    },
    {
      phase: '实例 2 选举',
      icon: <Emoji label="🔢" />,
      title: 'Instance 2 根桥选举',
      description: '在 Instance 2 中，SW-C 成为根桥（优先级 4096），与 Instance 1 不同。这样 VLAN 20 的流量走另一条路径，实现负载均衡。',
      packets: [{ from: 2, to: 0, type: 'MSTI-2', delay: 0 }, { from: 2, to: 1, type: 'MSTI-2', delay: 300 }],
    },
    {
      phase: '端口角色',
      icon: <Emoji label="🎯" />,
      title: '端口角色确定',
      description: '根据两个实例的计算结果，确定每个端口的角色。不同实例可以有不同的端口状态，实现负载均衡。',
      packets: [],
    },
    {
      phase: '收敛完成',
      icon: <Emoji label="✅" />,
      title: 'MSTP 收敛完成',
      description: 'MSTP 收敛完成，形成无环拓扑。Instance 1 和 Instance 2 使用不同的转发路径，优化网络负载。',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'MSTP': { start: '#8b5cf6', end: '#7c3aed' },
    'MSTI-1': { start: '#3b82f6', end: '#2563eb' },
    'MSTI-2': { start: '#10b981', end: '#059669' },
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
      const labels = ['SW-A', 'SW-B', 'SW-C'];
      return {
        type: p.type,
        from: labels[p.from],
        to: labels[p.to],
      };
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

      const switchPositions = [
        { x: width * 0.5, y: height * 0.2 },
        { x: width * 0.2, y: height * 0.7 },
        { x: width * 0.8, y: height * 0.7 },
      ];

      const switchLabels = ['SW-A', 'SW-B', 'SW-C'];
      const switchMacs = ['00:01:02:03:04:AA', '00:01:02:03:04:BB', '00:01:02:03:04:CC'];
      const instance1Root = currentStep >= 2;
      const instance2Root = currentStep >= 3;

      const drawSwitch = (x: number, y: number, label: string, mac: string, index: number) => {
        const pulse = Math.sin(timeRef.current * 3) * 4;
        const isInst1Root = instance1Root && index === 0;
        const isInst2Root = instance2Root && index === 2;

        let actualColor = '#64748b';
        if (isInst1Root && isInst2Root) {
          actualColor = '#8b5cf6';
        } else if (isInst1Root) {
          actualColor = primaryBlue;
        } else if (isInst2Root) {
          actualColor = '#10b981';
        }

        const glowGradient = context.createRadialGradient(x, y, 30, x, y, 80 + pulse);
        glowGradient.addColorStop(0, actualColor + '30');
        glowGradient.addColorStop(1, 'transparent');
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(x, y, 80 + pulse, 0, Math.PI * 2);
        context.fill();

        const nodeGradient = context.createLinearGradient(x - 45, y - 45, x + 45, y + 45);
        nodeGradient.addColorStop(0, actualColor);
        nodeGradient.addColorStop(1, actualColor + 'cc');
        context.fillStyle = nodeGradient;
        context.beginPath();
        context.roundRect(x - 45, y - 45, 90, 90, 12);
        context.fill();

        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        context.fillRect(x - 35, y - 25, 70, 5);
        context.fillRect(x - 35, y - 15, 70, 5);
        context.fillRect(x - 35, y - 5, 70, 5);

        if (isInst1Root) {
          context.fillStyle = primaryBlue;
          context.font = 'bold 14px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.fillText('I1 Root', x, y - 55);
        }
        if (isInst2Root) {
          context.fillStyle = '#10b981';
          context.font = 'bold 14px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.fillText('I2 Root', x, y - 70);
        }

        context.fillStyle = 'white';
        context.font = 'bold 16px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 105);

        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText('AZURE 域', x, y + 120);

        context.fillStyle = 'rgba(255, 255, 255, 0.5)';
        context.font = '9px Inter, system-ui, sans-serif';
        context.fillText(mac, x, y + 135);
      };

      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
      context.lineWidth = 3;

      context.beginPath();
      context.moveTo(switchPositions[0].x, switchPositions[0].y + 45);
      context.lineTo(switchPositions[1].x, switchPositions[1].y - 45);
      context.moveTo(switchPositions[0].x, switchPositions[0].y + 45);
      context.lineTo(switchPositions[2].x, switchPositions[2].y - 45);
      context.moveTo(switchPositions[1].x + 45, switchPositions[1].y);
      context.lineTo(switchPositions[2].x - 45, switchPositions[2].y);
      context.stroke();

      // === Instance paths (steps 4+) ===
      // Instance 1 (VLAN 10): A → B, blue
      // Instance 2 (VLAN 20): A → C → B, green
      const showPaths = currentStep >= 4;

      if (showPaths) {
        // Instance 2 path: A ↔ C (highlighted green)
        context.strokeStyle = '#10b981';
        context.lineWidth = 3;
        context.setLineDash([]);
        context.beginPath();
        context.moveTo(switchPositions[0].x, switchPositions[0].y + 45);
        context.lineTo(switchPositions[2].x, switchPositions[2].y - 45);
        context.stroke();

        // Instance 1 path: A ↔ B (highlighted blue)
        context.strokeStyle = primaryBlue;
        context.lineWidth = 3;
        context.setLineDash([]);
        context.beginPath();
        context.moveTo(switchPositions[0].x - 30, switchPositions[0].y + 45);
        context.lineTo(switchPositions[1].x + 45, switchPositions[1].y);
        context.stroke();

        // C ↔ B for Instance 2 (green)
        context.strokeStyle = '#10b981';
        context.lineWidth = 3;
        context.setLineDash([]);
        context.beginPath();
        context.moveTo(switchPositions[1].x + 45, switchPositions[1].y);
        context.lineTo(switchPositions[2].x - 45, switchPositions[2].y);
        context.stroke();

        // Labels
        context.fillStyle = primaryBlue;
        context.font = 'bold 11px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('VLAN 10 (Instance 1)', switchPositions[0].x - 55, (switchPositions[0].y + switchPositions[1].y) / 2 + 40);

        context.fillStyle = '#10b981';
        context.font = 'bold 11px Inter, system-ui, sans-serif';
        context.fillText('VLAN 20 (Instance 2)', (switchPositions[0].x + switchPositions[2].x) / 2 + 45, (switchPositions[0].y + switchPositions[2].y) / 2 - 20);

        // === Animated traffic flow ===
        // Instance 1 traffic: blue data packets flowing A↔B
        const numTraffic1 = 3;
        for (let i = 0; i < numTraffic1; i++) {
          const t = ((timeRef.current * 0.5 + i * 1.2) % 4) / 4;
          const ax = switchPositions[0].x - 30;
          const ay = switchPositions[0].y + 45;
          const bx = switchPositions[1].x + 45;
          const by = switchPositions[1].y;
          const tx = ax + (bx - ax) * t;
          const ty = ay + (by - ay) * t;
          const alpha = t < 0.1 ? t * 10 : (t > 0.9 ? (1 - t) * 10 : 1);
          context.fillStyle = `rgba(59, 130, 246, ${alpha * 0.7})`;
          context.beginPath();
          context.arc(tx, ty, 6, 0, Math.PI * 2);
          context.fill();
        }

        // Instance 2 traffic: green data packets flowing A↔C↔B
        // Segment A→C
        for (let i = 0; i < 2; i++) {
          const t = ((timeRef.current * 0.4 + i * 1.8) % 5) / 5;
          const ax = switchPositions[0].x;
          const ay = switchPositions[0].y + 45;
          const cx = switchPositions[2].x;
          const cy = switchPositions[2].y - 45;
          const tx = ax + (cx - ax) * t;
          const ty = ay + (cy - ay) * t;
          const alpha = t < 0.1 ? t * 10 : (t > 0.9 ? (1 - t) * 10 : 1);
          if (t < 0.95) {
            context.fillStyle = `rgba(16, 185, 129, ${alpha * 0.7})`;
            context.beginPath();
            context.arc(tx, ty, 6, 0, Math.PI * 2);
            context.fill();
          }
        }
        // Segment C→B
        for (let i = 0; i < 2; i++) {
          const t = ((timeRef.current * 0.4 + i * 1.8) % 5) / 5;
          const cx = switchPositions[2].x - 45;
          const cy = switchPositions[2].y;
          const bx = switchPositions[1].x + 45;
          const by = switchPositions[1].y;
          const tx = cx + (bx - cx) * t;
          const ty = cy + (by - cy) * t;
          const alpha = t < 0.1 ? t * 10 : (t > 0.9 ? (1 - t) * 10 : 1);
          if (t < 0.95) {
            context.fillStyle = `rgba(16, 185, 129, ${alpha * 0.7})`;
            context.beginPath();
            context.arc(tx, ty, 6, 0, Math.PI * 2);
            context.fill();
          }
        }
      }

      drawSwitch(switchPositions[0].x, switchPositions[0].y, switchLabels[0], switchMacs[0], 0);
      drawSwitch(switchPositions[1].x, switchPositions[1].y, switchLabels[1], switchMacs[1], 1);
      drawSwitch(switchPositions[2].x, switchPositions[2].y, switchLabels[2], switchMacs[2], 2);

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

      if (currentStep >= 1 && currentStep <= 3) {
        const stepData = steps[currentStep];
        if (stepData.packets.length > 0) {
          stepData.packets.forEach((packetData) => {
            const fromNode = switchPositions[packetData.from];
            const toNode = switchPositions[packetData.to];

            const activePacket = packets.find((p) => p.type === packetData.type && p.from === packetData.from);
            const progress = activePacket?.progress || 0;

            if (progress > 0) {
              const headX = fromNode.x + (toNode.x - fromNode.x) * progress;
              const headY = fromNode.y + (toNode.y - fromNode.y) * progress;

              const tailProgress = Math.max(0, progress - 0.08);
              const tailX = fromNode.x + (toNode.x - fromNode.x) * tailProgress;
              const tailY = fromNode.y + (toNode.y - fromNode.y) * tailProgress;

              const colors = packetColors[packetData.type] || { start: '#64748b', end: '#475569' };

              context.strokeStyle = colors.start;
              context.lineWidth = 4;
              context.lineCap = 'round';
              context.beginPath();
              context.moveTo(tailX, tailY);
              context.lineTo(headX, headY);
              context.stroke();

              const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
              const arrowSize = 12;

              context.fillStyle = colors.start;
              context.beginPath();
              context.moveTo(headX, headY);
              context.lineTo(
                headX - arrowSize * Math.cos(angle - Math.PI / 6),
                headY - arrowSize * Math.sin(angle - Math.PI / 6)
              );
              context.lineTo(
                headX - arrowSize * Math.cos(angle + Math.PI / 6),
                headY - arrowSize * Math.sin(angle + Math.PI / 6)
              );
              context.closePath();
              context.fill();
            }
          });
        }
      }

      packets.forEach((packet) => {
        if (!packet.active) return;

        const fromNode = switchPositions[packet.from];
        const toNode = switchPositions[packet.to];

        const currentX = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        const currentY = fromNode.y + (toNode.y - fromNode.y) * packet.progress;

        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };

        context.save();
        context.translate(currentX, currentY);
        context.rotate(timeRef.current * 2);

        const size = 24;
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
        context.lineWidth = 3;
        context.stroke();
        context.restore();

        context.fillStyle = 'white';
        context.font = 'bold 9px Inter, system-ui, sans-serif';
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentStep, packets, isDarkMode]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>MSTP 多实例生成树</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>Multi-Spanning Tree Protocol</p>
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
              <button onClick={handleReset} className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>
                重置
              </button>
              <button onClick={handleNext} disabled={currentStep >= steps.length - 1} className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50" style={{ backgroundColor: primaryBlue, color: 'white' }}>
                下一步
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>MSTP 多实例生成树协议（Multi-Spanning Tree Protocol）</h3>
            <p className="text-sm leading-relaxed" style={{ color: textColor }}>
              <span style={{ color: primaryBlue, fontWeight: 600 }}>多实例：</span>MSTP 将 VLAN 映射到不同的实例（Instance），每个实例独立计算生成树，实现负载均衡。<br/>
              <span style={{ color: '#8b5cf6', fontWeight: 600 }}>MST 域：</span>具有相同域名、修订级别和 VLAN 映射的交换机属于同一个 MST 域。<br/>
              <span style={{ color: '#10b981', fontWeight: 600 }}>负载均衡：</span>不同实例选择不同的根桥，流量走不同路径，提高网络利用率。
            </p>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>二、MSTP 与 STP/RSTP 对比</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: primaryBlue }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>STP</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>单一生成树实例</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>收敛时间 30-50 秒</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>所有 VLAN 共享路径</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>IEEE 802.1D</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: '#10b981' }}>RSTP</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>快速收敛（1-2 秒）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>单一生成树实例</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>端口角色优化</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>IEEE 802.1w</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: '#8b5cf6' }}>MSTP</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                    <span style={{ color: textColor }}>多实例负载均衡</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                    <span style={{ color: textColor }}>快速收敛（1-2 秒）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                    <span style={{ color: textColor }}>MST 域概念</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                    <span style={{ color: textColor }}>IEEE 802.1s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>三、MSTP 报文首部详解</h2>
            <div className="mb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: textColor }}>
                MSTP 基于 RSTP 协议，使用 BPDU（Bridge Protocol Data Unit）进行通信。MSTP BPDU 在 RSTP BPDU 基础上增加了 MST 配置信息，用于 MST 域内的一致性检查。
              </p>
              
              <div className="overflow-x-auto mb-6">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-16 p-2 rounded-tl-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                      <div className="font-bold" style={{ color: primaryBlue }}>协议标识符</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>0x0000（STP）</div>
                    </div>
                    <div className="col-span-8 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>协议版本</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>3=MSTP</div>
                    </div>
                    <div className="col-span-8 p-2 rounded-tr-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                      <div className="font-bold" style={{ color: '#10b981' }}>BPDU 类型</div>
                      <div className="text-xs" style={{ color: secondaryText }}>8位</div>
                      <div className="text-xs" style={{ color: textColor }}>0x02=RST/MST</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-32 gap-0.5 text-center text-xs font-mono mb-4">
                    <div className="col-span-16 p-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}>
                      <div className="font-bold" style={{ color: '#ef4444' }}>标志</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>TC、TCA、端口角色等</div>
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
                      <div className="text-xs" style={{ color: textColor }}>BPDU 最大生存时间</div>
                    </div>
                    <div className="col-span-8 p-2 rounded-br-lg" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b' }}>
                      <div className="font-bold" style={{ color: '#f59e0b' }}>Hello 时间</div>
                      <div className="text-xs" style={{ color: secondaryText }}>16位</div>
                      <div className="text-xs" style={{ color: textColor }}>BPDU 发送间隔</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>🔧 MSTP 配置信息</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>MST 配置 ID</span></span>
                      <span>域名 + 修订级别</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>VLAN 映射表</span></span>
                      <span>VLAN 到实例的映射</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>配置摘要</span></span>
                      <span>MD5 哈希校验</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ 常见配置命令</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#3b82f6' }}>spanning-tree mode mst</span></span>
                      <span>启用 MSTP</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#10b981' }}>spanning-tree mst config</span></span>
                      <span>进入 MST 配置</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#f59e0b' }}>instance 1 vlan 10</span></span>
                      <span>VLAN 映射</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span><span className="font-bold" style={{ color: '#8b5cf6' }}>name AZURE</span></span>
                      <span>设置域名</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>四、MSTP 实例与端口角色</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: primaryBlue }}>
                <div className="text-2xl font-bold mb-2" style={{ color: primaryBlue }}>4096</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>默认优先级</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>桥优先级（步长 4096）</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#10b981' }}>64</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>最大实例数</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>最多支持 64 个实例</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#8b5cf6' }}>2s</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>收敛时间</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>快速收敛（RSTP 基础）</p>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)', borderColor: '#f97316' }}>
                <div className="text-2xl font-bold mb-2" style={{ color: '#f97316' }}>4096</div>
                <div className="font-bold text-sm" style={{ color: textColor }}>VLAN 范围</div>
                <p className="text-xs mt-1" style={{ color: secondaryText }}>每个实例最多 4096 VLAN</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}>
                <canvas ref={canvasRef} className="w-full h-full" />
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
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>MSTP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>MSTI-1 (VLAN 10)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>MSTI-2 (VLAN 20)</span>
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
                      <span>暂无 MSTP 报文</span>
                    </div>
                  ) : (
                    packetLogs.map((log, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} />
                        <span className="text-sm font-semibold" style={{ color: textColor }}>
                          {log.type} {log.from} → {log.to}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <h4 className="font-bold mb-3">MSTP 实例配置</h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>Instance 1: VLAN 10</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>Instance 2: VLAN 20</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                    <span style={{ color: textColor }}>MST 域名：AZURE</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6b7280' }} />
                    <span style={{ color: textColor }}>修订级别：0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>
            NetViz - 网络工程可视化平台 | MSTP 多实例生成树协议动画演示
          </div>
        </div>
      </footer>
    </div>
  );
}
