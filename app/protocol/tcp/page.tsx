"use client";

import { useState, useEffect, useRef } from 'react';

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
  icon: string;
  title: string;
  description: string;
  packets: { from: number; to: number; type: string; delay: number }[];
}

export default function TCPPage() {
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
      phase: 'Initial State',
      icon: '[ ]',
      title: 'TCP Connection Before',
      description: 'Client initiates connection request, server is in LISTEN state, waiting for client connection.',
      packets: [],
    },
    {
      phase: 'First Handshake',
      icon: 'SYN',
      title: 'SYN Request',
      description: 'Client sends SYN packet to request connection establishment. Client randomly selects initial sequence number (ISN).',
      packets: [{ from: 0, to: 1, type: 'SYN', delay: 0 }],
    },
    {
      phase: 'Second Handshake',
      icon: 'ACK',
      title: 'SYN-ACK Response',
      description: 'Server receives SYN, sends SYN-ACK as response. Confirms client SYN and sends its own SYN.',
      packets: [{ from: 1, to: 0, type: 'SYN-ACK', delay: 0 }],
    },
    {
      phase: 'Third Handshake',
      icon: 'ACK',
      title: 'ACK Confirmation',
      description: 'Client receives SYN-ACK, sends ACK confirmation. Connection established, both sides can transmit data.',
      packets: [{ from: 0, to: 1, type: 'ACK', delay: 0 }],
    },
    {
      phase: 'Connection Established',
      icon: '[OK]',
      title: 'TCP Connection Complete',
      description: 'Three-way handshake completed! TCP connection successfully established! Both sides enter ESTABLISHED state.',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'SYN': { start: '#3b82f6', end: '#2563eb' },
    'SYN-ACK': { start: '#8b5cf6', end: '#7c3aed' },
    'ACK': { start: '#10b981', end: '#059669' },
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
      const labels = ['Client', 'Server'];
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

      const clientX = width * 0.25;
      const serverX = width * 0.75;
      const centerY = height * 0.5;

      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
      context.lineWidth = 3;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(clientX + 60, centerY);
      context.lineTo(serverX - 60, centerY);
      context.stroke();
      context.setLineDash([]);

      const drawNode = (x: number, y: number, label: string, sublabel: string, isActive: boolean) => {
        const pulse = Math.sin(timeRef.current * 3) * 4;
        const color = primaryBlue;

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

        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        context.fillRect(x - 40, y - 30, 80, 5);
        context.fillRect(x - 40, y - 20, 80, 5);
        context.fillRect(x - 40, y - 10, 80, 5);

        context.fillStyle = 'white';
        context.font = 'bold 16px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 80);

        context.fillStyle = secondaryText;
        context.font = '12px Inter, system-ui, sans-serif';
        context.fillText(sublabel, x, y + 100);
      };

      const isClientActive = currentStep >= 1 && currentStep <= 3;
      const isServerActive = currentStep >= 2 && currentStep <= 3;
      drawNode(clientX, centerY, 'Client', 'TCP Client', isClientActive);
      drawNode(serverX, centerY, 'Server', 'TCP Server', isServerActive);

      if (currentStep === 4) {
        context.fillStyle = '#10b981';
        context.font = 'bold 24px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('Connection Established', width / 2, centerY - 80);
      }

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

      if (currentStep >= 1 && currentStep <= 3) {
        const stepData = steps[currentStep];
        if (stepData.packets.length > 0) {
          const packetData = stepData.packets[0];
          const fromX = packetData.from === 0 ? clientX : serverX;
          const toX = packetData.from === 0 ? serverX : clientX;

          const activePacket = packets.find((p) => p.type === packetData.type);
          const progress = activePacket?.progress || 0;

          if (progress > 0) {
            const headX = fromX + (toX - fromX) * progress;
            const tailProgress = Math.max(0, progress - 0.08);
            const tailX = fromX + (toX - fromX) * tailProgress;

            const colors = packetColors[packetData.type] || { start: '#64748b', end: '#475569' };

            context.strokeStyle = colors.start;
            context.lineWidth = 4;
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(tailX, centerY);
            context.lineTo(headX, centerY);
            context.stroke();

            const arrowSize = 12;
            const direction = toX > fromX ? 1 : -1;

            context.fillStyle = colors.start;
            context.beginPath();
            context.moveTo(headX, centerY);
            context.lineTo(headX - arrowSize * direction * Math.cos(Math.PI / 6), centerY - arrowSize * Math.sin(Math.PI / 6));
            context.lineTo(headX - arrowSize * direction * Math.cos(Math.PI / 6), centerY + arrowSize * Math.sin(Math.PI / 6));
            context.closePath();
            context.fill();
          }
        }
      }

      packets.forEach((packet) => {
        if (!packet.active) return;

        const fromX = packet.from === 0 ? clientX : serverX;
        const toX = packet.from === 0 ? serverX : clientX;
        const currentX = fromX + (toX - fromX) * packet.progress;

        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };

        context.save();
        context.translate(currentX, centerY);
        context.rotate(timeRef.current * 2);

        const size = 28;
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
        context.font = 'bold 10px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 4;
        context.fillText(packet.type, currentX, centerY);
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
                <span className="font-medium">Back to Home</span>
              </a>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>TCP Three-Way Handshake</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>Transmission Control Protocol</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)' }}>
                <div className="text-xs" style={{ color: secondaryText }}>Current Step</div>
                <div className="text-xl font-bold" style={{ color: primaryBlue }}>{currentStep + 1} / {steps.length}</div>
              </div>
              <button onClick={handleReset} className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>
                Reset
              </button>
              <button onClick={handleNext} disabled={currentStep >= steps.length - 1} className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50" style={{ backgroundColor: primaryBlue, color: 'white' }}>
                Next
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>TCP Three-Way Handshake</h3>
            <p className="text-sm leading-relaxed" style={{ color: textColor }}>
              <span style={{ color: primaryBlue, fontWeight: 600 }}>Reliable Connection:</span> TCP establishes reliable connection through three-way handshake, ensuring both parties can send and receive data normally.<br/>
              <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Sequence Number:</span> Both parties maintain sequence numbers for data ordering and reliability.<br/>
              <span style={{ color: '#10b981', fontWeight: 600 }}>State Transition:</span> CLOSED - SYN_SENT - ESTABLISHED (client), LISTEN - SYN_RCVD - ESTABLISHED (server).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '400px' }}>
                <canvas ref={canvasRef} className="w-full h-full" />
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold" style={{ color: secondaryText }}>Steps:</span>
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
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>SYN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>SYN-ACK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>ACK</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderColor }}>
                  <span className="text-2xl" style={{ color: primaryBlue }}>{steps[currentStep].icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{steps[currentStep].title}</h3>
                    <p className="text-xs" style={{ color: secondaryText }}>Step {currentStep + 1} of {steps.length} | {steps[currentStep].phase}</p>
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
                  <span className="text-lg">Packet Log</span>
                </div>

                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '150px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                      <span>No packets yet</span>
                    </div>
                  ) : (
                    packetLogs.map((log, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} />
                        <span className="text-sm font-semibold" style={{ color: textColor }}>
                          {log.type} {log.from} to {log.to}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <h4 className="font-bold mb-3">TCP Connection States</h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6b7280' }} />
                    <span style={{ color: textColor }}>CLOSED</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>LISTEN</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                    <span style={{ color: textColor }}>SYN_SENT</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>ESTABLISHED</span>
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
            NetViz - Network Engineering Visualization | TCP Three-Way Handshake Demo
          </div>
        </div>
      </footer>
    </div>
  );
}