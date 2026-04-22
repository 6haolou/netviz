"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [isOsiOpen, setIsOsiOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const nodes = [
      { x: 100, y: 150, size: 20, color: '#3b82f6' },
      { x: 300, y: 100, size: 20, color: '#3b82f6' },
      { x: 300, y: 200, size: 20, color: '#3b82f6' },
      { x: 500, y: 150, size: 20, color: '#3b82f6' }
    ];

    const connections = [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 3 }
    ];

    const packets: any[] = [];

    function createPacket() {
      const from = Math.floor(Math.random() * nodes.length);
      let to;
      do {
        to = Math.floor(Math.random() * nodes.length);
      } while (to === from);

      packets.push({
        from,
        to,
        progress: 0,
        speed: 0.01 + Math.random() * 0.02
      });
    }

    const interval = setInterval(createPacket, 1000);

    function animate() {
      context.clearRect(0, 0, canvasEl.width, canvasEl.height);

      const isDark = document.documentElement.classList.contains('dark');
      const lineColor = isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)';
      const glowColor = isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)';
      const borderColor = isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.5)';

      connections.forEach(conn => {
        const from = nodes[conn.from];
        const to = nodes[conn.to];

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = lineColor;
        context.lineWidth = 2;
        context.stroke();
      });

      nodes.forEach(node => {
        context.beginPath();
        context.arc(node.x, node.y, node.size + 10, 0, Math.PI * 2);
        context.fillStyle = glowColor;
        context.fill();

        context.beginPath();
        context.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        context.fillStyle = node.color;
        context.fill();

        context.beginPath();
        context.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        context.strokeStyle = borderColor;
        context.lineWidth = 2;
        context.stroke();
      });

      packets.forEach((packet, index) => {
        const from = nodes[packet.from];
        const to = nodes[packet.to];

        const x = from.x + (to.x - from.x) * packet.progress;
        const y = from.y + (to.y - from.y) * packet.progress;

        context.beginPath();
        context.arc(x, y, 8, 0, Math.PI * 2);
        context.fillStyle = 'rgba(59, 130, 246, 0.6)';
        context.fill();

        context.beginPath();
        context.arc(x, y, 4, 0, Math.PI * 2);
        context.fillStyle = '#3b82f6';
        context.fill();

        packet.progress += packet.speed;
        if (packet.progress > 1) {
          packets.splice(index, 1);
        }
      });

      requestAnimationFrame(animate);
    }

    animate();

    return () => clearInterval(interval);
  }, []);

  const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff';
  const textColor = isDarkMode ? '#ededed' : '#171717';
  const secondaryTextColor = isDarkMode ? '#9ca3af' : '#6b7280';
  const cardBgColor = isDarkMode ? '#1f2937' : '#ffffff';
  const borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
  const featureSectionBg = isDarkMode ? '#111827' : '#f9fafb';
  const headerBg = isDarkMode ? '#0a0a0a' : '#ffffff';
  const headerBorder = isDarkMode ? '#1e1e1e' : '#e5e7eb';
  const primaryBlue = '#3b82f6';

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: bgColor, color: textColor }}>
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: headerBg, borderColor: headerBorder }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo 和平台名称 - 固定在左上角 */}
            <Link href="/" className="flex items-center flex-shrink-0">
              <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>NetViz</h1>
              <span className="ml-2 text-lg" style={{ color: secondaryTextColor }}>网络工程可视化</span>
            </Link>

            {/* 导航栏按钮 */}
            <nav className="hidden md:flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setIsOsiOpen(!isOsiOpen)}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ 
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = primaryBlue;
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                    e.currentTarget.style.color = isDarkMode ? '#d1d5db' : '#374151';
                  }}
                >
                  <span>OSI 七层模型</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOsiOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-48 rounded-md shadow-lg py-2 z-50 border"
                    style={{ backgroundColor: cardBgColor, borderColor: borderColor }}
                  >
                    {['物理层', '数据链路层', '网络层', '传输层', '会话层', '表示层', '应用层'].map((layer) => (
                      <Link
                        key={layer}
                        href="#"
                        className="block px-4 py-2 transition-colors duration-300 hover:bg-blue-50 dark:hover:bg-gray-700"
                        style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}
                      >
                        {layer}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/category/routing"
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
                style={{ 
                  color: isDarkMode ? '#d1d5db' : '#374151',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = primaryBlue;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = isDarkMode ? '#d1d5db' : '#374151';
                }}
              >
                路由协议
              </Link>
              <Link
                href="/category/availability"
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
                style={{ 
                  color: isDarkMode ? '#d1d5db' : '#374151',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = primaryBlue;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = isDarkMode ? '#d1d5db' : '#374151';
                }}
              >
                高可用性
              </Link>
              <Link
                href="#"
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
                style={{ 
                  color: isDarkMode ? '#d1d5db' : '#374151',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = primaryBlue;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = isDarkMode ? '#d1d5db' : '#374151';
                }}
              >
                网络安全
              </Link>
              <Link
                href="#"
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
                style={{ 
                  color: isDarkMode ? '#d1d5db' : '#374151',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = primaryBlue;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = isDarkMode ? '#d1d5db' : '#374151';
                }}
              >
                网络管理
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="搜索动画..."
                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                style={{
                  borderColor: borderColor,
                  backgroundColor: cardBgColor,
                  color: textColor
                }}
              />
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-md transition-colors duration-300"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#1f2937' : '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}>
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
                className="px-8 py-3 font-medium rounded-lg transition-colors duration-300"
                style={{ backgroundColor: primaryBlue, color: '#ffffff' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = primaryBlue}
              >
                开始探索
              </Link>
              <Link
                href="#features"
                className="px-8 py-3 border font-medium rounded-lg transition-colors duration-300"
                style={{ borderColor: borderColor, backgroundColor: 'transparent', color: textColor }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#1f2937' : '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                了解更多
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div
                className="h-96 rounded-2xl shadow-lg overflow-hidden"
                style={{ backgroundColor: cardBgColor }}
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
              我们的平台涵盖了网络工程的多个领域，从基础的OSI七层模型到高级的路由协议，应有尽有
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {[
              { title: 'OSI 七层模型', desc: '了解网络通信的七层模型，从物理层到应用层的完整架构', href: '#', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
              { title: '路由协议', desc: '学习 OSPF、BGP、RIP 等路由协议的工作原理和配置方法', href: '/category/routing', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { title: '高可用性', desc: '了解 VRRP、MSTP 等协议如何实现网络的高可用性', href: '/category/availability', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { title: '网络安全', desc: '学习网络安全基础知识，包括防火墙、VPN 和加密协议', href: '#', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
              { title: '网络管理', desc: '了解网络管理工具和技术，包括 SNMP、NetFlow 等', href: '#', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }
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