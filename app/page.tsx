"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode !== null) {
        const darkMode = savedMode === 'true';
        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        setIsDarkMode(darkMode);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        }
        setIsDarkMode(prefersDark);
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const context = ctx;
    const canvasEl = canvas;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const W = canvas.width;
    const H = canvas.height;

    const pcX = W * 0.15, pcY = H * 0.5;
    const swX = W * 0.35, swY = H * 0.5;
    const rtX = W * 0.53, rtY = H * 0.5;
    const clX = W * 0.72, clY = H * 0.45;
    const svX = W * 0.88, svY = H * 0.5;

    const outPkts: { progress: number; done: boolean }[] = [];
    const inPkts: { progress: number; done: boolean }[] = [];

    function spawn() { outPkts.push({ progress: 0, done: false }); }
    setInterval(spawn, 2500);

    const outPath = [{ x: pcX, y: pcY }, { x: swX, y: swY }, { x: rtX, y: rtY }, { x: clX, y: clY }, { x: svX, y: svY }];
    const inPath = [...outPath].reverse();

    function animate() {
      const W2 = canvasEl.width, H2 = canvasEl.height;
      context.clearRect(0, 0, W2, H2);

      const isDark = document.documentElement.classList.contains('dark');
      const lineColor = isDark ? '#374151' : '#e5e7eb';
      const textCol = isDark ? '#9ca3af' : '#6b7280';

      // Connections
      context.strokeStyle = lineColor; context.lineWidth = 2; context.setLineDash([5, 5]);
      const conns = [
        [pcX + 35, pcY, swX - 25, swY],
        [swX + 25, swY, rtX - 25, rtY],
        [rtX + 25, rtY, clX - 35, clY - 5],
        [clX + 35, clY + 5, svX - 20, svY],
      ];
      conns.forEach(c2 => { context.beginPath(); context.moveTo(c2[0], c2[1]); context.lineTo(c2[2], c2[3]); context.stroke(); });
      context.setLineDash([]);

      // PC
      context.fillStyle = isDark ? '#1f2937' : '#e2e8f0';
      context.beginPath(); context.roundRect(pcX - 22, pcY - 18, 44, 30, 4); context.fill();
      context.fillStyle = isDark ? '#0f172a' : '#f8fafc';
      context.beginPath(); context.roundRect(pcX - 18, pcY - 13, 36, 20, 2); context.fill();
      context.fillStyle = '#ef4444'; context.beginPath(); context.arc(pcX - 13, pcY - 8, 1.5, 0, 2 * 3.14); context.fill();
      context.fillStyle = '#f59e0b'; context.beginPath(); context.arc(pcX - 9, pcY - 8, 1.5, 0, 2 * 3.14); context.fill();
      context.fillStyle = '#22c55e'; context.beginPath(); context.arc(pcX - 5, pcY - 8, 1.5, 0, 2 * 3.14); context.fill();
      context.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
      context.beginPath(); context.roundRect(pcX - 14, pcY - 3, 28, 4, 2); context.fill();
      context.fillStyle = isDark ? '#64748b' : '#94a3b8';
      context.font = '3px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText('netviz.io', pcX, pcY);
      context.fillStyle = isDark ? '#374151' : '#cbd5e1';
      context.fillRect(pcX - 2, pcY + 12, 4, 3); context.fillRect(pcX - 7, pcY + 15, 14, 2);
      context.fillStyle = textColor;
      context.font = 'bold 10px Inter, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'top';
      context.fillText('PC', pcX, pcY + 20);

      // Switch
      context.fillStyle = isDark ? '#1e293b' : '#cbd5e1';
      context.beginPath(); context.roundRect(swX - 18, swY - 8, 36, 16, 3); context.fill();
      for (let i = 0; i < 4; i++) { context.fillStyle = '#22c55e'; context.beginPath(); context.arc(swX - 10 + i * 7, swY, 1.2, 0, 2 * 3.14); context.fill(); }
      context.fillStyle = textColor;
      context.font = 'bold 8px Inter, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'top';
      context.fillText('Switch', swX, swY + 10);

      // Router
      context.fillStyle = isDark ? '#1e293b' : '#cbd5e1';
      context.beginPath(); context.roundRect(rtX - 20, rtY - 10, 40, 20, 4); context.fill();
      context.strokeStyle = lineColor; context.lineWidth = 1.5;
      context.beginPath(); context.moveTo(rtX + 4, rtY - 10); context.lineTo(rtX + 10, rtY - 22); context.stroke();
      context.fillStyle = '#22c55e'; context.beginPath(); context.arc(rtX + 10, rtY - 25, 2.5, 0, 2 * 3.14); context.fill();
      context.fillStyle = isDark ? '#334155' : '#94a3b8';
      for (let i = 0; i < 3; i++) context.fillRect(rtX - 13, rtY - 3 + i * 5, 26, 2);
      context.fillStyle = textColor;
      context.font = 'bold 8px Inter, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'top';
      context.fillText('Router', rtX, rtY + 12);

      // Cloud
      context.fillStyle = isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.08)';
      context.beginPath(); context.arc(clX - 18, clY + 4, 16, 0, 2 * 3.14); context.fill();
      context.beginPath(); context.arc(clX + 4, clY - 5, 18, 0, 2 * 3.14); context.fill();
      context.beginPath(); context.arc(clX + 18, clY + 4, 14, 0, 2 * 3.14); context.fill();
      context.beginPath(); context.arc(clX + 4, clY + 8, 14, 0, 2 * 3.14); context.fill();
      context.strokeStyle = isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'; context.lineWidth = 1; context.stroke();
      context.fillStyle = isDark ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.5)';
      context.font = 'bold 9px Inter, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText('☁ Internet', clX + 4, clY + 4);

      // Server
      context.fillStyle = isDark ? '#1e293b' : '#cbd5e1';
      context.beginPath(); context.roundRect(svX - 14, svY - 22, 28, 44, 3); context.fill();
      context.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
      context.fillRect(svX - 11, svY - 16, 22, 6); context.fillRect(svX - 11, svY - 8, 22, 6); context.fillRect(svX - 11, svY, 22, 6);
      context.fillStyle = '#22c55e'; context.beginPath(); context.arc(svX + 10, svY - 13, 1.5, 0, 2 * 3.14); context.fill();
      context.fillStyle = '#3b82f6';
      context.font = 'bold 7px Inter, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText('NetViz', svX, svY + 14);
      context.fillStyle = textColor;
      context.font = 'bold 8px Inter, sans-serif'; context.textBaseline = 'top';
      context.fillText('Server', svX, svY + 20);

      // Outbound packets
      outPkts.forEach((p) => {
        if (p.done) return; p.progress += 0.006;
        if (p.progress >= 1) { inPkts.push({ progress: 0, done: false }); p.done = true; return; }
        const total = outPath.length - 1, seg = Math.min(Math.floor(p.progress * total), total - 1);
        const sp = (p.progress * total) - seg;
        const from = outPath[seg], to = outPath[seg + 1];
        const px = from.x + (to.x - from.x) * sp, py = from.y + (to.y - from.y) * sp;
        const g = context.createRadialGradient(px, py, 0, px, py, 10);
        g.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); g.addColorStop(1, 'transparent');
        context.fillStyle = g; context.beginPath(); context.arc(px, py, 10, 0, 2 * 3.14); context.fill();
        context.fillStyle = '#3b82f6'; context.beginPath(); context.roundRect(px - 6, py - 3, 12, 6, 2); context.fill();
        context.fillStyle = 'white'; context.font = 'bold 3px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle';
        context.fillText('GET', px, py);
      });

      // Inbound packets
      inPkts.forEach((p) => {
        if (p.done) return; p.progress += 0.006;
        if (p.progress >= 1) { p.done = true; return; }
        const total = inPath.length - 1, seg = Math.min(Math.floor(p.progress * total), total - 1);
        const sp = (p.progress * total) - seg;
        const from = inPath[seg], to = inPath[seg + 1];
        const px = from.x + (to.x - from.x) * sp, py = from.y + (to.y - from.y) * sp;
        const g = context.createRadialGradient(px, py, 0, px, py, 10);
        g.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); g.addColorStop(1, 'transparent');
        context.fillStyle = g; context.beginPath(); context.arc(px, py, 10, 0, 2 * 3.14); context.fill();
        context.fillStyle = '#10b981'; context.beginPath(); context.roundRect(px - 6, py - 3, 12, 6, 2); context.fill();
        context.fillStyle = 'white'; context.font = 'bold 3px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle';
        context.fillText('200', px, py);
      });

      context.fillStyle = textCol;
      context.font = '10px Inter, sans-serif'; context.textAlign = 'center';
      context.fillText('PC  Switch  Router  Internet  Server', W2 / 2, H2 - 8);

      requestAnimationFrame(animate);
    }

    animate();
    const handleResize = () => {};  }, []);

  const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff';
  const textColor = isDarkMode ? '#ededed' : '#171717';
  const secondaryTextColor = isDarkMode ? '#9ca3af' : '#6b7280';
  const cardBgColor = isDarkMode ? '#1f2937' : '#ffffff';
  const borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
  const featureSectionBg = isDarkMode ? '#111827' : '#f9fafb';
  const headerBg = isDarkMode ? '#0a0a0a' : '#ffffff';
  const headerBorder = isDarkMode ? '#1e1e1e' : '#e5e7eb';
  const primaryBlue = '#3b82f6';
  const glassBg = '#3b82f6';

  return (
    <div ref={bgRef} className="relative min-h-screen font-sans" style={{ backgroundColor: bgColor, color: textColor }} onMouseMove={handleMouseMove}>
      {/* Mouse spotlight glow */}
      <div className="fixed pointer-events-none z-0" style={{
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: isDarkMode ? 'radial-gradient(circle, rgba(102,126,234,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(102,126,234,0.04) 0%, transparent 70%)',
        left: mousePos.x - 300,
        top: mousePos.y - 300,
        transition: 'left 0.3s ease-out, top 0.3s ease-out',
      }} />
      {/* Floating orbs - only in dark mode */}
      {isDarkMode && (
        <>
          <div className="glass-orb" style={{ width: '400px', height: '400px', top: '-10%', left: '-5%', background: 'linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.1))', filter: 'blur(60px)', animation: 'float 20s ease-in-out infinite' }} />
          <div className="glass-orb" style={{ width: '350px', height: '350px', top: '40%', right: '-8%', background: 'linear-gradient(135deg, rgba(118,75,162,0.25), rgba(246,211,101,0.08))', filter: 'blur(50px)', animation: 'float 25s ease-in-out infinite 5s' }} />
          <div className="glass-orb" style={{ width: '300px', height: '300px', bottom: '5%', left: '10%', background: 'linear-gradient(135deg, rgba(102,126,234,0.2), rgba(246,211,101,0.05))', filter: 'blur(55px)', animation: 'float 22s ease-in-out infinite 10s' }} />
        </>
      )}

      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          borderBottom: '1px solid ' + (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)'),
        }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white' }}>N</div>
              <div>
                <div className="text-base font-bold leading-tight" style={{ color: isDarkMode ? '#ffffff' : '#171717' }}>NetViz</div>
                <div className="text-xs leading-tight" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>网络工程可视化</div>
              </div>
            </Link>

            {/* 导航 */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: '传输层', href: '/category/transport' },
                { label: '应用层', href: '/category/application' },
                { label: '网络层', href: '/category/network' },
                { label: '路由协议', href: '/category/routing' },
                { label: '高可用性', href: '/category/availability' },
              ].map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#667eea'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'; }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="搜索协议..."
                className="glass-input w-44"
              />
              <button
                onClick={toggleDarkMode}
                className="glass-btn w-9 h-9 flex items-center justify-center rounded-xl p-0"
                style={{ border: '1px solid ' + (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)') }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: isDarkMode ? '#fbbf24' : '#667eea' }}>
                  {isDarkMode ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6" style={{ color: textColor }}>
              网络工程可视化平台
            </h1>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: secondaryTextColor }}>
              通过交互式动画，直观理解网络协议、报文交互和网络拓扑，让复杂的网络知识变得简单易懂
            </p>
            <div className="mt-10 flex justify-center space-x-6">
              <Link
                href="#protocols"
                className="glass-btn px-8 py-3 rounded-xl"
              >
                开始探索
              </Link>
              <Link
                href="#features"
                className="glass-btn px-8 py-3 rounded-xl"
              >
                了解更多
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div
                className="glass-strong h-96 rounded-2xl overflow-hidden"
              >
                <canvas ref={canvasRef} className="w-full h-full"></canvas>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold mb-6" style={{ color: textColor }}>
                直观理解网络工程
              </h2>
              <p className="mb-8" style={{ color: secondaryTextColor }}>
                我们的平台通过生动的动画和交互式界面，帮助您理解网络协议的工作原理、报文的传输过程以及网络拓扑的构建方式。无论您是网络工程师、学生还是对网络技术感兴趣的爱好者，都能从中获益。
              </p>
              <div className="space-y-4">
                {[
                  '生动的动画展示网络协议的工作原理',
                  '交互式界面，支持自定义参数',
                  '详细的报文结构解析',
                  '支持多种网络协议和拓扑结构'
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div
                      className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: primaryBlue }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3" style={{ color: secondaryTextColor }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24" style={{ backgroundColor: featureSectionBg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ color: textColor }}>
              按领域探索
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: secondaryTextColor }}>
              我们的平台涵盖了网络工程的多个领域，从传输层到应用层，从路由协议到高可用性，应有尽有
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {[
              { title: '传输层', desc: '了解 TCP 三次握手、四次挥手等传输层协议的工作原理', href: '/category/transport', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
              { title: '应用层', desc: '了解 HTTP、DNS 等应用层协议如何为用户提供服务', href: '/category/application', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
              { title: '网络层', desc: '学习 IP、ARP、ICMP 等网络层协议的工作原理', href: '/category/network', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
              { title: '路由协议', desc: '学习 OSPF、BGP、RIP 等路由协议的工作原理和配置方法', href: '/category/routing', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { title: '高可用性', desc: '了解 VRRP、STP、MSTP 等协议如何实现网络的高可用性', href: '/category/availability', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="group rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: cardBgColor }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-blue-500"
                  style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: primaryBlue }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300" style={{ color: textColor }}>
                  {item.title}
                </h3>
                <p style={{ color: secondaryTextColor }}>{item.desc}</p>
                <div className="mt-4 flex items-center" style={{ color: primaryBlue }}>
                  <span className="mr-1">探索</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="protocols" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ color: textColor }}>
              协议动画
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: secondaryTextColor }}>
              通过生动的动画展示网络协议的工作原理，让复杂的概念变得简单易懂
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'TCP 协议', desc: '了解 TCP 三次握手、四次挥手和流量控制的工作原理', href: '/protocol/tcp', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
              { title: 'HTTP 协议', desc: '了解 HTTP 请求 - 响应流程、方法和状态码', href: '/protocol/http', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
              { title: 'DNS 协议', desc: '了解 DNS 域名解析的工作原理和查询过程', href: '/protocol/dns', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
              { title: 'IP 协议', desc: '了解 IP 协议的工作原理、子网掩码和路由', href: '/protocol/ip', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
              { title: 'ARP 协议', desc: '了解 ARP 地址解析协议的工作原理', href: '/protocol/arp', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
              { title: 'ICMP 协议', desc: '了解 ICMP 协议的工作原理和 ping 命令', href: '/protocol/icmp', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { title: 'OSPF 协议', desc: '了解 OSPF 开放式最短路径优先协议的工作原理', href: '/protocol/ospf', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { title: 'BGP 协议', desc: '了解 BGP 边界网关协议的工作原理和路径矢量', href: '/protocol/bgp', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { title: 'RIP 协议', desc: '了解 RIP 路由信息协议的距离矢量算法', href: '/protocol/rip', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { title: 'VRRP 协议', desc: '了解 VRRP 虚拟路由器冗余协议的工作原理', href: '/protocol/vrrp', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { title: 'MSTP 协议', desc: '了解 MSTP 多实例生成树协议的负载均衡', href: '/protocol/mstp', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
              { title: 'STP 协议', desc: '了解 STP 生成树协议如何防止网络环路', href: '/protocol/stp', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' }
            ].map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: cardBgColor }}
              >
                <div
                  className="h-48 flex items-center justify-center"
                  style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: primaryBlue }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300" style={{ color: textColor }}>
                    {item.title}
                  </h3>
                  <p className="mb-4" style={{ color: secondaryTextColor }}>{item.desc}</p>
                  <div className="flex items-center" style={{ color: primaryBlue }}>
                    <span className="mr-1">查看动画</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t" style={{ borderColor: borderColor, backgroundColor: bgColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p style={{ color: secondaryTextColor }}>
              NetViz - 网络工程可视化平台 | 让网络学习更简单
            </p>
            <p className="mt-2" style={{ color: secondaryTextColor }}>
              Built with Next.js + Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}