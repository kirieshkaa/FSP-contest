"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { getUserProfile, updateEmail, changePassword, logout, isAuthenticated, getBaseUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { BarChart3, LogOut, User, Mail, Lock, Calendar, Shield } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordForEmail, setPasswordForEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

const baseUrl = getBaseUrl()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(baseUrl + '/login')
      return
    }
    loadProfile()
  }, [router])

  const loadProfile = async () => {
    try {
      const data = await getUserProfile()
      setProfile(data)
      setEmail('')
      setIsAdmin(localStorage.getItem('user_role') === 'admin')
    } catch (err) {
      console.error('Failed to load profile:', err)
      toast({ title: 'Ошибка', description: 'Не удалось загрузить профиль', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    
    if (!email) {
      setEmailError('Введите новый email')
      return
    }

    if (!passwordForEmail) {
      setEmailError('Введите пароль для подтверждения')
      return
    }

    setEmailLoading(true)
    try {
      await updateEmail(email, passwordForEmail)
      setEmail('')
      setPasswordForEmail('')
      await loadProfile()
      toast({ title: 'Успешно', description: 'Email обновлён' })
    } catch (err: any) {
      setEmailError(err?.message || 'Не удалось обновить email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Все поля обязательны')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Пароль должен быть не менее 8 символов')
      return
    }

    setPasswordLoading(true)
    try {
      await changePassword(oldPassword, newPassword)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({ title: 'Успешно', description: 'Пароль изменён' })
    } catch (err: any) {
      setPasswordError(err?.message || 'Не удалось изменить пароль')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push(baseUrl + '/login')
  }

  const goToDashboard = () => {
    router.push(baseUrl + '/dashboard')
  }

  const goToAdmin = () => {
    router.push(baseUrl + '/admin')
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Одобрен'
      case 'pending': return 'Ожидает'
      case 'rejected': return 'Отклонён'
      case 'blocked': return 'Заблокирован'
      default: return status
    }
  }

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Администратор' : 'Пользователь'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goToDashboard} className="cursor-pointer">
              <BarChart3 className="size-5" />
            </Button>
            <h1 className="text-xl font-semibold">Профиль</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToDashboard} className="gap-2 cursor-pointer">
              <BarChart3 className="size-4" />
              Прогноз
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={goToAdmin} className="gap-2 cursor-pointer">
                <Shield className="size-4" />
                Админ
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 cursor-pointer">
              <LogOut className="size-4" />
              Выйти
            </Button>
            <ThemeToggle variant="embedded" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <motion.div 
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          >
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Информация о пользователе
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Имя пользователя</p>
                  <p className="font-medium">{profile?.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Роль</p>
                  <p className="font-medium">{getRoleLabel(profile?.role)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <p className="font-medium">{getStatusLabel(profile?.status)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Дата регистрации</p>
                <p className="font-medium">{new Date(profile?.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-5" />
                  Изменить email
                </CardTitle>
              </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="current-email" className="mb-2 ml-1">Текущий email</Label>
                  <Input
                    id="current-email"
                    type="email"
                    value={profile?.email_masked || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="new-email" className="mb-2 ml-1">Новый email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="newemail@mail.ru"
                  />
                </div>
                <div>
                  <Label htmlFor="email-password" className="mb-2 ml-1">Подтвердите паролем</Label>
                  <Input
                    id="email-password"
                    type="password"
                    value={passwordForEmail}
                    onChange={(e) => setPasswordForEmail(e.target.value)}
                    placeholder="Ваш пароль"
                  />
                  {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
                </div>
                <Button type="submit" disabled={emailLoading}>
                  {emailLoading ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </form>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5" />
                  Изменить пароль
                </CardTitle>
              </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="old-password" className="mb-2 ml-1">Текущий пароль</Label>
                  <Input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-password" className="mb-2 ml-1">Новый пароль</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password" className="mb-2 ml-1">Подтвердите пароль</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
                </div>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? 'Сохранение...' : 'Изменить пароль'}
                </Button>
              </form>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
