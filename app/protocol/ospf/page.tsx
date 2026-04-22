"use client";
import { useState, useEffect, useRef } from 'react';
interface Packet { type: string; from: number; to: number; progress: number; delay: number; startTime: number; active: boolean; completed: boolean; }
interface StepInfo { phase: string; icon: string; title: string; description: string; packets: { from: number; to: number; type: string; delay: number }[]; }

export default function OSPFPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [packetLogs, setPacketLogs] = useState<{ type: string; from: string; to: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);

  useEffect(() => { if (typeof window !== 'undefined') { const savedMode = localStorage.getItem('darkMode'); if (savedMode !== null) setIsDarkMode(savedMode === 'true'); else { const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; setIsDarkMode(prefersDark); } } }, []);

  const steps: StepInfo[] = [
    { phase: '初始状态', icon: '📍', title: 'OSPF 邻居前', description: '两台OSPF路由器配置相同的区域(Area 0)，准备建立邻居关系。Router ID分别为1.1.1.1和2.2.2.2。', packets: [] },
    { phase: '邻居发现', icon: '🔍', title: '发送 Hello 报文', description: '路由器R1和R2互相发送Hello报文，发现彼此并协商邻居关系。', packets: [{ from: 0, to: 1, type: 'Hello', delay: 0 }, { from: 1, to: 0, type: 'Hello', delay: 300 }] },
    { phase: '交换信息', icon: '🔄', title: 'DD 报文交互', description: '邻居关系建立后，互相交换DD（Database Description）报文，包含各自的链路状态摘要。', packets: [{ from: 0, to: 1, type: 'DD', delay: 0 }, { from: 1, to: 0, type: 'DD', delay: 300 }] },
    { phase: '请求更新', icon: '📤', title: 'LSR 请求', description: '路由器发现自己的链路状态数据库与邻居不一致，发送LSR（Link State Request）请求缺失的LSA。', packets: [{ from: 0, to: 1, type: 'LSR', delay: 0 }] },
    { phase: '泛洪更新', icon: '📥', title: 'LSU 泛洪', description: '邻居路由器发送LSU（Link State Update）报文，包含完整的LSA信息，同步链路状态数据库。', packets: [{ from: 1, to: 0, type: 'LSU', delay: 0 }] },
    { phase: '完成', icon: '✅', title: 'OSPF 邻居完成', description: '双方链路状态数据库同步，OSPF邻居关系建立完成，进入Full状态。', packets: [] },
  ];

  const packetColors: Record<string, { start: string; end: string }> = { 'Hello': { start: '#3b82f6', end: '#2563eb' }, 'DD': { start: '#8b5cf6', end: '#7c3aed' }, 'LSR': { start: '#f59e0b', end: '#d97706' }, 'LSU': { start: '#10b981', end: '#059669' } };

  useEffect(() => { const step = steps[currentStep]; if (step.packets.length === 0) { setPackets([]); setPacketLogs([]); return; } const newPackets: Packet[] = step.packets.map((p) => ({ type: p.type, from: p.from, to: p.to, progress: 0, delay: p.delay, startTime: Date.now() + p.delay, active: false, completed: false })); setPackets(newPackets); setPacketLogs(step.packets.map((p) => { const labels = ['R1 (1.1.1.1)', 'R2 (2.2.2.2)']; return { type: p.type, from: labels[p.from], to: labels[p.to] }; })); }, [currentStep]);

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
      const r1X = width * 0.25; const r2X = width * 0.75; const centerY = height * 0.5;
      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb'; context.lineWidth = 3; context.setLineDash([5, 5]); context.beginPath(); context.moveTo(r1X + 60, centerY); context.lineTo(r2X - 60, centerY); context.stroke(); context.setLineDash([]);
      const drawNode = (x: number, y: number, label: string, routerId: string, isActive: boolean) => { const pulse = Math.sin(timeRef.current * 3) * 4; const color = primaryBlue; if (isActive) { const glowGradient = context.createRadialGradient(x, y, 40, x, y, 80 + pulse); glowGradient.addColorStop(0, color + '40'); glowGradient.addColorStop(1, 'transparent'); context.fillStyle = glowGradient; context.beginPath(); context.arc(x, y, 80 + pulse, 0, Math.PI * 2); context.fill(); } const nodeGradient = context.createLinearGradient(x - 50, y - 50, x + 50, y + 50); nodeGradient.addColorStop(0, color); nodeGradient.addColorStop(1, color + 'cc'); context.fillStyle = nodeGradient; context.beginPath(); context.roundRect(x - 50, y - 50, 100, 100, 12); context.fill(); context.fillStyle = 'rgba(255, 255, 255, 0.2)'; context.fillRect(x - 40, y - 30, 80, 5); context.fillRect(x - 40, y - 20, 80, 5); context.fillRect(x - 40, y - 10, 80, 5); context.fillStyle = 'white'; context.font = 'bold 14px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.fillText(label, x, y + 80); context.fillStyle = secondaryText; context.font = '11px Inter, system-ui, sans-serif'; context.fillText(routerId, x, y + 100); };
      drawNode(r1X, centerY, '路由器R1', 'Router ID: 1.1.1.1', currentStep >= 1); drawNode(r2X, centerY, '路由器R2', 'Router ID: 2.2.2.2', currentStep >= 1);
      if (currentStep === 5) { context.fillStyle = '#10b981'; context.font = 'bold 20px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.fillText('✓ OSPF 邻居建立完成 (Full)', width / 2, centerY - 80); }
      const now = Date.now();
      setPackets((prevPackets) => { let updated = false; const newPackets = prevPackets.map((packet) => { if (packet.completed) return packet; if (now < packet.startTime) return packet; if (!packet.active) { updated = true; return { ...packet, active: true }; } if (packet.progress < 1) { updated = true; return { ...packet, progress: Math.min(1, packet.progress + 0.008) }; } return { ...packet, completed: true }; }); return updated ? newPackets : prevPackets; });
      packets.forEach((packet) => {
        if (!packet.active) return;
        const fromX = packet.from === 0 ? r1X : r2X; const toX = packet.from === 0 ? r2X : r1X; const currentX = fromX + (toX - fromX) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };
        context.save(); context.translate(currentX, centerY); context.rotate(timeRef.current * 2); const size = 26; const glowGradient = context.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2); glowGradient.addColorStop(0, colors.start + '60'); glowGradient.addColorStop(1, 'transparent'); context.fillStyle = glowGradient; context.beginPath(); context.arc(0, 0, size * 2, 0, Math.PI * 2); context.fill(); const packetGradient = context.createRadialGradient(0, 0, 0, 0, 0, size); packetGradient.addColorStop(0, colors.start); packetGradient.addColorStop(1, colors.end); context.fillStyle = packetGradient; context.beginPath(); context.arc(0, 0, size, 0, Math.PI * 2); context.fill(); context.strokeStyle = 'rgba(255, 255, 255, 0.8)'; context.lineWidth = 3; context.stroke(); context.restore();
        context.fillStyle = 'white'; context.font = 'bold 9px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.shadowColor = 'rgba(0, 0, 0, 0.7)'; context.shadowBlur = 4; context.fillText(packet.type, currentX, centerY); context.shadowBlur = 0;
      });
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
              <div><h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>OSPF 路由协议</h1><p className="text-sm mt-1" style={{ color: secondaryText }}>Open Shortest Path First</p></div>
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
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>OSPF 开放最短路径优先（Open Shortest Path First）</h3>
            <p className="text-sm leading-relaxed" style={{ color: textColor }}><span style={{ color: primaryBlue, fontWeight: 600 }}>链路状态协议：</span>OSPF是链路状态路由协议，通过LSA泛洪构建完整的网络拓扑图。<br/><span style={{ color: '#10b981', fontWeight: 600 }}>快速收敛：</span>网络变化时发送触发更新，收敛速度快。<br/><span style={{ color: '#8b5cf6', fontWeight: 600 }}>区域划分：</span>支持多区域设计，Area 0为骨干区域，其他区域必须与骨干区域相连。</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}><canvas ref={canvasRef} className="w-full h-full" /></div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3"><span className="text-sm font-bold" style={{ color: secondaryText }}>步骤:</span><div className="flex gap-2">{steps.map((_, index) => (<button key={index} onClick={() => handleStepClick(index)} disabled={index > currentStep + 1} className="w-10 h-10 rounded-lg font-bold text-sm transition-all disabled:opacity-30" style={{ backgroundColor: index < currentStep ? 'rgba(34, 197, 94, 0.2)' : index === currentStep ? 'rgba(59, 130, 246, 0.2)' : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', borderColor: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : 'transparent', borderWidth: '2px', color: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : secondaryText, transform: index === currentStep ? 'scale(1.1)' : 'scale(1)' }}>{index + 1}</button>))}</div></div>
                <div className="flex justify-center gap-6 flex-wrap"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>Hello</span></div><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>DD</span></div><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>LSR</span></div><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>LSU</span></div></div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderColor }}><span className="text-2xl">{steps[currentStep].icon}</span><div><h3 className="font-bold text-lg">{steps[currentStep].title}</h3><p className="text-xs" style={{ color: secondaryText }}>步骤 {currentStep + 1} of {steps.length} | {steps[currentStep].phase}</p></div></div>
                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}><p className="text-sm leading-relaxed" style={{ color: textColor }}>{steps[currentStep].description}</p></div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #8b5cf6, #10b981)` }} /></div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3"><span className="text-lg">📦</span><div><h4 className="font-bold">OSPF 报文日志</h4><p className="text-xs" style={{ color: secondaryText }}>开放最短路径优先</p></div></div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '150px' }}>{packetLogs.length === 0 ? (<div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无OSPF报文</span></div>) : packetLogs.map((log, index) => (<div key={index} className="flex items-center gap-2 mb-2 last:mb-0"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} /><span className="text-sm font-semibold" style={{ color: textColor }}>{log.type} {log.from} → {log.to}</span></div>))}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"><div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | OSPF 路由协议动画演示</div></div></footer>
    </div>
  );
}