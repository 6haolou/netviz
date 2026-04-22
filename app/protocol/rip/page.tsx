"use client";
import React, { useState, useEffect, useRef } from 'react';
import Emoji from '@/components/Emoji';
interface Packet { type: string; from: number; to: number; progress: number; delay: number; startTime: number; active: boolean; completed: boolean; }
interface StepInfo { phase: string; icon: React.ReactNode; title: string; description: string; packets: { from: number; to: number; type: string; delay: number }[]; }

export default function RIPPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [packetLogs, setPacketLogs] = useState<{ type: string; from: string; to: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);

  useEffect(() => { if (typeof window !== 'undefined') { const savedMode = localStorage.getItem('darkMode'); if (savedMode !== null) setIsDarkMode(savedMode === 'true'); else { const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; setIsDarkMode(prefersDark); } } }, []);

  const steps: StepInfo[] = [
    { phase: '初始状态', icon: <Emoji label="📍" />, title: 'RIP 路由前', description: '三台路由器R1、R2、R3配置了RIP协议，30秒更新计时器即将触发首次路由更新。', packets: [] },
    { phase: '路由请求', icon: <Emoji label="📤" />, title: 'RIP Request 报文', description: 'RIP路由器发送Request报文，请求邻居路由器发送完整的路由表。', packets: [{ from: 0, to: 1, type: 'Request', delay: 0 }] },
    { phase: '路由响应', icon: <Emoji label="📥" />, title: 'RIP Response 报文', description: 'R2收到Request后，发送Response报文，包含其路由表中的路由条目（目的网络、跳数）。', packets: [{ from: 1, to: 0, type: 'Response', delay: 0 }] },
    { phase: '路由学习', icon: <Emoji label="📚" />, title: '路由表更新', description: 'R1收到R2的路由信息后，更新自己的路由表，学习到192.168.3.0/24网络（跳数=2）。', packets: [] },
    { phase: '完成', icon: <Emoji label="✅" />, title: 'RIP 收敛完成', description: 'RIP路由器之间周期性交换路由更新（每30秒一次），最终所有路由器的路由表一致。', packets: [] },
  ];

  const packetColors: Record<string, { start: string; end: string }> = { 'Request': { start: '#3b82f6', end: '#2563eb' }, 'Response': { start: '#10b981', end: '#059669' } };

  useEffect(() => { const step = steps[currentStep]; if (step.packets.length === 0) { setPackets([]); setPacketLogs([]); return; } const newPackets: Packet[] = step.packets.map((p) => ({ type: p.type, from: p.from, to: p.to, progress: 0, delay: p.delay, startTime: Date.now() + p.delay, active: false, completed: false })); setPackets(newPackets); setPacketLogs(step.packets.map((p) => { const labels = ['R1', 'R2', 'R3']; return { type: p.type, from: labels[p.from], to: labels[p.to] }; })); }, [currentStep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context = ctx; const canvasEl = canvas;
    const resizeCanvas = () => { const container = canvas.parentElement; if (!container) return; canvasEl.width = container.clientWidth * window.devicePixelRatio; canvasEl.height = container.clientHeight * window.devicePixelRatio; context.scale(window.devicePixelRatio, window.devicePixelRatio); };
    resizeCanvas(); window.addEventListener('resize', resizeCanvas);
    let lastTime = 0;
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTime; lastTime = timestamp; timeRef.current += deltaTime * 0.001;
      const width = canvasEl.width / (window.devicePixelRatio || 1); const height = canvasEl.height / (window.devicePixelRatio || 1);
      const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff'; const secondaryText = isDarkMode ? '#9ca3af' : '#6b7280'; const primaryBlue = '#3b82f6';
      context.fillStyle = bgColor; context.fillRect(0, 0, width, height);
      if (!isDarkMode) { for (let i = 0; i < 30; i++) { const x = (Math.sin(timeRef.current * 0.2 + i * 0.5) * 0.5 + 0.5) * width; const y = (Math.cos(timeRef.current * 0.15 + i * 0.7) * 0.5 + 0.5) * height; const alpha = Math.sin(timeRef.current * 0.5 + i) * 0.1 + 0.15; context.beginPath(); context.arc(x, y, 2, 0, Math.PI * 2); context.fillStyle = `rgba(59, 130, 246, ${alpha})`; context.fill(); } }
      const nodePositions = [{ x: width * 0.2, y: height * 0.5 }, { x: width * 0.5, y: height * 0.5 }, { x: width * 0.8, y: height * 0.5 }];
      const nodeLabels = ['R1', 'R2', 'R3'];
      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb'; context.lineWidth = 3; context.beginPath(); context.moveTo(nodePositions[0].x + 50, nodePositions[0].y); context.lineTo(nodePositions[1].x - 50, nodePositions[1].y); context.moveTo(nodePositions[1].x + 50, nodePositions[1].y); context.lineTo(nodePositions[2].x - 50, nodePositions[2].y); context.stroke();
      nodePositions.forEach((pos, i) => {
        const isActive = currentStep >= 1;
        const pulse = Math.sin(timeRef.current * 3) * 4; const color = primaryBlue;
        if (isActive) { const glowGradient = context.createRadialGradient(pos.x, pos.y, 40, pos.x, pos.y, 80 + pulse); glowGradient.addColorStop(0, color + '40'); glowGradient.addColorStop(1, 'transparent'); context.fillStyle = glowGradient; context.beginPath(); context.arc(pos.x, pos.y, 80 + pulse, 0, Math.PI * 2); context.fill(); }
        const nodeGradient = context.createLinearGradient(pos.x - 40, pos.y - 40, pos.x + 40, pos.y + 40); nodeGradient.addColorStop(0, color); nodeGradient.addColorStop(1, color + 'cc'); context.fillStyle = nodeGradient; context.beginPath(); context.roundRect(pos.x - 40, pos.y - 40, 80, 80, 10); context.fill();
        context.fillStyle = 'rgba(255, 255, 255, 0.2)'; context.fillRect(pos.x - 30, pos.y - 25, 60, 5); context.fillRect(pos.x - 30, pos.y - 15, 60, 5); context.fillRect(pos.x - 30, pos.y - 5, 60, 5);
        context.fillStyle = 'white'; context.font = 'bold 18px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.fillText(nodeLabels[i], pos.x, pos.y + 70);
      });
      if (currentStep === 3) { context.fillStyle = '#10b981'; context.font = 'bold 16px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.fillText('R1学到: 192.168.3.0/24 (跳数=2)', width * 0.2, height * 0.85); }
      if (currentStep === 4) { context.fillStyle = '#10b981'; context.font = 'bold 20px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.fillText('✓ RIP 路由收敛完成', width / 2, height * 0.15); }
      const now = Date.now();
      setPackets((prevPackets) => { let updated = false; const newPackets = prevPackets.map((packet) => { if (packet.completed) return packet; if (now < packet.startTime) return packet; if (!packet.active) { updated = true; return { ...packet, active: true }; } if (packet.progress < 1) { updated = true; return { ...packet, progress: Math.min(1, packet.progress + 0.008) }; } return { ...packet, completed: true }; }); return updated ? newPackets : prevPackets; });
      packets.forEach((packet) => { if (!packet.active) return; const fromNode = nodePositions[packet.from]; const toNode = nodePositions[packet.to]; const currentX = fromNode.x + (toNode.x - fromNode.x) * packet.progress; const currentY = fromNode.y + (toNode.y - fromNode.y) * packet.progress; const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' }; context.save(); context.translate(currentX, currentY); context.rotate(timeRef.current * 2); const size = 24; const glowGradient = context.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2); glowGradient.addColorStop(0, colors.start + '60'); glowGradient.addColorStop(1, 'transparent'); context.fillStyle = glowGradient; context.beginPath(); context.arc(0, 0, size * 2, 0, Math.PI * 2); context.fill(); const packetGradient = context.createRadialGradient(0, 0, 0, 0, 0, size); packetGradient.addColorStop(0, colors.start); packetGradient.addColorStop(1, colors.end); context.fillStyle = packetGradient; context.beginPath(); context.arc(0, 0, size, 0, Math.PI * 2); context.fill(); context.strokeStyle = 'rgba(255, 255, 255, 0.8)'; context.lineWidth = 3; context.stroke(); context.restore(); context.fillStyle = 'white'; context.font = 'bold 9px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.shadowColor = 'rgba(0, 0, 0, 0.7)'; context.shadowBlur = 4; context.fillText(packet.type, currentX, currentY); context.shadowBlur = 0; });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { window.removeEventListener('resize', resizeCanvas); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [currentStep, packets, isDarkMode]);

  const handleNext = () => { if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1); };
  const handleReset = () => { setCurrentStep(0); setPackets([]); setPacketLogs([]); };
  const handleStepClick = (index: number) => { if (index <= currentStep + 1) setCurrentStep(index); };
  const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff'; const cardBg = isDarkMode ? '#1f2937' : '#ffffff'; const textColor = isDarkMode ? '#ffffff' : '#171717'; const secondaryText = isDarkMode ? '#9ca3af' : '#6b7280'; const borderColor = isDarkMode ? '#374151' : '#e5e7eb'; const primaryBlue = '#3b82f6';

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: bgColor, color: textColor }}>
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg><span className="font-medium">返回主页</span></a>
              <div><h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>RIP 路由协议</h1><p className="text-sm mt-1" style={{ color: secondaryText }}>Routing Information Protocol</p></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)' }}><div className="text-xs" style={{ color: secondaryText }}>当前步骤</div><div className="text-xl font-bold" style={{ color: primaryBlue }}>{currentStep + 1} / {steps.length}</div></div>
              <button onClick={handleReset} className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>🔄 重置</button>
              <button onClick={handleNext} disabled={currentStep >= steps.length - 1} className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50" style={{ backgroundColor: primaryBlue, color: 'white' }}>下一步 →</button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>RIP 路由信息协议（Routing Information Protocol）</h3>
            <p className="text-sm leading-relaxed" style={{ color: textColor }}><span style={{ color: primaryBlue, fontWeight: 600 }}>距离向量协议：</span>RIP是最简单的距离向量路由协议，使用跳数（Hop Count）作为路由度量。<br/><span style={{ color: '#10b981', fontWeight: 600 }}>周期性更新：</span>RIP每30秒发送完整的路由表更新，采用UDP协议，端口号520。<br/><span style={{ color: '#f59e0b', fontWeight: 600 }}>跳数限制：</span>RIP最大跳数为15，16跳表示不可达，因此适用于小型网络。</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}><canvas ref={canvasRef} className="w-full h-full" /></div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3"><span className="text-sm font-bold" style={{ color: secondaryText }}>步骤:</span><div className="flex gap-2">{steps.map((_, index) => (<button key={index} onClick={() => handleStepClick(index)} disabled={index > currentStep + 1} className="w-10 h-10 rounded-lg font-bold text-sm transition-all disabled:opacity-30" style={{ backgroundColor: index < currentStep ? 'rgba(34, 197, 94, 0.2)' : index === currentStep ? 'rgba(59, 130, 246, 0.2)' : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', borderColor: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : 'transparent', borderWidth: '2px', color: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : secondaryText, transform: index === currentStep ? 'scale(1.1)' : 'scale(1)' }}>{index + 1}</button>))}</div></div>
                <div className="flex justify-center gap-6 flex-wrap"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Request</span></div><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Response</span></div></div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderColor }}><span className="text-2xl">{steps[currentStep].icon}</span><div><h3 className="font-bold text-lg">{steps[currentStep].title}</h3><p className="text-xs" style={{ color: secondaryText }}>步骤 {currentStep + 1} of {steps.length} | {steps[currentStep].phase}</p></div></div>
                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}><p className="text-sm leading-relaxed" style={{ color: textColor }}>{steps[currentStep].description}</p></div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #10b981)` }} /></div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3"><span className="text-lg">📦</span><div><h4 className="font-bold">RIP 报文日志</h4><p className="text-xs" style={{ color: secondaryText }}>路由信息协议</p></div></div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '150px' }}>{packetLogs.length === 0 ? (<div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无RIP报文</span></div>) : packetLogs.map((log, index) => (<div key={index} className="flex items-center gap-2 mb-2 last:mb-0"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} /><span className="text-sm font-semibold" style={{ color: textColor }}>{log.type} {log.from} → {log.to}</span></div>))}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"><div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | RIP 路由协议动画演示</div></div></footer>
    </div>
  );
}