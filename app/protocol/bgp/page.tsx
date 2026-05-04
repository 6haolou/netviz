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

export default function BGPPage() {
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
      title: 'BGP 会话建立前',
      description: 'AS 65001 和 AS 65002 是两个不同的自治系统。BGP 路由器之间需要建立 TCP 连接（端口 179），然后通过 Open 报文协商参数建立 BGP 对等关系。',
      packets: [],
    },
    {
      phase: 'TCP 连接',
      icon: <Emoji label="🔗" />,
      title: '建立 TCP 连接（端口 179）',
      description: 'BGP 使用 TCP 作为传输层协议（端口 179），确保路由信息可靠传输。R1 主动发起 TCP 连接，R2 监听。三次握手完成后建立稳定的 TCP 连接。',
      packets: [{ from: 0, to: 1, type: 'TCP SYN', delay: 0 }],
    },
    {
      phase: 'Open 报文',
      icon: <Emoji label="📩" />,
      title: '交换 Open 报文',
      description: '双方交换 BGP Open 报文，包含版本号（4）、AS 号、Hold Time（通常 90 秒）、BGP Identifier（Router ID）等参数。协商成功则进入 OpenConfirm 状态。',
      packets: [{ from: 1, to: 0, type: 'BGP Open', delay: 0 }],
    },
    {
      phase: '路由更新',
      icon: <Emoji label="🔄" />,
      title: '发送 Update 报文',
      description: 'BGP 路由器发送 Update 报文通告可达路由。Update 报文包含 NLRI（网络层可达信息）和路径属性：AS_PATH（防环）、NEXT_HOP（下一跳）、LOCAL_PREF（本地优先级）等。',
      packets: [{ from: 0, to: 1, type: 'Update', delay: 0 }],
    },
    {
      phase: '收敛完成',
      icon: <Emoji label="✅" />,
      title: 'BGP 收敛完成',
      description: 'BGP 会话建立完成，双方进入 Established 状态。路由信息交换完毕，BGP 路由表收敛。双方定期发送 Keepalive（每 30 秒）维持连接。',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'TCP SYN': { start: '#3b82f6', end: '#2563eb' },
    'BGP Open': { start: '#8b5cf6', end: '#7c3aed' },
    'Update': { start: '#10b981', end: '#059669' },
  };

  const bgpStates: Record<string, string> = {
    'Idle': '#64748b',
    'Connect': '#3b82f6',
    'Active': '#8b5cf6',
    'OpenSent': '#a855f7',
    'OpenConfirm': '#f59e0b',
    'Established': '#22c55e',
  };

  const bgpMsgTypes: Record<string, { code: number; desc: string }> = {
    'Open': { code: 1, desc: '建立 BGP 对等体连接' },
    'Update': { code: 2, desc: '通告或撤销路由信息' },
    'Notification': { code: 3, desc: '报告错误并关闭连接' },
    'Keepalive': { code: 4, desc: '维持对等体连接' },
    'RouteRefresh': { code: 5, desc: '请求重新通告路由' },
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

      const drawBgpRouter = (x: number, y: number, label: string, asLabel: string, color: string, isActive: boolean) => {
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
        context.fillStyle = 'white';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 75);
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText(asLabel, x, y + 90);
      };

      const isR1Active = currentStep >= 1 && currentStep <= 3;
      const isR2Active = currentStep >= 1 && currentStep <= 3;

      context.strokeStyle = isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)';
      context.lineWidth = 2;
      context.setLineDash([10, 5]);
      context.strokeRect(as1X - 80, centerY - 120, 160, 240);
      context.strokeRect(as2X - 80, centerY - 120, 160, 240);
      context.setLineDash([]);
      context.fillStyle = '#8b5cf6';
      context.font = 'bold 12px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('AS 65001', as1X, centerY - 135);
      context.fillText('AS 65002', as2X, centerY - 135);

      context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      context.lineWidth = 2;
      context.setLineDash([5, 8]);
      context.beginPath();
      context.moveTo(as1X + 80, centerY);
      context.lineTo(as2X - 80, centerY);
      context.stroke();
      context.setLineDash([]);

      drawBgpRouter(as1X, centerY, 'R1（BGP 对等体）', 'AS 65001', '#8b5cf6', isR1Active);
      drawBgpRouter(as2X, centerY, 'R2（BGP 对等体）', 'AS 65002', '#8b5cf6', isR2Active);

      if (currentStep === 4) {
        context.fillStyle = '#22c55e';
        context.font = 'bold 22px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('✓ BGP 会话已建立（Established）', (as1X + as2X) / 2, centerY - 170);
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
        const positions = [{ x: as1X, y: centerY }, { x: as2X, y: centerY }];
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
        const shortType = packet.type.replace('BGP ', '').replace('TCP ', '');
        context.fillText(shortType, currentX, currentY);
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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>BGP 边界网关协议</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>自治系统间路由 | 5 个核心步骤</p>
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
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>BGP 完整工作流程详解</h2>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>一、BGP 简介</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>BGP（Border Gateway Protocol，边界网关协议）</span>是互联网的核心路由协议，用于在不同自治系统（AS）之间交换路由信息。BGP 使用 TCP 端口 179 建立可靠连接，采用路径矢量算法，通过 AS_PATH 属性防止路由环路。
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: primaryBlue }}>路由协议</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>BGP（外部网关协议）</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8b5cf6' }}>传输层</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>TCP 端口 179</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#10b981' }}>度量值</div>
                  <div className="text-lg font-bold" style={{ color: textColor }}>路径属性（AS_PATH 等）</div>
                </div>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }} onClick={() => setIsMsgExpanded(!isMsgExpanded)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                        <span className="text-white font-bold text-sm">BGP</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#f59e0b' }}>报文类型</div>
                        <div className="text-lg font-bold" style={{ color: textColor }}>BGP 报文结构</div>
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
                              <span className="text-lg">📩</span>
                              <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>BGP Open 报文</div>
                            </div>
                            <div className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div>Marker: 16 字节（认证用）</div>
                                <div>Length: 2 字节（报文总长度）</div>
                                <div>Type: 1（Open 报文）</div>
                                <div>Version: 4（BGP-4）</div>
                                <div>My AS: 65001（本地 AS 号）</div>
                                <div>Hold Time: 90 秒</div>
                                <div>BGP Identifier: Router ID</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">🔄</span>
                              <div className="font-bold text-sm" style={{ color: '#10b981' }}>BGP Update 报文</div>
                            </div>
                            <div className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                              <div className="p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                                <div>Withdrawn Routes: 撤回的路由</div>
                                <div>Path Attributes: 路径属性</div>
                                <div>  • ORIGIN: 路由起源</div>
                                <div>  • AS_PATH: AS 路径防环</div>
                                <div>  • NEXT_HOP: 下一跳地址</div>
                                <div>  • LOCAL_PREF: 本地优先级</div>
                                <div>  • MED: 多出口区分</div>
                                <div>NLRI: 可达路由前缀</div>
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
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>二、BGP 核心概念：六种状态、五种报文类型、路径属性</h3>
              
              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #64748b', paddingLeft: '10px' }}>BGP 六种状态</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.05)', borderColor: '#64748b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#64748b' }} />
                      <span className="font-bold" style={{ color: textColor }}>1. Idle</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>空闲状态。BGP 初始状态，拒绝所有连接请求。等待 Start 事件触发后尝试建立 TCP 连接。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>2. Connect</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>连接状态。BGP 等待 TCP 连接完成。如果连接成功则发送 Open 报文进入 OpenSent 状态。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>3. Active</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>活跃状态。TCP 连接失败后重新尝试，BGP 主动发起连接。反复尝试直到连接建立。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)', borderColor: '#a855f7' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
                      <span className="font-bold" style={{ color: textColor }}>4. OpenSent</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>Open 已发送。等待对等体的 Open 报文。收到后检查参数（版本、AS 号等）匹配则进入 OpenConfirm。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>5. OpenConfirm</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>Open 确认。等待 Keepalive 报文。收到 Keepalive 后进入 Established 状态，否则超时断开。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)', borderColor: '#22c55e' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                      <span className="font-bold" style={{ color: textColor }}>6. Established</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>已建立。BGP 会话建立成功，可以交换 Update、Keepalive 和 Notification 报文。</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #8b5cf6', paddingLeft: '10px' }}>五种报文类型</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="font-bold" style={{ color: textColor }}>Open（1）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>建立 BGP 对等连接。包含版本号、AS 号、Hold Time、BGP Identifier 等参数。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                      <span className="font-bold" style={{ color: textColor }}>Update（2）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>通告或撤销路由。包含 NLRI 和路径属性，是 BGP 核心报文。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="font-bold" style={{ color: textColor }}>Notification（3）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>报告错误并关闭连接。检测到错误时发送，包含错误码和错误子码。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderColor: '#8b5cf6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="font-bold" style={{ color: textColor }}>Keepalive（4）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>维持对等连接。周期性发送（通常每 30 秒），检测对等体存活。</p>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="font-bold" style={{ color: textColor }}>RouteRefresh（5）</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: secondaryText }}>路由刷新请求。请求对等体重新通告路由，用于策略变更时更新路由表。</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-bold mb-3 pl-2" style={{ color: primaryBlue, borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>BGP 路径属性</div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: '#3b82f6' }}>
                    <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>AS_PATH</div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: secondaryText }}>AS 路径列表，用于路由防环和选路。路径越短越优先。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                    <div className="font-bold text-sm" style={{ color: '#10b981' }}>NEXT_HOP</div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: secondaryText }}>下一跳 IP 地址。到达目标网络的下一跳路由器。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderColor: '#f59e0b' }}>
                    <div className="font-bold text-sm" style={{ color: '#f59e0b' }}>LOCAL_PREF</div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: secondaryText }}>本地优先级（100）。值越高路径越优先，用于 AS 内选路。</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.05)', borderColor: '#ec4899' }}>
                    <div className="font-bold text-sm" style={{ color: '#ec4899' }}>MED</div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: secondaryText }}>多出口区分（值越小越优先），用于 AS 间选路。</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: textColor }}>三、BGP 会话建立过程详解</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: textColor }}>
                <span style={{ color: primaryBlue, fontWeight: 600 }}>步骤 1（TCP 连接）：</span>R1 → R2，建立 TCP 连接（端口 179），确保 BGP 报文可靠传输。<br/>
                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>步骤 2（Open 协商）：</span>R2 → R1，发送 Open 报文，交换版本号、AS 号、Hold Time 等参数。<br/>
                <span style={{ color: '#10b981', fontWeight: 600 }}>步骤 3（Update 交换）：</span>双方发送 Update 报文通告路由，包含 AS_PATH、NEXT_HOP 等路径属性。<br/>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>步骤 4（Established）：</span>会话建立完成，定期发送 Keepalive 维持连接。
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: primaryBlue }}>
                  <div className="font-bold text-sm mb-2" style={{ color: primaryBlue }}>🔗 BGP 状态转移</div>
                  <div className="text-xs leading-relaxed" style={{ color: secondaryText }}>
                    <div className="flex items-center gap-2 p-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#64748b' }} />Idle</div>
                    <div className="text-center" style={{ color: '#3b82f6' }}>↓ Start 事件</div>
                    <div className="flex items-center gap-2 p-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />Connect</div>
                    <div className="text-center" style={{ color: '#3b82f6' }}>↓ TCP 建立</div>
                    <div className="flex items-center gap-2 p-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a855f7' }} />OpenSent</div>
                    <div className="text-center" style={{ color: '#3b82f6' }}>↓ 收到 Open</div>
                    <div className="flex items-center gap-2 p-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />OpenConfirm</div>
                    <div className="text-center" style={{ color: '#3b82f6' }}>↓ 收到 Keepalive</div>
                    <div className="flex items-center gap-2 p-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />Established</div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)', borderColor: '#10b981' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#10b981' }}>⚡ BGP 选路原则</div>
                  <div className="space-y-1.5 text-xs" style={{ color: secondaryText }}>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span className="font-bold" style={{ color: '#f59e0b' }}>①</span>
                      <span>最高 LOCAL_PREF（本地优先级）</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span className="font-bold" style={{ color: '#f59e0b' }}>②</span>
                      <span>最短 AS_PATH 长度</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span className="font-bold" style={{ color: '#f59e0b' }}>③</span>
                      <span>最低 MED（多出口区分）</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span className="font-bold" style={{ color: '#f59e0b' }}>④</span>
                      <span>EBGP 优于 IBGP</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <span className="font-bold" style={{ color: '#f59e0b' }}>⑤</span>
                      <span>最低 IGP 度量到 NEXT_HOP</span>
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
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>TCP SYN</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>BGP Open</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Update</span></div>
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
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #8b5cf6, #10b981)` }} />
                </div>
              </div>
              <div className="rounded-xl border p-4 flex-1" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔗</span>
                  <div><div className="font-bold">BGP 状态</div><div className="text-xs" style={{ color: secondaryText }}>对等体实时状态</div></div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>R1</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep === 4 ? 'rgba(34, 197, 94, 0.2)' : currentStep >= 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep === 4 ? '#22c55e' : currentStep >= 1 ? '#3b82f6' : '#64748b' }}>
                      {currentStep === 0 ? 'Idle' : currentStep === 4 ? 'Established' : currentStep === 1 ? 'Connect' : 'OpenSent'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>R2</span></div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: currentStep === 4 ? 'rgba(34, 197, 94, 0.2)' : currentStep >= 2 ? 'rgba(139, 92, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: currentStep === 4 ? '#22c55e' : currentStep >= 2 ? '#8b5cf6' : '#64748b' }}>
                      {currentStep === 0 ? 'Idle' : currentStep === 4 ? 'Established' : currentStep <= 1 ? 'Connect' : 'OpenConfirm'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📦</span>
                  <div><div className="font-bold">报文日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤的 BGP 报文</div></div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '100px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 BGP 报文</span></div>
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
                <div><div className="font-bold">报文交互日志</div><div className="text-xs" style={{ color: secondaryText }}>当前步骤发送的 BGP 报文</div></div>
              </div>
              <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '120px' }}>
                {packetLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 BGP 报文</span></div>
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
                <div><div className="font-bold">BGP 报文类型参考</div><div className="text-xs" style={{ color: secondaryText }}>BGP 五种报文类型</div></div>
              </div>
              <div className="flex items-center justify-start gap-2 text-xs overflow-x-auto pb-2">
                {Object.entries(bgpMsgTypes).map(([name, info]) => (
                  <div key={name} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: info.code === 1 ? '#3b82f6' : info.code === 2 ? '#10b981' : info.code === 3 ? '#ef4444' : info.code === 4 ? '#8b5cf6' : '#f59e0b', color: 'white' }}>{info.code}</div>
                    <span style={{ color: secondaryText, textAlign: 'center', maxWidth: '60px' }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | BGP 边界网关协议动画演示</div>
        </div>
      </footer>
    </div>
  );
}
