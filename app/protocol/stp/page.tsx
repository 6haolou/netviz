"use client";
import React, { useState, useEffect, useRef } from 'react';
import Emoji from '@/components/Emoji';
interface Packet { type: string; from: number; to: number; progress: number; delay: number; startTime: number; active: boolean; completed: boolean; }
interface StepInfo { phase: string; icon: React.ReactNode; title: string; description: string; packets: { from: number; to: number; type: string; delay: number }[]; }

export default function STPPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [packetLogs, setPacketLogs] = useState<{ type: string; from: string; to: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);

  useEffect(() => { if (typeof window !== 'undefined') { const savedMode = localStorage.getItem('darkMode'); if (savedMode !== null) setIsDarkMode(savedMode === 'true'); else { const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; setIsDarkMode(prefersDark); } } }, []);

  const steps: StepInfo[] = [
    { phase: '初始状态', icon: <Emoji label="📍" />, title: 'STP 计算前', description: '所有交换机启动后，交换机之间通过STP协议选举根桥。需要比较Bridge ID（优先级+MAC地址）。', packets: [] },
    { phase: '根桥选举', icon: <Emoji label="👑" />, title: '选举根桥（Root Bridge）', description: '所有交换机发送BPDU，比较Bridge ID。优先级最低（默认32768）的成为根桥。如果优先级相同，则MAC地址最小的胜出。', packets: [{ from: 0, to: 1, type: 'BPDU', delay: 0 }] },
    { phase: '根端口选举', icon: <Emoji label="🔌" />, title: '选举根端口（Root Port）', description: '非根桥交换机选择到根桥路径成本最低的端口作为根端口。每个非根桥只有一个根端口。', packets: [{ from: 1, to: 2, type: 'BPDU', delay: 0 }] },
    { phase: '指定端口选举', icon: <Emoji label="🎯" />, title: '选举指定端口（Designated Port）', description: '每个网段选举一个指定端口，用于转发数据。根桥的所有端口都是指定端口。', packets: [{ from: 2, to: 3, type: 'BPDU', delay: 0 }] },
    { phase: '阻塞端口', icon: <Emoji label="🚫" />, title: '阻塞非指定端口', description: '除了根端口和指定端口外的其他端口被阻塞，进入Blocking状态，打破二层环路。', packets: [] },
    { phase: '收敛完成', icon: <Emoji label="✅" />, title: 'STP 收敛完成', description: '网络收敛完成，形成无环的树形拓扑。根桥为树的根节点，流量沿最优路径转发。', packets: [] },
  ];

  const packetColors: Record<string, { start: string; end: string }> = { 'BPDU': { start: '#3b82f6', end: '#2563eb' } };

  useEffect(() => { const step = steps[currentStep]; if (step.packets.length === 0) { setPackets([]); setPacketLogs([]); return; } const newPackets: Packet[] = step.packets.map((p) => ({ type: p.type, from: p.from, to: p.to, progress: 0, delay: p.delay, startTime: Date.now() + p.delay, active: false, completed: false })); setPackets(newPackets); setPacketLogs(step.packets.map((p) => { const labels = ['SW-A', 'SW-B', 'SW-C']; return { type: p.type, from: labels[p.from], to: labels[p.to] }; })); }, [currentStep]);

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
      const switchPositions = [{ x: width * 0.5, y: height * 0.2 }, { x: width * 0.2, y: height * 0.7 }, { x: width * 0.8, y: height * 0.7 }];
      const switchLabels = ['SW-A', 'SW-B', 'SW-C']; const switchMacs = ['00:01:02:03:04:AA', '00:01:02:03:04:BB', '00:01:02:03:04:CC']; const switchColors = [primaryBlue, '#10b981', '#f59e0b'];
      const isRootA = currentStep >= 1;
      const drawSwitch = (x: number, y: number, label: string, mac: string, color: string, isRoot: boolean, portState: string) => { const pulse = Math.sin(timeRef.current * 3) * 4; const actualColor = isRoot ? primaryBlue : (portState === 'Block' ? '#ef4444' : color); const glowGradient = context.createRadialGradient(x, y, 30, x, y, 80 + pulse); glowGradient.addColorStop(0, actualColor + '30'); glowGradient.addColorStop(1, 'transparent'); context.fillStyle = glowGradient; context.beginPath(); context.arc(x, y, 80 + pulse, 0, Math.PI * 2); context.fill(); const nodeGradient = context.createLinearGradient(x - 45, y - 45, x + 45, y + 45); nodeGradient.addColorStop(0, actualColor); nodeGradient.addColorStop(1, actualColor + 'cc'); context.fillStyle = nodeGradient; context.beginPath(); context.roundRect(x - 45, y - 45, 90, 90, 12); context.fill(); context.fillStyle = 'rgba(255, 255, 255, 0.2)'; context.fillRect(x - 35, y - 25, 70, 5); context.fillRect(x - 35, y - 15, 70, 5); context.fillRect(x - 35, y - 5, 70, 5); if (isRoot) { context.fillStyle = '#fbbf24'; context.font = 'bold 20px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.fillText('👑', x, y - 60); } context.fillStyle = 'white'; context.font = 'bold 16px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.fillText(label, x, y + 105); context.fillStyle = portState === 'Block' ? '#ef4444' : 'rgba(255, 255, 255, 0.7)'; context.font = '10px Inter, system-ui, sans-serif'; context.fillText(portState === 'Block' ? '🔴 BLOCKED' : portState === 'Root' ? '🟢 ROOT' : '🟢 FWD', x, y + 120); context.fillStyle = 'rgba(255, 255, 255, 0.5)'; context.font = '9px Inter, system-ui, sans-serif'; context.fillText(mac, x, y + 135); };
      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb'; context.lineWidth = 3; context.beginPath(); context.moveTo(switchPositions[0].x, switchPositions[0].y + 45); context.lineTo(switchPositions[1].x, switchPositions[1].y - 45); context.moveTo(switchPositions[0].x, switchPositions[0].y + 45); context.lineTo(switchPositions[2].x, switchPositions[2].y - 45); context.moveTo(switchPositions[1].x + 45, switchPositions[1].y); context.lineTo(switchPositions[2].x - 45, switchPositions[2].y); context.stroke();
      const blockedLine = currentStep >= 4; if (blockedLine) { context.strokeStyle = '#ef4444'; context.lineWidth = 3; context.setLineDash([10, 5]); context.beginPath(); context.moveTo(switchPositions[1].x + 45, switchPositions[1].y); context.lineTo(switchPositions[2].x - 45, switchPositions[2].y); context.stroke(); context.setLineDash([]); }
      drawSwitch(switchPositions[0].x, switchPositions[0].y, switchLabels[0], switchMacs[0], switchColors[0], isRootA, isRootA ? 'Root' : 'FWD'); drawSwitch(switchPositions[1].x, switchPositions[1].y, switchLabels[1], switchMacs[1], switchColors[1], false, currentStep >= 2 ? 'Root' : (blockedLine ? 'Block' : 'FWD')); drawSwitch(switchPositions[2].x, switchPositions[2].y, switchLabels[2], switchMacs[2], switchColors[2], false, currentStep >= 3 ? 'FWD' : (blockedLine ? 'Block' : 'FWD'));
      const now = Date.now();
      setPackets((prevPackets) => { let updated = false; const newPackets = prevPackets.map((packet) => { if (packet.completed) return packet; if (now < packet.startTime) return packet; if (!packet.active) { updated = true; return { ...packet, active: true }; } if (packet.progress < 1) { updated = true; return { ...packet, progress: Math.min(1, packet.progress + 0.006) }; } return { ...packet, completed: true }; }); return updated ? newPackets : prevPackets; });
      if (currentStep >= 1 && currentStep <= 3) { const stepData = steps[currentStep]; if (stepData.packets.length > 0) { const packetData = stepData.packets[0]; const fromNode = switchPositions[packetData.from]; const toNode = switchPositions[packetData.to]; const activePacket = packets.find((p) => p.type === packetData.type); const progress = activePacket?.progress || 0; if (progress > 0) { const headX = fromNode.x + (toNode.x - fromNode.x) * progress; const headY = fromNode.y + (toNode.y - fromNode.y) * progress; const tailProgress = Math.max(0, progress - 0.08); const tailX = fromNode.x + (toNode.x - fromNode.x) * tailProgress; const tailY = fromNode.y + (toNode.y - fromNode.y) * tailProgress; const colors = packetColors[packetData.type] || { start: '#64748b', end: '#475569' }; context.strokeStyle = colors.start; context.lineWidth = 4; context.lineCap = 'round'; context.beginPath(); context.moveTo(tailX, tailY); context.lineTo(headX, headY); context.stroke(); const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x); const arrowSize = 12; context.fillStyle = colors.start; context.beginPath(); context.moveTo(headX, headY); context.lineTo(headX - arrowSize * Math.cos(angle - Math.PI / 6), headY - arrowSize * Math.sin(angle - Math.PI / 6)); context.lineTo(headX - arrowSize * Math.cos(angle + Math.PI / 6), headY - arrowSize * Math.sin(angle + Math.PI / 6)); context.closePath(); context.fill(); } } }
      packets.forEach((packet) => { if (!packet.active) return; const fromNode = switchPositions[packet.from]; const toNode = switchPositions[packet.to]; const currentX = fromNode.x + (toNode.x - fromNode.x) * packet.progress; const currentY = fromNode.y + (toNode.y - fromNode.y) * packet.progress; const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' }; context.save(); context.translate(currentX, currentY); context.rotate(timeRef.current * 2); const size = 24; const glowGradient = context.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2); glowGradient.addColorStop(0, colors.start + '60'); glowGradient.addColorStop(1, 'transparent'); context.fillStyle = glowGradient; context.beginPath(); context.arc(0, 0, size * 2, 0, Math.PI * 2); context.fill(); const packetGradient = context.createRadialGradient(0, 0, 0, 0, 0, size); packetGradient.addColorStop(0, colors.start); packetGradient.addColorStop(1, colors.end); context.fillStyle = packetGradient; context.beginPath(); context.arc(0, 0, size, 0, Math.PI * 2); context.fill(); context.strokeStyle = 'rgba(255, 255, 255, 0.8)'; context.lineWidth = 3; context.stroke(); context.restore(); context.fillStyle = 'white'; context.font = 'bold 9px Inter, system-ui, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.shadowColor = 'rgba(0, 0, 0, 0.7)'; context.shadowBlur = 4; context.fillText(packet.type, currentX, currentY); context.shadowBlur = 0; });
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
              <div><h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>STP 生成树协议</h1><p className="text-sm mt-1" style={{ color: secondaryText }}>Spanning Tree Protocol</p></div>
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
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>STP 生成树协议（Spanning Tree Protocol）</h3>
            <p className="text-sm leading-relaxed" style={{ color: textColor }}><span style={{ color: primaryBlue, fontWeight: 600 }}>防止环路：</span>STP通过计算生成一棵树形拓扑，阻塞多余端口，防止二层网络出现环路。<br/><span style={{ color: '#10b981', fontWeight: 600 }}>根桥选举：</span>通过比较Bridge ID（优先级+MAC地址）选举根桥，根桥作为树的根节点。<br/><span style={{ color: '#ef4444', fontWeight: 600 }}>端口状态：</span>根端口（RP）、指定端口（DP）、阻塞端口（Blocking）。</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}><canvas ref={canvasRef} className="w-full h-full" /></div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3"><span className="text-sm font-bold" style={{ color: secondaryText }}>步骤:</span><div className="flex gap-2">{steps.map((_, index) => (<button key={index} onClick={() => handleStepClick(index)} disabled={index > currentStep + 1} className="w-10 h-10 rounded-lg font-bold text-sm transition-all disabled:opacity-30" style={{ backgroundColor: index < currentStep ? 'rgba(34, 197, 94, 0.2)' : index === currentStep ? 'rgba(59, 130, 246, 0.2)' : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', borderColor: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : 'transparent', borderWidth: '2px', color: index < currentStep ? '#22c55e' : index === currentStep ? primaryBlue : secondaryText, transform: index === currentStep ? 'scale(1.1)' : 'scale(1)' }}>{index + 1}</button>))}</div></div>
                <div className="flex justify-center gap-6 flex-wrap"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>BPDU</span></div><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>转发端口</span></div><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>阻塞端口</span></div></div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderColor }}><span className="text-2xl">{steps[currentStep].icon}</span><div><h3 className="font-bold text-lg">{steps[currentStep].title}</h3><p className="text-xs" style={{ color: secondaryText }}>步骤 {currentStep + 1} of {steps.length} | {steps[currentStep].phase}</p></div></div>
                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}><p className="text-sm leading-relaxed" style={{ color: textColor }}>{steps[currentStep].description}</p></div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #10b981, #f59e0b, #ef4444)` }} /></div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3"><span className="text-lg">📦</span><div><h4 className="font-bold">BPDU 报文日志</h4><p className="text-xs" style={{ color: secondaryText }}>网桥协议数据单元</p></div></div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '150px' }}>{packetLogs.length === 0 ? (<div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无BPDU</span></div>) : packetLogs.map((log, index) => (<div key={index} className="flex items-center gap-2 mb-2 last:mb-0"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} /><span className="text-sm font-semibold" style={{ color: textColor }}>{log.type} {log.from} → {log.to}</span></div>))}</div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <h4 className="font-bold mb-3">STP 端口状态</h4>
                <div className="grid grid-cols-1 gap-2 text-xs"><div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6b7280' }} /><span style={{ color: textColor }}>Blocking: 阻塞（不转发）</span></div><div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} /><span style={{ color: textColor }}>Listening: 监听</span></div><div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} /><span style={{ color: textColor }}>Learning: 学习</span></div><div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} /><span style={{ color: textColor }}>Forwarding: 转发</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"><div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | STP 生成树协议动画演示</div></div></footer>
    </div>
  );
}