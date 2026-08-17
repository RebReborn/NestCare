'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8" />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:text-stone-300 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 active-press transition-all"
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 fill-amber-400/20" />
      ) : (
        <Moon className="h-4 w-4 text-stone-600" />
      )}
    </button>
  );
}

export function ThemeSettingsControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { key: 'light', label: 'Light', icon: Sun },
        { key: 'dark', label: 'Dark', icon: Moon },
        { key: 'system', label: 'System', icon: Laptop },
      ].map((mode) => {
        const Icon = mode.icon;
        const active = theme === mode.key;
        return (
          <button
            key={mode.key}
            onClick={() => setTheme(mode.key)}
            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all active-press ${
              active
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
