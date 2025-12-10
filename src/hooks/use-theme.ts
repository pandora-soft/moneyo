import React, { useState, useLayoutEffect } from 'react';
// Moved initializer function outside the component to ensure it's a pure function
// and to avoid potential issues with React StrictMode's double invocation.
const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    // Fallback in case of any storage access errors
    return false;
  }
};
export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(getInitialTheme);
  useLayoutEffect(() => {
    // This effect runs synchronously after every render, but the dependency array
    // ensures it only executes its logic when `isDark` changes.
    // This is safe and does not change hook order.
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [isDark]);
  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };
  return { isDark, toggleTheme };
}