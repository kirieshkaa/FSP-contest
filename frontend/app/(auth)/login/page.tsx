"use client";
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login, isAuthenticated, getBaseUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

const loginSchema = z.object({
  username: z.string().min(1, 'Логин обязателен'),
  password: z.string().min(1, 'Пароль обязателен'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const baseUrl = getBaseUrl()

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (isAuthenticated()) {
      router.push(baseUrl + '/dashboard')
    }
  }, [router, baseUrl])

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data.username, data.password)
      if (result.role === 'admin') {
        router.push(baseUrl + '/admin')
      } else {
        router.push(baseUrl + '/dashboard')
      }
    } catch (err) {
      setError('root', { 
        message: err instanceof Error ? err.message : 'Ошибка входа' 
      })
    }
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="flex items-center justify-center size-12 rounded-xl bg-emerald-500 dark:bg-emerald-600">
            <BarChart3 className="size-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-xl">Вход в систему</CardTitle>
        <p className="text-sm text-muted-foreground">
          Введите данные для входа
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.root.message}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">Логин</Label>
            <Input
              id="username"
              type="text"
              placeholder="Введите логин"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="Введите пароль"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          <Button
            className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Вход...' : 'Войти'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <a href="/register" className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium">
              Зарегистрироваться
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
