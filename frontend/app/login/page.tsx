"use client";
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className={`theme-toggle ${className}`} aria-label="Переключить тему">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Переключить тему"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      )}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim() && password.trim()) {
      router.push('/dashboard')
    } else {
      alert('Пожалуйста, введите Email и пароль')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 p-6 relative">
      <ThemeToggle className="theme-toggle-login" />

      <style jsx>{`
        .theme-toggle-login {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 100;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .theme-toggle-login:hover {
          background: rgba(255,255,255,0.2);
          transform: scale(1.1);
        }
      `}</style>

      <section className="w-full max-w-md bg-white/95 dark:bg-slate-800/90 rounded-xl shadow-xl p-6">
        <h2 className="text-xl font-semibold mb-4 text-center">ВОЙТИ В СИСТЕМУ</h2>
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="block text-xs uppercase tracking-wide mb-1">EMAIL</label>
            <input className="w-full px-3 py-2 rounded border" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="user@example.com" required />
          </div>
          <div className="mb-3">
            <label className="block text-xs uppercase tracking-wide mb-1">ПАРОЛЬ</label>
            <input className="w-full px-3 py-2 rounded border" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2" type="submit">Войти</button>
        </form>
      </section>
    </div>
  )
}
