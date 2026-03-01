"use client";
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { register as registerUser, isAuthenticated, getBaseUrl, RegisterRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { BarChart3 } from 'lucide-react'

const registerSchema = z.object({
  username: z.string().min(3, 'Минимум 3 символа').max(50, 'Максимум 50 символов'),
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const baseUrl = getBaseUrl()

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  useEffect(() => {
    if (isAuthenticated()) {
      router.push(baseUrl + '/dashboard')
    }
  }, [router, baseUrl])

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const registerData: RegisterRequest = {
        username: data.username,
        email: data.email,
        password: data.password,
      }
      await registerUser(registerData)
      toast({ title: 'Успешная регистрация', description: 'Ожидайте одобрения администратора' })
      router.push(baseUrl + '/login')
    } catch (err) {
      setError('root', { 
        message: err instanceof Error ? err.message : 'Ошибка регистрации' 
      })
    }
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="flex items-center justify-center size-12 rounded-xl bg-orange-500 dark:bg-orange-600">
            <BarChart3 className="size-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-xl">Регистрация</CardTitle>
        <p className="text-sm text-muted-foreground">
          Создайте аккаунт для доступа к системе
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
              placeholder="Придумайте логин"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@mail.ru"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="Минимум 8 символов"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Повторите пароль</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Повторите пароль"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button
            className="w-full cursor-pointer bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <a href="/login" className="text-orange-500 dark:text-orange-400 hover:underline cursor-pointer font-medium">
              Войти
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
