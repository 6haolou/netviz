"use client";

import { useEffect, useRef } from 'react';

interface DarkModeToggleProps {
  className?: string;
}

export function DarkModeToggle({ className = '' }: DarkModeToggleProps) {
  const isDarkModeRef = useRef(false);

  // 检查当前是否为深色模式
  const isDarkMode = () => {
    return isDarkModeRef.current;
  };

  // 切换深色/浅色模式
  const toggleDarkMode = () => {
    const newMode = !isDarkModeRef.current;
    
    // 确保在客户端环境中执行
    if (typeof window !== 'undefined') {
      // 直接修改 document.documentElement 的 className
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // 保存用户偏好到 localStorage
      localStorage.setItem('darkMode', newMode.toString());
      
      // 更新 ref
      isDarkModeRef.current = newMode;
    }
  };

  // 在组件挂载时初始化深色模式
  useEffect(() => {
    // 只在客户端环境中执行
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode !== null) {
        const darkMode = savedMode === 'true';
        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        isDarkModeRef.current = darkMode;
      } else {
        // 默认为系统偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        isDarkModeRef.current = prefersDark;
      }
    }
  }, []);

  return (
    <button 
      onClick={toggleDarkMode}
      className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {isDarkMode() ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        )}
      </svg>
    </button>
  );
}