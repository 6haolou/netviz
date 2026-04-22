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

export default function DNSPage() {
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
      if (savedMode !== null) setIsDarkMode(savedMode === 'true');
      else { const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; setIsDarkMode(prefersDark); }
    }
  }, []);

  const steps: StepInfo[] = [
    { phase: '初始状态', icon: <Emoji label="📍" />, title: 'DNS 查询前', description: '客户端需要访问www.example.com，但只知道域名不知道IP地址，需要通过DNS获取。', packets: [] },
    { phase: '递归查询', icon: <Emoji label="🔍" />, title: '发送给DNS服务器', description: '客户端将查询请求发送给本地DNS服务器，询问www.example.com的IP地址。', packets: [{ from: 0, to: 1, type: 'Query', delay: 0 }] },
    { phase: '迭代查询', icon: <Emoji label="🌐" />, title: 'DNS服务器查询根域名', description: '本地DNS服务器没有答案，向根域名服务器查询。根服务器返回.com域名的顶级域名服务器地址。', packets: [{ from: 1, to: 2, type: 'Iterative', delay: 0 }] },
    { phase: '返回结果', icon: <Emoji label="📥" />, title: '返回IP地址', description: '通过多级DNS服务器的协作，最终得到www.example.com的IP地址1.2.3.4，返回给客户端。', packets: [{ from: 2, to: 1, type: 'Answer', delay: 0 }, { from: 1, to: 0, type: 'Answer', delay: 300 }] },
    { phase: '完成', icon: <Emoji label="✅" />, title: 'DNS 解析完成', description: '客户端获得IP地址1.2.3.4，可以建立HTTP连接了！', packets: [] },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'Query': { start: '#3b82f6', end: '#2563eb' },
    'Iterative': { start: '#f59e0b', end: '#d97706' },
    'Answer': { start: '#10b981', end: '#059669' },
  };

  useEffect(() => {
    const step = steps[currentStep];
    if (step.packets.length === 0) { setPackets([]); setPacketLogs([]); return; }
    const newPackets: Packet[] = step.packets.map((p) => ({ type: p.type, from: p.from, to: p.to, progress: 0, delay: p.delay, startTime: Date.now() + p.delay, active: false, completed: false }));
    setPackets(newPackets);
    setPacketLogs(step.packets.map((p) => {
      const labels = ['Client', 'DNS Server', 'Root DNS'];
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

      const nodePositions = [
        { x: width * 0.2, y: height * 0.5 },
        { x: width * 0.5, y: height * 0.3 },
        { x: width * 0.8, y: height * 0.5 },
      ];
      const nodeLabels = ['客户端', 'DNS服务器', '根域名服务器'];
      const nodeSublabels = ['Client', 'Local DNS', 'Root DNS'];

      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(nodePositions[0].x + 50, nodePositions[0].y + 30);
      context.lineTo(nodePositions[1].x - 30, nodePositions[1].y + 40);
      context.moveTo(nodePositions[1].x + 30, nodePositions[1].y + 40);
      context.lineTo(nodePositions[2].x - 50, nodePositions[2].y + 30);
      context.stroke();
      context.setLineDash([]);

      nodePositions.forEach((pos, i) => {
        const isActive = currentStep >= 1 && i === 0 || currentStep >= 1 && currentStep <= 3 && i === 1 || currentStep >= 2 && currentStep <= 3 && i === 2;
        const pulse = Math.sin(timeRef.current * 3) * 4;
        const color = i === 1 ? '#10b981' : i === 2 ? '#f59e0b' : primaryBlue;

        if (isActive) {
          const glowGradient = context.createRadialGradient(pos.x, pos.y, 30, pos.x, pos.y, 70 + pulse);
          glowGradient.addColorStop(0, color + '40');
          glowGradient.addColorStop(1, 'transparent');
          context.fillStyle = glowGradient;
          context.beginPath();
          context.arc(pos.x, pos.y, 70 + pulse, 0, Math.PI * 2);
          context.fill();
        }

        const nodeGradient = context.createLinearGradient(pos.x - 40, pos.y - 40, pos.x + 40, pos.y + 40);
        nodeGradient.addColorStop(0, color);
        nodeGradient.addColorStop(1, color + 'cc');
        context.fillStyle = nodeGradient;
        context.beginPath();
        context.roundRect(pos.x - 40, pos.y - 40, 80, 80, 10);
        context.fill();

        context.fillStyle = 'white';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(nodeLabels[i], pos.x, pos.y + 70);
        context.fillStyle = secondaryText;
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText(nodeSublabels[i], pos.x, pos.y + 85);
      });

      const now = Date.now();
      setPackets((prevPackets) => {
        let updated = false;
        const newPackets = prevPackets.map((packet) => {
          if (packet.completed) return packet;
          if (now < packet.startTime) return packet;
          if (!packet.active) { updated = true; return { ...packet, active: true }; }
          if (packet.progress < 1) { updated = true; return { ...packet, progress: Math.min(1, packet.progress + 0.008) }; }
          return { ...packet, completed: true };
        });
        return updated ? newPackets : prevPackets;
      });

      packets.forEach((packet) => {
        if (!packet.active) return;
        const fromNode = nodePositions[packet.from];
        const toNode = nodePositions[packet.to];
        const currentX = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        const currentY = fromNode.y + (toNode.y - fromNode.y) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };

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
    return () => { window.removeEventListener('resize', resizeCanvas); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="font-medium">返回主页</span>
              </a>
              <div><h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>DNS 域名解析</h1><p className="text-sm mt-1" style={{ color: secondaryText }}>Domain Name System</p></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)' }}>
                <div className="text-xs" style={{ color: secondaryText }}>当前步骤</div><div className="text-xl font-bold" style={{ color: primaryBlue }}>{currentStep + 1} / {steps.length}</div>
              </div>
              <button onClick={handleReset} className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>🔄 重置</button>
              <button onClick={handleNext} disabled={currentStep >= steps.length - 1} className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50" style={{ backgroundColor: primaryBlue, color: 'white' }}>下一步 →</button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>DNS 域名系统（Domain Name System）</h3>
            <p className="text-sm leading-relaxed" style={{ color: textColor }}>
              <span style={{ color: primaryBlue, fontWeight: 600 }}>分布式数据库：</span>DNS是一个分布式数据库，将域名映射到IP地址。<br/>
              <span style={{ color: '#10b981', fontWeight: 600 }}>递归查询：</span>客户端到本地DNS服务器通常使用递归查询，本地DNS服务器负责返回最终结果。<br/>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>迭代查询：</span>DNS服务器之间使用迭代查询，逐级向上级服务器查询。
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}><canvas ref={canvasRef} className="w-full h-full" /></div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold" style={{ color: secondaryText }}>步骤:</span>
                  <div className="flex gap-2">
                    {steps.map((_, index) => (
                      <button key={index} onClick={() => handleStepClick(index)} disabled={index > currentStep + 1} className="w-10 h-10 rounded-lg font-bold text-sm transition-all disabled:opacity-30"
                        style={{ backgroundColor: index < currentStep ? 'rgba(34, 197, 94, 0.2)' : index === currentStep ? 'rgba(59, 130, 246, 0.2)' : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', borderColor: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : 'transparent', borderWidth: '2px', color: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : secondaryText, transform: index === currentStep ? 'scale(1.1)' : 'scale(1)' }}>
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Query</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Iterative</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Answer</span></div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderColor }}>
                  <span className="text-2xl">{steps[currentStep].icon}</span>
                  <div><h3 className="font-bold text-lg">{steps[currentStep].title}</h3><p className="text-xs" style={{ color: secondaryText }}>步骤 {currentStep + 1} of {steps.length} | {steps[currentStep].phase}</p></div>
                </div>
                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: textColor }}>{steps[currentStep].description}</p>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #10b981)` }} />
                </div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3"><span className="text-lg">📦</span><div><h4 className="font-bold">DNS 报文日志</h4><p className="text-xs" style={{ color: secondaryText }}>域名系统</p></div></div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '150px' }}>
                  {packetLogs.length === 0 ? (<div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无DNS报文</span></div>) : packetLogs.map((log, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2 last:mb-0"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} /><span className="text-sm font-semibold" style={{ color: textColor }}>{log.type} {log.from} → {log.to}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"><div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | DNS 域名解析动画演示</div></div>
      </footer>
    </div>
  );
}