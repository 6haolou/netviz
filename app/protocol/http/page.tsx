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
  clientStatus: string;
  serverStatus: string;
  packets: { from: number; to: number; type: string; delay: number }[];
}

export default function HTTPPage() {
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
      icon: <Emoji label="[ ]" />,
      title: 'HTTP 请求前',
      description: '客户端准备向服务器发送 HTTP 请求，获取网页内容。此时双方还未建立连接。',
      clientStatus: 'IDLE',
      serverStatus: 'LISTEN',
      packets: [],
    },
    {
      phase: 'TCP 连接',
      icon: <Emoji label="TCP" />,
      title: 'TCP 三次握手建立连接',
      description: '在发送 HTTP 请求前，需要先通过 TCP 三次握手建立可靠连接：(1) 客户端发送 SYN 报文；(2) 服务器回复 SYN+ACK；(3) 客户端再回复 ACK。连接建立后双方进入 ESTABLISHED 状态。',
      clientStatus: 'ESTABLISHED',
      serverStatus: 'ESTABLISHED',
      packets: [
        { from: 0, to: 1, type: 'SYN', delay: 0 },
        { from: 1, to: 0, type: 'SYN+ACK', delay: 500 },
        { from: 0, to: 1, type: 'ACK', delay: 1000 },
      ],
    },
    {
      phase: '发送请求',
      icon: <Emoji label="GET" />,
      title: '发送 HTTP GET 请求',
      description: 'TCP 连接建立后，客户端发送 HTTP GET 请求，请求获取/index.html 页面内容。报文包括请求行、请求头和可选的请求体。',
      clientStatus: 'ESTABLISHED',
      serverStatus: 'ESTABLISHED',
      packets: [{ from: 0, to: 1, type: 'GET', delay: 0 }],
    },
    {
      phase: '返回响应',
      icon: <Emoji label="200" />,
      title: '服务器返回 HTTP 响应',
      description: '服务器收到 GET 请求后，解析请求报文，查找请求的资源，然后返回 200 OK 状态码和 HTML 页面内容。',
      clientStatus: 'ESTABLISHED',
      serverStatus: 'ESTABLISHED',
      packets: [{ from: 1, to: 0, type: '200 OK', delay: 0 }],
    },
    {
      phase: '完成',
      icon: <Emoji label="[OK]" />,
      title: 'HTTP 请求完成',
      description: '客户端收到响应，HTTP 请求 - 响应周期完成。在 HTTP/1.1 中，连接可以保持（Keep-Alive）以发送更多请求。',
      clientStatus: 'CLOSED',
      serverStatus: 'CLOSED',
      packets: [],
    },
  ];

  const packetColors: Record<string, { start: string; end: string }> = {
    'SYN': { start: '#6b7280', end: '#4b5563' },
    'SYN+ACK': { start: '#8b5cf6', end: '#7c3aed' },
    'ACK': { start: '#3b82f6', end: '#2563eb' },
    'GET': { start: '#3b82f6', end: '#2563eb' },
    '200 OK': { start: '#10b981', end: '#059669' },
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
      const labels = ['客户端', '服务器'];
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

      // TCP 三次握手步骤：绘制时序图样式 + 动画
      if (currentStep === 1) {
        const clientX = width * 0.25;
        const serverX = width * 0.75;
        const topY = height * 0.1;
        const bottomY = height * 0.95;
        
        // 绘制客户端图标（和其他页面一致）
        const clientColor = '#3b82f6';
        const pulse = Math.sin(timeRef.current * 3) * 4;
        
        // 光晕效果
        const glowGradient = context.createRadialGradient(clientX, topY, 40, clientX, topY, 80 + pulse);
        glowGradient.addColorStop(0, clientColor + '40');
        glowGradient.addColorStop(1, 'transparent');
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(clientX, topY, 80 + pulse, 0, Math.PI * 2);
        context.fill();
        
        // 节点渐变
        const nodeGradient = context.createLinearGradient(clientX - 50, topY - 50, clientX + 50, topY + 50);
        nodeGradient.addColorStop(0, clientColor);
        nodeGradient.addColorStop(1, clientColor + 'cc');
        context.fillStyle = nodeGradient;
        
        // 客户端：显示器图标
        context.beginPath();
        context.roundRect(clientX - 50, topY - 50, 100, 100, 12);
        context.fill();
        
        // 显示器屏幕
        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        context.fillRect(clientX - 35, topY - 30, 70, 45);
        context.fillRect(clientX - 20, topY + 15, 40, 8);
        context.fillRect(clientX - 30, topY + 23, 60, 6);
        
        // 标签 - 使用深色，确保在浅色背景下可见
        context.fillStyle = isDarkMode ? '#ffffff' : '#1f2937';
        context.font = 'bold 16px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.fillText('客户端', clientX, topY + 80);
        
        context.fillStyle = secondaryText;
        context.font = '12px Inter, system-ui, sans-serif';
        context.fillText('Client', clientX, topY + 100);

        // 绘制服务器图标（和其他页面一致）
        const serverColor = '#8b5cf6';
        const serverGlowGradient = context.createRadialGradient(serverX, topY, 40, serverX, topY, 80 + pulse);
        serverGlowGradient.addColorStop(0, serverColor + '40');
        serverGlowGradient.addColorStop(1, 'transparent');
        context.fillStyle = serverGlowGradient;
        context.beginPath();
        context.arc(serverX, topY, 80 + pulse, 0, Math.PI * 2);
        context.fill();
        
        const serverNodeGradient = context.createLinearGradient(serverX - 50, topY - 50, serverX + 50, topY + 50);
        serverNodeGradient.addColorStop(0, serverColor);
        serverNodeGradient.addColorStop(1, serverColor + 'cc');
        context.fillStyle = serverNodeGradient;
        
        // 服务器：圆柱体图标
        context.beginPath();
        context.ellipse(serverX, topY - 35, 50, 15, 0, 0, Math.PI * 2);
        context.fill();
        context.fillRect(serverX - 50, topY - 35, 100, 70);
        context.beginPath();
        context.ellipse(serverX, topY + 35, 50, 15, 0, 0, Math.PI * 2);
        context.fill();
        
        // 服务器装饰线
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        context.fillRect(serverX - 40, topY - 20, 80, 4);
        context.fillRect(serverX - 40, topY - 10, 80, 4);
        context.fillRect(serverX - 40, topY, 80, 4);
        context.fillRect(serverX - 40, topY + 10, 80, 4);
        
        // 标签 - 使用深色，确保在浅色背景下可见
        context.fillStyle = isDarkMode ? '#ffffff' : '#1f2937';
        context.font = 'bold 16px Inter, system-ui, sans-serif';
        context.fillText('服务器', serverX, topY + 80);
        
        context.fillStyle = secondaryText;
        context.font = '12px Inter, system-ui, sans-serif';
        context.fillText('Server', serverX, topY + 100);

        // 绘制三个报文（带球球动画 + 文字）
        const now = Date.now();
        const clientISN = 1000;
        const serverISN = 2000;
        
        // 第一次握手：SYN
        const synPacket = packets.find(p => p.type === 'SYN');
        const synProgress = synPacket && now >= synPacket.startTime ? Math.min(1, (now - synPacket.startTime) / 1500) : 0;
        const synY1 = topY + 120;
        const synY2 = topY + 240;
        
        if (synProgress > 0) {
          const colors = packetColors['SYN'];
          const currentProgress = Math.min(1, synProgress * 1.2);
          const currentX = clientX + (serverX - clientX) * currentProgress;
          const currentY = synY1 + (synY2 - synY1) * currentProgress;
          
          // 先绘制完整的灰色虚线路径（从起点到终点）
          context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.5)' : 'rgba(156, 163, 175, 0.5)';
          context.lineWidth = 2;
          context.setLineDash([5, 8]);
          context.beginPath();
          context.moveTo(clientX, synY1);
          context.lineTo(serverX, synY2);
          context.stroke();
          context.setLineDash([]);
          
          // 绘制拖尾（虚线效果）
          const tailProgress = Math.max(0, currentProgress - 0.15);
          const tailX = clientX + (serverX - clientX) * tailProgress;
          const tailY = synY1 + (synY2 - synY1) * tailProgress;
          
          // 绘制虚线路径
          context.strokeStyle = colors.start;
          context.lineWidth = 3;
          context.lineCap = 'round';
          context.setLineDash([8, 6]); // 虚线样式
          context.beginPath();
          context.moveTo(tailX, tailY);
          context.lineTo(currentX, currentY);
          context.stroke();
          context.setLineDash([]); // 恢复实线
          
          // 绘制球球
          context.save();
          context.translate(currentX, currentY);
          context.rotate(timeRef.current * 3);
          
          const size = 20;
          const ballGlow = context.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2);
          ballGlow.addColorStop(0, colors.start + '60');
          ballGlow.addColorStop(1, 'transparent');
          context.fillStyle = ballGlow;
          context.beginPath();
          context.arc(0, 0, size * 2, 0, Math.PI * 2);
          context.fill();
          
          const ballGradient = context.createRadialGradient(0, 0, 0, 0, 0, size);
          ballGradient.addColorStop(0, colors.start);
          ballGradient.addColorStop(1, colors.end);
          context.fillStyle = ballGradient;
          context.beginPath();
          context.arc(0, 0, size, 0, Math.PI * 2);
          context.fill();
          
          context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          context.lineWidth = 3;
          context.stroke();
          context.restore();
          
          // 在球球中间绘制文字（SYN）
          context.save();
          context.fillStyle = 'white';
          context.font = 'bold 10px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.shadowColor = 'rgba(0, 0, 0, 0.7)';
          context.shadowBlur = 4;
          context.fillText('SYN', currentX, currentY);
          context.restore();
          
          // 报文文字和序列号（在球球旁边带背景框）
          if (currentProgress >= 0.3) {
            context.save();
            // 绘制文字背景
            context.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)';
            context.fillRect(currentX + 20, currentY - 25, 70, 35);
            
            context.fillStyle = 'white';
            context.font = 'bold 12px Inter, system-ui, sans-serif';
            context.fillText('SYN', currentX + 55, currentY - 12);
            context.font = '10px Inter, system-ui, sans-serif';
            context.fillStyle = isDarkMode ? '#d1d5db' : '#6b7280';
            context.fillText(`seq=${clientISN}`, currentX + 55, currentY + 5);
            context.restore();
          }
        }
        
        // 第二次握手：SYN+ACK
        const synAckPacket = packets.find(p => p.type === 'SYN+ACK');
        const synAckProgress = synAckPacket && now >= synAckPacket.startTime ? Math.min(1, (now - synAckPacket.startTime) / 1500) : 0;
        const synAckY1 = topY + 280;
        const synAckY2 = topY + 400;
        
        if (synAckProgress > 0) {
          const colors = packetColors['SYN+ACK'];
          const currentProgress = Math.min(1, synAckProgress * 1.2);
          const currentX = serverX + (clientX - serverX) * currentProgress;
          const currentY = synAckY1 + (synAckY2 - synAckY1) * currentProgress;
          
          // 先绘制完整的灰色虚线路径（从起点到终点）
          context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.5)' : 'rgba(156, 163, 175, 0.5)';
          context.lineWidth = 2;
          context.setLineDash([5, 8]);
          context.beginPath();
          context.moveTo(serverX, synAckY1);
          context.lineTo(clientX, synAckY2);
          context.stroke();
          context.setLineDash([]);
          
          const tailProgress = Math.max(0, currentProgress - 0.15);
          const tailX = serverX + (clientX - serverX) * tailProgress;
          const tailY = synAckY1 + (synAckY2 - synAckY1) * tailProgress;
          
          // 绘制虚线路径
          context.strokeStyle = colors.start;
          context.lineWidth = 3;
          context.lineCap = 'round';
          context.setLineDash([8, 6]); // 虚线样式
          context.beginPath();
          context.moveTo(tailX, tailY);
          context.lineTo(currentX, currentY);
          context.stroke();
          context.setLineDash([]); // 恢复实线
          
          context.save();
          context.translate(currentX, currentY);
          context.rotate(timeRef.current * 3);
          
          const size = 20;
          const ballGlow = context.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2);
          ballGlow.addColorStop(0, colors.start + '60');
          ballGlow.addColorStop(1, 'transparent');
          context.fillStyle = ballGlow;
          context.beginPath();
          context.arc(0, 0, size * 2, 0, Math.PI * 2);
          context.fill();
          
          const ballGradient = context.createRadialGradient(0, 0, 0, 0, 0, size);
          ballGradient.addColorStop(0, colors.start);
          ballGradient.addColorStop(1, colors.end);
          context.fillStyle = ballGradient;
          context.beginPath();
          context.arc(0, 0, size, 0, Math.PI * 2);
          context.fill();
          
          context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          context.lineWidth = 3;
          context.stroke();
          context.restore();
          
          // 在球球中间绘制文字（SYN+ACK）
          context.save();
          context.fillStyle = 'white';
          context.font = 'bold 9px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.shadowColor = 'rgba(0, 0, 0, 0.7)';
          context.shadowBlur = 4;
          context.fillText('SYN+ACK', currentX, currentY);
          context.restore();
          
          if (currentProgress >= 0.3) {
            context.save();
            // 绘制文字背景 - 移到更左边，远离球球
            context.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)';
            context.fillRect(currentX - 130, currentY - 25, 110, 40);
            
            context.fillStyle = 'white';
            context.font = 'bold 11px Inter, system-ui, sans-serif';
            context.fillText('SYN+ACK', currentX - 75, currentY - 8);
            context.font = '9px Inter, system-ui, sans-serif';
            context.fillStyle = isDarkMode ? '#d1d5db' : '#6b7280';
            context.fillText(`seq=${serverISN}`, currentX - 75, currentY + 6);
            context.fillText(`ack=${clientISN + 1}`, currentX - 75, currentY + 18);
            context.restore();
          }
        }
        
        // 绘制垂直时间线（虚线）- 最后绘制，确保在所有元素之上
        context.strokeStyle = isDarkMode ? '#6b7280' : '#9ca3af';
        context.lineWidth = 2;
        context.setLineDash([5, 10]);
        context.beginPath();
        context.moveTo(clientX, topY);
        context.lineTo(clientX, bottomY);
        context.stroke();
        context.beginPath();
        context.moveTo(serverX, topY);
        context.lineTo(serverX, bottomY);
        context.stroke();
        context.setLineDash([]);

        // 第三次握手：ACK
        const ackPacket = packets.find(p => p.type === 'ACK');
        const ackProgress = ackPacket && now >= ackPacket.startTime ? Math.min(1, (now - ackPacket.startTime) / 1500) : 0;
        const ackY1 = topY + 440;
        const ackY2 = topY + 560;
        
        if (ackProgress > 0) {
          const colors = packetColors['ACK'];
          const currentProgress = Math.min(1, ackProgress * 1.2);
          const currentX = clientX + (serverX - clientX) * currentProgress;
          const currentY = ackY1 + (ackY2 - ackY1) * currentProgress;
          
          // 先绘制完整的灰色虚线路径（从起点到终点）
          context.strokeStyle = isDarkMode ? 'rgba(107, 114, 128, 0.5)' : 'rgba(156, 163, 175, 0.5)';
          context.lineWidth = 2;
          context.setLineDash([5, 8]);
          context.beginPath();
          context.moveTo(clientX, ackY1);
          context.lineTo(serverX, ackY2);
          context.stroke();
          context.setLineDash([]);
          
          const tailProgress = Math.max(0, currentProgress - 0.15);
          const tailX = clientX + (serverX - clientX) * tailProgress;
          const tailY = ackY1 + (ackY2 - ackY1) * tailProgress;
          
          // 绘制虚线路径
          context.strokeStyle = colors.start;
          context.lineWidth = 3;
          context.lineCap = 'round';
          context.setLineDash([8, 6]); // 虚线样式
          context.beginPath();
          context.moveTo(tailX, tailY);
          context.lineTo(currentX, currentY);
          context.stroke();
          context.setLineDash([]); // 恢复实线
          
          context.save();
          context.translate(currentX, currentY);
          context.rotate(timeRef.current * 3);
          
          const size = 20;
          const ballGlow = context.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2);
          ballGlow.addColorStop(0, colors.start + '60');
          ballGlow.addColorStop(1, 'transparent');
          context.fillStyle = ballGlow;
          context.beginPath();
          context.arc(0, 0, size * 2, 0, Math.PI * 2);
          context.fill();
          
          const ballGradient = context.createRadialGradient(0, 0, 0, 0, 0, size);
          ballGradient.addColorStop(0, colors.start);
          ballGradient.addColorStop(1, colors.end);
          context.fillStyle = ballGradient;
          context.beginPath();
          context.arc(0, 0, size, 0, Math.PI * 2);
          context.fill();
          
          context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          context.lineWidth = 3;
          context.stroke();
          context.restore();
          
          // 在球球中间绘制文字（ACK）
          context.save();
          context.fillStyle = 'white';
          context.font = 'bold 10px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.shadowColor = 'rgba(0, 0, 0, 0.7)';
          context.shadowBlur = 4;
          context.fillText('ACK', currentX, currentY);
          context.restore();
          
          if (currentProgress >= 0.3) {
            context.save();
            // 绘制文字背景
            context.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)';
            context.fillRect(currentX + 20, currentY - 30, 85, 45);
            
            context.fillStyle = 'white';
            context.font = 'bold 12px Inter, system-ui, sans-serif';
            context.fillText('ACK', currentX + 62, currentY - 12);
            context.font = '10px Inter, system-ui, sans-serif';
            context.fillStyle = isDarkMode ? '#d1d5db' : '#6b7280';
            context.fillText(`seq=${clientISN + 1}`, currentX + 62, currentY + 5);
            context.fillText(`ack=${serverISN + 1}`, currentX + 62, currentY + 18);
            context.restore();
          }
        }
      } else {
        // 其他步骤：正常绘制单个客户端和服务器
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

        const drawNode = (x: number, y: number, label: string, sublabel: string, isActive: boolean, status?: string, isClient?: boolean) => {
          const pulse = Math.sin(timeRef.current * 3) * 4;
          const color = isClient ? '#3b82f6' : '#8b5cf6';

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
          
          if (isClient) {
            context.beginPath();
            context.roundRect(x - 50, y - 50, 100, 100, 12);
            context.fill();
            
            context.fillStyle = 'white';
            context.fillRect(x - 35, y - 30, 70, 45);
            context.fillRect(x - 20, y + 15, 40, 8);
            context.fillRect(x - 30, y + 23, 60, 6);
          } else {
            context.beginPath();
            context.ellipse(x, y - 35, 50, 15, 0, 0, Math.PI * 2);
            context.fill();
            context.fillRect(x - 50, y - 35, 100, 70);
            context.beginPath();
            context.ellipse(x, y + 35, 50, 15, 0, 0, Math.PI * 2);
            context.fill();
            
            context.fillStyle = 'rgba(255, 255, 255, 0.3)';
            context.fillRect(x - 40, y - 20, 80, 4);
            context.fillRect(x - 40, y - 10, 80, 4);
            context.fillRect(x - 40, y, 80, 4);
            context.fillRect(x - 40, y + 10, 80, 4);
          }

          // 标签颜色 - 根据模式调整，确保可见
          context.fillStyle = isDarkMode ? '#ffffff' : '#1f2937';
          context.font = 'bold 16px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.fillText(label, x, y + 80);

          context.fillStyle = secondaryText;
          context.font = '12px Inter, system-ui, sans-serif';
          context.fillText(sublabel, x, y + 100);

          if (status) {
            context.fillStyle = '#10b981';
            context.font = 'bold 11px Inter, system-ui, sans-serif';
            context.fillText(status, x, y + 120);
          }
        };

        const isClientActive = currentStep >= 2 && currentStep <= 3;
        const isServerActive = currentStep >= 2 && currentStep <= 3;
        const clientStatus = steps[currentStep].clientStatus;
        const serverStatus = steps[currentStep].serverStatus;
        drawNode(clientX, centerY, '客户端', 'Client', isClientActive, clientStatus, true);
        drawNode(serverX, centerY, '服务器', 'Server', isServerActive, serverStatus, false);

        if (currentStep === 4) {
          context.fillStyle = '#10b981';
          context.font = 'bold 24px Inter, system-ui, sans-serif';
          context.textAlign = 'center';
          context.fillText('✓ 请求完成', width / 2, centerY - 80);
        }

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

        if (currentStep >= 2 && currentStep <= 3) {
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
  const handleReset = () => { setCurrentStep(0); setPackets([]); setPacketLogs([]); };
  const handleStepClick = (index: number) => { if (index <= currentStep + 1) setCurrentStep(index); };

  const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff';
  const cardBg = isDarkMode ? '#1f2937' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#171717';
  const secondaryText = isDarkMode ? '#9ca3af' : '#6b7280';
  const borderColor = isDarkMode ? '#374151' : '#e5e7eb';
  const primaryBlue = '#3b82f6';

  const statusColors: Record<string, string> = {
    'IDLE': '#6b7280',
    'LISTEN': primaryBlue,
    'SYN_SENT': '#8b5cf6',
    'ESTABLISHED': '#10b981',
    'CLOSED': '#6b7280',
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
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>HTTP 请求响应</h1>
                <p className="text-sm mt-1" style={{ color: secondaryText }}>HyperText Transfer Protocol</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg border" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)' }}>
                <div className="text-xs" style={{ color: secondaryText }}>当前步骤</div>
                <div className="text-xl font-bold" style={{ color: primaryBlue }}>{currentStep + 1} / {steps.length}</div>
              </div>
              <button onClick={handleReset} className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>重置</button>
              <button onClick={handleNext} disabled={currentStep >= steps.length - 1} className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50" style={{ backgroundColor: primaryBlue, color: 'white' }}>下一步</button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: primaryBlue }}>HTTP 请求响应完整流程</h3>
            <p className="text-base leading-relaxed mb-4 font-medium" style={{ color: textColor }}>
              HTTP（超文本传输协议）是用于客户端 - 服务器通信的应用层协议，采用请求 - 响应模型。以下是完整的通信过程：
            </p>
            <div className="space-y-3" style={{ color: textColor }}>
              <p className="text-sm leading-relaxed"><span style={{ color: primaryBlue, fontWeight: 600, fontSize: '15px' }}>1. 建立 TCP 连接：</span>在发送 HTTP 请求之前，客户端需要先与服务器建立 TCP 连接。这通过 TCP 三次握手完成：客户端发送 SYN 报文，服务器回复 SYN-ACK，客户端再回复 ACK。连接建立后，双方可以开始数据传输。</p>
              <p className="text-sm leading-relaxed"><span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: '15px' }}>2. 发送 HTTP 请求：</span>客户端构建 HTTP 请求报文，包括请求行（GET /index.html HTTP/1.1）、请求头（Host、User-Agent 等）和可选的请求体。GET 请求用于获取资源，是最常见的请求方法。</p>
              <p className="text-sm leading-relaxed"><span style={{ color: '#10b981', fontWeight: 600, fontSize: '15px' }}>3. 服务器处理并返回响应：</span>服务器收到请求后，解析请求报文，查找请求的资源（如/index.html 文件），然后构建 HTTP 响应报文。响应包括状态行（HTTP/1.1 200 OK）、响应头（Content-Type、Content-Length 等）和响应体（HTML 页面内容）。</p>
              <p className="text-sm leading-relaxed"><span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '15px' }}>4. 关闭连接：</span>在 HTTP/1.0 中，每次请求 - 响应后都会关闭 TCP 连接。而 HTTP/1.1 默认使用持久连接（Keep-Alive），可以在同一个连接上发送多个请求，减少连接建立的开销。</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: cardBg, borderColor: borderColor, minHeight: currentStep === 1 ? '700px' : '450px' }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
              </div>
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
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#6b7280' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>SYN</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>SYN+ACK</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>ACK</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: primaryBlue }} /><span className="text-xs font-semibold" style={{ color: textColor }}>GET</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs font-semibold" style={{ color: textColor }}>200 OK</span></div>
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
                    <div className="flex items-center gap-2 text-sm" style={{ color: secondaryText }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryText }} /><span>暂无 HTTP 报文</span></div>
                  ) : packetLogs.map((log, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2 last:mb-0">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: packetColors[log.type]?.start || '#64748b' }} />
                      <span className="text-sm font-semibold" style={{ color: textColor }}>{log.type} {log.from} → {log.to}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-4" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
                <h4 className="font-bold mb-3">连接状态</h4>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>客户端</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: statusColors[steps[currentStep].clientStatus] || '#6b7280', color: 'white' }}>
                        {steps[currentStep].clientStatus}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: secondaryText }}>Client Side</div>
                  </div>
                  <div className="p-3 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: textColor }}>服务器</span>
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: statusColors[steps[currentStep].serverStatus] || '#6b7280', color: 'white' }}>
                        {steps[currentStep].serverStatus}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: secondaryText }}>Server Side</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm" style={{ color: secondaryText }}>NetViz - 网络工程可视化平台 | HTTP 请求响应动画演示</div>
        </div>
      </footer>
    </div>
  );
}
