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
  masterState: string;
  backupState: string;
  packets: { from: number; to: number; type: string; delay: number }[];
  isMasterActive: boolean;
  isMasterFailed: boolean;
  virtualIpOnMaster: boolean; // true = VIP on master, false = VIP on backup
  showTraffic: boolean; // show data traffic from PC
  trafficPath: 'master' | 'backup'; // which router traffic flows through
}

export default function VRRPPage() {
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
      title: 'VRRP 组启动',
      description: '两台路由器加入 VRRP 组（VRID=1），配置虚拟 IP 192.168.1.254。Master 路由器优先级 120，Backup 路由器优先级 100。优先级范围 1-254，值越大越优先（默认 100）。',
      masterState: 'INIT',
      backupState: 'INIT',
      packets: [],
      isMasterActive: false,
      isMasterFailed: false,
      virtualIpOnMaster: false,
      showTraffic: false,
      trafficPath: 'master',
    },
    {
      phase: '主备选举',
      icon: <Emoji label="👑" />,
      title: '选举 Master 路由器',
      description: '路由器发送 VRRP Advertisement 通告自己的优先级。Master（优先级 120 > 100）胜出成为 Master，负责转发数据并持有虚拟 IP。Backup（优先级 100）进入 Backup 状态，监听 Master 的通告。',
      masterState: 'MASTER',
      backupState: 'BACKUP',
      packets: [
        { from: 1, to: 2, type: 'ADV', delay: 0 },
        { from: 2, to: 1, type: 'ADV', delay: 300 },
      ],
      isMasterActive: true,
      isMasterFailed: false,
      virtualIpOnMaster: true,
      showTraffic: true,
      trafficPath: 'master',
    },
    {
      phase: '心跳检测',
      icon: <Emoji label="💓" />,
      title: '发送 VRRP 通告',
      description: 'Master 路由器周期性（默认 1 秒）发送 VRRP Advertisement 报文到组播地址 224.0.0.18，向 Backup 宣告自己存活。Backup 持续监听，若连续 3 个周期未收到通告则判定 Master 故障。',
      masterState: 'MASTER',
      backupState: 'BACKUP',
      packets: [
        { from: 1, to: 2, type: 'ADV', delay: 0 },
        { from: 1, to: 2, type: 'ADV', delay: 800 },
        { from: 1, to: 2, type: 'ADV', delay: 1600 },
      ],
      isMasterActive: true,
      isMasterFailed: false,
      virtualIpOnMaster: true,
      showTraffic: true,
      trafficPath: 'master',
    },
    {
      phase: 'Master 故障',
      icon: <Emoji label="💔" />,
      title: 'Master 发生故障',
      description: 'Master 路由器突然宕机，停止发送 Advertisement。Backup 路由器在 Master_Down 间隔内（3 倍通告时间 = 3 秒）未收到任何通告，开始倒计时准备接管。',
      masterState: 'DOWN',
      backupState: 'BACKUP',
      packets: [],
      isMasterActive: false,
      isMasterFailed: true,
      virtualIpOnMaster: true,
      showTraffic: false,
      trafficPath: 'master',
    },
    {
      phase: '主备切换',
      icon: <Emoji label="🔄" />,
      title: 'Backup 切换为 Master',
      description: 'Backup 路由器在 Master_Down 时间内未收到 Master 的通告，自动切换为 Master 角色。虚拟 IP 192.168.1.254 转由新 Master 持有，继续为网络提供网关服务。',
      masterState: 'DOWN',
      backupState: 'MASTER',
      packets: [
        { from: 2, to: 1, type: 'ADV', delay: 500 },
      ],
      isMasterActive: false,
      isMasterFailed: true,
      virtualIpOnMaster: false,
      showTraffic: false,
      trafficPath: 'backup',
    },
    {
      phase: '收敛完成',
      icon: <Emoji label="✅" />,
      title: 'VRRP 收敛完成',
      description: '新 Master 开始周期性发送 VRRP Advertisement。虚拟 IP 地址保持不变（192.168.1.254），主机无需修改网关配置，实现秒级故障切换。原 Master 恢复后作为 Backup 加入。',
      masterState: 'DOWN',
      backupState: 'MASTER',
      packets: [
        { from: 2, to: 1, type: 'ADV', delay: 0 },
        { from: 2, to: 1, type: 'ADV', delay: 1200 },
      ],
      isMasterActive: false,
      isMasterFailed: true,
      virtualIpOnMaster: false,
      showTraffic: true,
      trafficPath: 'backup',
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'ADV': { start: '#10b981', end: '#059669' },
    'Data': { start: '#3b82f6', end: '#2563eb' },
  };

  const stateColors: Record<string, string> = {
    'MASTER': '#10b981',
    'BACKUP': '#f59e0b',
    'DOWN': '#ef4444',
    'INIT': '#6b7280',
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
      const labels = ['PC', 'Master', 'Backup'];
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

      // Positions
      const pcX = width * 0.5;
      const pcY = height * 0.12;
      const masterX = width * 0.25;
      const backupX = width * 0.75;
      const routerY = height * 0.68;
      const vipY = height * 0.38;

      // === Links ===
      context.lineWidth = 2;
      context.setLineDash([5, 5]);

      // PC → Master link
      context.strokeStyle = step.trafficPath === 'master' ? '#22c55e' : (isDarkMode ? '#4b5563' : '#d1d5db');
      context.lineWidth = step.trafficPath === 'master' ? 3 : 1;
      context.beginPath();
      context.moveTo(pcX, pcY + 45);
      context.lineTo(masterX + 40, routerY - 45);
      context.stroke();

      // PC → Backup link
      context.strokeStyle = step.trafficPath === 'backup' ? '#22c55e' : (isDarkMode ? '#4b5563' : '#d1d5db');
      context.lineWidth = step.trafficPath === 'backup' ? 3 : 1;
      context.beginPath();
      context.moveTo(pcX, pcY + 45);
      context.lineTo(backupX - 40, routerY - 45);
      context.stroke();

      context.setLineDash([]);

      // Master ↔ Backup link (heartbeat)
      context.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(masterX + 50, routerY);
      context.lineTo(backupX - 50, routerY);
      context.stroke();
      context.setLineDash([]);

      // Heartbeat label
      context.fillStyle = secondaryText;
      context.font = '10px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('224.0.0.18', (masterX + backupX) / 2, routerY - 12);

      // === Virtual IP floating badge ===
      const vipOnMaster = step.virtualIpOnMaster;
      const vipX = vipOnMaster ? masterX : backupX;
      const vipColor = '#8b5cf6';
      const vipPulse = Math.sin(timeRef.current * 2) * 3;

      // VIP badge background
      context.fillStyle = isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)';
      context.beginPath();
      context.roundRect(vipX - 95, vipY + vipPulse - 14, 190, 28, 14);
      context.fill();

      context.strokeStyle = vipColor;
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(vipX - 95, vipY + vipPulse - 14, 190, 28, 14);
      context.stroke();

      context.fillStyle = vipColor;
      context.font = 'bold 13px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('Virtual IP: 192.168.1.254', vipX, vipY + vipPulse);

      // Dotted line from VIP to active router
      context.strokeStyle = vipColor + '60';
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(vipX, vipY + 14);
      context.lineTo(vipX, routerY - 45);
      context.stroke();
      context.setLineDash([]);

      // === Draw PC ===
      const drawPC = (x: number, y: number) => {
        // Monitor
        const monitorGradient = context.createLinearGradient(x - 30, y - 25, x + 30, y + 25);
        monitorGradient.addColorStop(0, '#64748b');
        monitorGradient.addColorStop(1, '#475569');
        context.fillStyle = monitorGradient;
        context.beginPath();
        context.roundRect(x - 30, y - 25, 60, 42, 6);
        context.fill();

        // Screen
        context.fillStyle = isDarkMode ? '#1e293b' : '#e2e8f0';
        context.beginPath();
        context.roundRect(x - 25, y - 20, 50, 32, 3);
        context.fill();

        // Screen content
        context.fillStyle = isDarkMode ? '#22c55e' : '#16a34a';
        context.font = '8px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('> ping 192.168.1.254', x, y - 6);
        context.fillText('  Reply from 192.168.1.254', x, y + 6);

        // Stand
        context.fillStyle = '#64748b';
        context.fillRect(x - 4, y + 17, 8, 6);
        context.fillRect(x - 15, y + 23, 30, 4);

        // Label
        context.fillStyle = isDarkMode ? '#ffffff' : '#1f2937';
        context.font = 'bold 12px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillText('PC (192.168.1.10)', x, y + 30);
      };

      drawPC(pcX, pcY);

      // === Draw router ===
      const drawRouter = (x: number, y: number, label: string, priority: string, color: string, isActive: boolean, isFailed: boolean, state: string) => {
        const pulse = Math.sin(timeRef.current * 3) * 4;

        // Glow effect
        if (isActive && !isFailed) {
          const glowGradient = context.createRadialGradient(x, y, 30, x, y, 65 + pulse);
          glowGradient.addColorStop(0, color + '40');
          glowGradient.addColorStop(1, 'transparent');
          context.fillStyle = glowGradient;
          context.beginPath();
          context.arc(x, y, 65 + pulse, 0, Math.PI * 2);
          context.fill();
        }

        // Router body
        const actualColor = isFailed ? '#6b7280' : color;
        const gradient = context.createLinearGradient(x - 42, y - 35, x + 42, y + 35);
        gradient.addColorStop(0, actualColor);
        gradient.addColorStop(1, actualColor + 'cc');
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(x - 42, y - 35, 84, 70, 10);
        context.fill();

        // Face details
        context.fillStyle = 'rgba(255, 255, 255, 0.25)';
        context.fillRect(x - 30, y - 20, 60, 4);
        context.fillRect(x - 30, y - 10, 60, 4);
        context.fillRect(x - 30, y, 60, 4);

        // LEDs
        const ledStatus = isFailed ? '#ef4444' : '#22c55e';
        context.fillStyle = ledStatus;
        context.beginPath();
        context.arc(x + 36, y - 8, 3, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(x - 36, y + 8, 3, 0, Math.PI * 2);
        context.fill();

        // Failure overlay
        if (isFailed) {
          context.fillStyle = 'rgba(239, 68, 68, 0.2)';
          context.beginPath();
          context.roundRect(x - 42, y - 35, 84, 70, 10);
          context.fill();

          // Big X
          context.strokeStyle = '#ef4444';
          context.lineWidth = 4;
          context.lineCap = 'round';
          context.beginPath();
          context.moveTo(x - 20, y - 18);
          context.lineTo(x + 20, y + 18);
          context.stroke();
          context.beginPath();
          context.moveTo(x + 20, y - 18);
          context.lineTo(x - 20, y + 18);
          context.stroke();
        }

        // Master/Backup label
        const stateColors_canvas: Record<string, string> = { 'MASTER': '#10b981', 'BACKUP': '#f59e0b', 'DOWN': '#ef4444', 'INIT': '#6b7280' };
        const actualState = isFailed ? 'DOWN' : state;
        context.fillStyle = stateColors_canvas[actualState] || '#ffffff';
        context.font = 'bold 12px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(actualState, x, y - 48);

        // Name
        context.fillStyle = 'white';
        context.font = 'bold 14px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText(label, x, y + 55);

        // Priority
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText(priority, x, y + 68);
      };

      const masterColor = '#10b981';
      const backupColor = '#f59e0b';
      const isMasterVisible = currentStep <= 3;
      const isMasterDown = currentStep >= 3;

      if (isMasterVisible || isMasterDown) {
        drawRouter(
          masterX, routerY,
          'Master', 'Priority: 120',
          masterColor,
          step.isMasterActive,
          step.isMasterFailed,
          steps[currentStep].masterState
        );
      }
      drawRouter(
        backupX, routerY,
        currentStep >= 4 ? '新 Master' : 'Backup',
        currentStep >= 4 ? 'Priority: 120' : 'Priority: 100',
        currentStep >= 4 ? '#10b981' : backupColor,
        true,
        false,
        steps[currentStep].backupState
      );

      // === Traffic from PC to active router ===
      if (step.showTraffic) {
        const trafficTarget = step.trafficPath === 'master' ? masterX : backupX;
        const numPackets = 3;

        for (let i = 0; i < numPackets; i++) {
          const t = ((timeRef.current * 0.8 + i * 1.5) % 3) / 3;
          const tx = pcX + (trafficTarget - pcX) * t;
          const ty = (pcY + 35) + (routerY - 25 - pcY - 35) * t;

          const alpha = t < 0.1 ? t * 10 : (t > 0.9 ? (1 - t) * 10 : 1);
          context.fillStyle = `rgba(59, 130, 246, ${alpha * 0.8})`;
          context.beginPath();
          context.arc(tx, ty, 5, 0, Math.PI * 2);
          context.fill();

          context.fillStyle = `rgba(59, 130, 246, ${alpha * 0.3})`;
          context.beginPath();
          context.arc(tx, ty, 10, 0, Math.PI * 2);
          context.fill();
        }
      }

      // === Hold Down countdown in step 2-3 ===
      if (currentStep === 3) {
        // Show countdown text near Backup
        const countdown = Math.max(0, 3 - (timeRef.current * 0.3 % 4));
        const displayCount = Math.ceil(countdown);

        context.fillStyle = '#f59e0b';
        context.font = 'bold 16px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Countdown circle
        const cdX = backupX;
        const cdY = routerY - 90;
        context.beginPath();
        context.arc(cdX, cdY, 22, 0, Math.PI * 2);
        context.fillStyle = isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)';
        context.fill();
        context.strokeStyle = '#f59e0b';
        context.lineWidth = 2;
        const sweep = (3 - displayCount + 1) / 3 * Math.PI * 2;
        context.beginPath();
        context.arc(cdX, cdY, 22, -Math.PI / 2, -Math.PI / 2 + sweep);
        context.stroke();

        context.fillStyle = '#f59e0b';
        context.font = 'bold 16px Inter, system-ui, sans-serif';
        context.fillText(String(displayCount), cdX, cdY);

        context.fillStyle = secondaryText;
        context.font = '10px Inter, system-ui, sans-serif';
        context.fillText('Hold Down', cdX, cdY + 30);
      }

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

      // Draw Advertisement packets (from Master to Backup)
      packets.forEach((packet) => {
        if (!packet.active || packet.completed) return;

        const fromX = packet.from === 1 ? masterX : (packet.from === 2 ? backupX : masterX);
        const toX = packet.to === 2 ? backupX : (packet.to === 1 ? masterX : backupX);
        const y = routerY;

        const currentX = fromX + (toX - fromX) * packet.progress;
        const colors = packetColors[packet.type] || { start: '#64748b', end: '#475569' };

        // Tail
        const tailProgress = Math.max(0, packet.progress - 0.1);
        const tailX = fromX + (toX - fromX) * tailProgress;

        context.strokeStyle = colors.start;
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.setLineDash([6, 5]);
        context.beginPath();
        context.moveTo(tailX, y);
        context.lineTo(currentX, y);
        context.stroke();
        context.setLineDash([]);

        // Glow
        const glowGradient = context.createRadialGradient(currentX, y, 10, currentX, y, 40);
        glowGradient.addColorStop(0, colors.start + '50');
        glowGradient.addColorStop(1, 'transparent');
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(currentX, y, 40, 0, Math.PI * 2);
        context.fill();

        // Packet
        context.save();
        context.translate(currentX, y);
        context.rotate(timeRef.current * 3);

        const packetGradient = context.createRadialGradient(0, 0, 0, 0, 0, 18);
        packetGradient.addColorStop(0, colors.start);
        packetGradient.addColorStop(1, colors.end);
        context.fillStyle = packetGradient;
        context.beginPath();
        context.arc(0, 0, 18, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        context.lineWidth = 2;
        context.stroke();
        context.restore();

        // Label
        context.fillStyle = 'white';
        context.font = 'bold 8px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0, 0, 0, 0.7)';
        context.shadowBlur = 3;
        context.fillText('ADV', currentX, y);
        context.shadowBlur = 0;
      });

      // Heartbeat pulse for active Master (step 2)
      if (currentStep === 2) {
        const pulsePhase = (timeRef.current * 2) % 1;
        if (pulsePhase < 0.3) {
          const pulseSize = pulsePhase / 0.3 * 30;
          const pulseAlpha = 1 - pulsePhase / 0.3;
          context.strokeStyle = `rgba(16, 185, 129, ${pulseAlpha * 0.3})`;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(masterX, routerY, 50 + pulseSize, 0, Math.PI * 2);
          context.stroke();
        }
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

  const stepStateDesc: Record<string, string> = {
    'MASTER': '主路由器',
    'BACKUP': '备路由器',
    'DOWN': '故障',
    'INIT': '初始状态',
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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>VRRP 虚拟路由器冗余协议</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>Virtual Router Redundancy Protocol</p>
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
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>VRRP 虚拟路由器冗余协议（Virtual Router Redundancy Protocol）</h3>
            <p className="text-base leading-relaxed mb-4 font-medium" style={{ color: textColor }}>
              VRRP 通过将多台路由器组成一个虚拟路由器，实现网关冗余，提高网络的可用性。
            </p>
            <div className="space-y-3" style={{ color: textColor }}>
              <p className="text-sm leading-relaxed">
                <span style={{ color: primaryBlue, fontWeight: 600, fontSize: '15px' }}>1. 主备选举：</span>
                VRRP 组内根据优先级选举 Master，**值越大越优先**（范围 1-254，默认 100）。优先级高的成为 Master，负责转发数据；其他成为 Backup，监听 Master 状态。
              </p>
              <p className="text-sm leading-relaxed">
                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '15px' }}>2. 心跳检测：</span>
                Master 周期性发送 Advertisement 报文（默认 1 秒）到组播 224.0.0.18。Backup 持续监听，若 3 秒内未收到通告，认为 Master 故障。
              </p>
              <p className="text-sm leading-relaxed">
                <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '15px' }}>3. 无缝切换：</span>
                Backup 自动切换为新的 Master，继续发送通告。虚拟 IP 地址保持不变（192.168.1.254），主机无需修改网关配置，实现秒级故障切换。
              </p>
            </div>
          </div>

          {/* VRRP vs HSRP */}
          <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: primaryBlue }}>二、VRRP 与 HSRP 对比</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: primaryBlue }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>VRRP（IETF 标准）</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>RFC 3768 / 5798 — 开放标准</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>多厂商兼容（华为、Cisco、Juniper 等）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>优先级范围 1-254</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryBlue }} />
                    <span style={{ color: textColor }}>虚拟 MAC: 00-00-5E-00-01-{'{VRID}'}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: '#10b981' }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: '#10b981' }}>HSRP（Cisco 私有）</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>Cisco 私有协议</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>仅 Cisco 设备支持</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>优先级范围 0-255</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: textColor }}>虚拟 MAC: 00-00-0C-07-AC-{'{HSRP组号}'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: '450px' }}>
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
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>Advertisement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>数据流量</span>
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
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${primaryBlue}, #10b981, #f59e0b)` }} />
                </div>
              </div>

              {/* Packet log */}
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📦</span>
                  <div>
                    <h4 className="font-bold">报文日志</h4>
                    <p className="text-xs" style={{ color: secondaryText }}>VRRP 报文交互</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 overflow-y-auto" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)', maxHeight: '150px' }}>
                  {packetLogs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} />
                      <span>暂无 VRRP 报文</span>
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

              {/* Router status */}
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <h4 className="font-bold mb-3">VRRP 路由器状态</h4>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>Master 路由器</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: (stateColors[steps[currentStep].masterState] || '#6b7280') + '30', color: stateColors[steps[currentStep].masterState] || '#6b7280' }}>
                        {steps[currentStep].masterState}
                      </span>
                    </div>
                    <div style={{ color: secondaryText }}>{stepStateDesc[steps[currentStep].masterState] || ''}</div>
                  </div>
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>Backup 路由器</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: (stateColors[steps[currentStep].backupState] || '#6b7280') + '30', color: stateColors[steps[currentStep].backupState] || '#6b7280' }}>
                        {steps[currentStep].backupState}
                      </span>
                    </div>
                    <div style={{ color: secondaryText }}>{stepStateDesc[steps[currentStep].backupState] || ''}</div>
                  </div>
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>Virtual IP</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(139, 92, 246, 0.3)', color: '#8b5cf6' }}>
                        {steps[currentStep].virtualIpOnMaster ? 'Master 侧' : '新 Master 侧'}
                      </span>
                    </div>
                    <div style={{ color: secondaryText }}>192.168.1.254</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | VRRP 虚拟路由器冗余协议动画演示</div>
        </div>
      </footer>
    </div>
  );
}
