"use client";
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { register, isAuthenticated, getBaseUrl } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className={`theme-toggle fixed top-5 right-5 z-50 w-11 h-11 rounded-full border border-white/30 bg-white/10 backdrop-blur text-white flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110 ${className}`} aria-label="Переключить тему">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      className={`theme-toggle fixed top-5 right-5 z-50 w-11 h-11 rounded-full border border-white/30 bg-white/10 backdrop-blur text-white flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110 ${className}`}
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

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const baseUrl = getBaseUrl()

  useEffect(() => {
    if (isAuthenticated()) {
      router.push(baseUrl + '/dashboard')
    }
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }

    setLoading(true)

    try {
      await register({ username, email, password })
      toast({ title: 'Успешная регистрация', description: 'Ожидайте одобрения администратора' })
      router.push(baseUrl + '/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 p-6 relative">
      <ThemeToggle />

      <section className="w-full max-w-md bg-white/95 dark:bg-slate-800/90 rounded-xl shadow-xl p-6">
        <h2 className="text-xl font-semibold mb-4 text-center">РЕГИСТРАЦИЯ</h2>
        <form onSubmit={onSubmit}>
          {error && (
            <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
          <div className="mb-3">
            <label className="block text-xs uppercase tracking-wide mb-1">ЛОГИН</label>
            <input 
              className="w-full px-3 py-2 rounded border" 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Придумайте логин" 
              required 
              minLength={3}
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs uppercase tracking-wide mb-1">EMAIL</label>
            <input 
              className="w-full px-3 py-2 rounded border" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="example@mail.ru" 
              required 
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs uppercase tracking-wide mb-1">ПАРОЛЬ</label>
            <input 
              className="w-full px-3 py-2 rounded border" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Минимум 8 символов" 
              required 
              minLength={8}
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs uppercase tracking-wide mb-1">ПОВТОРИТЕ ПАРОЛЬ</label>
            <input 
              className="w-full px-3 py-2 rounded border" 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Повторите пароль" 
              required 
            />
          </div>
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50 mb-3" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Уже есть аккаунт? </span>
            <a href="/login" className="text-blue-600 hover:underline">Войти</a>
          </div>
        </form>
      </section>
    </div>
  )
}
