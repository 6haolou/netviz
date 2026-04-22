"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getCategoryById, categories } from '@/lib/categories';

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const unwrappedParams = use(params);
  const category = getCategoryById(unwrappedParams.category);
  
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      setIsDarkMode(savedMode ? savedMode === 'true' : false);
    }
  }, []);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">分类不存在</h1>
          <Link href="/" className="text-blue-500 hover:underline">返回主页</Link>
        </div>
      </div>
    );
  }

  const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff';
  const textColor = isDarkMode ? '#ededed' : '#171717';
  const secondaryTextColor = isDarkMode ? '#9ca3af' : '#6b7280';
  const cardBgColor = isDarkMode ? '#1f2937' : '#ffffff';
  const borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
  const primaryBlue = '#3b82f6';

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: bgColor, color: textColor }}>
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: bgColor, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', color: textColor }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">返回主页</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryBlue }}>{category.title}</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 分类描述 */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>{category.title}</h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: secondaryTextColor }}>{category.description}</p>
          </div>

          {/* 协议网格 - 一排 3 个 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {category.protocols.map((item, index) => (
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
      </main>

      {/* 页脚 */}
      <footer className="border-t py-12" style={{ backgroundColor: bgColor, borderColor: borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p style={{ color: secondaryTextColor }}>
              NetViz - 网络工程可视化平台 | 让网络学习更简单
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
