"use client";
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { mockUsers } from '@/lib/mock-data'
import type { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ArrowLeft, Users, Moon, Sun } from 'lucide-react'

function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className={`fixed top-5 right-5 z-50 w-11 h-11 rounded-full border border-white/30 bg-white/10 backdrop-blur text-white flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110 active:scale-95 ${className}`} aria-label="Переключить тему">
        <Moon className="w-5 h-5 animate-pulse" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      className={`fixed top-5 right-5 z-50 w-11 h-11 rounded-full border border-white/30 bg-white/10 backdrop-blur text-white flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110 active:scale-95 ${className}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Переключить тему"
    >
      <div className="relative w-5 h-5">
        <span className={`absolute inset-0 transition-all duration-500 ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}>
          <Moon className="w-5 h-5" />
        </span>
        <span className={`absolute inset-0 transition-all duration-500 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}>
          <Sun className="w-5 h-5" />
        </span>
      </div>
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })

  useEffect(() => {
    const storedAdmin = localStorage.getItem('isAdmin')
    if (storedAdmin === 'true') {
      setIsAdmin(true)
      const storedUsers = localStorage.getItem('users')
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers))
      } else {
        setUsers(mockUsers)
        localStorage.setItem('users', JSON.stringify(mockUsers))
      }
    }
  }, [])

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers)
    localStorage.setItem('users', JSON.stringify(newUsers))
  }

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      const newUsers = users.filter(u => u.id !== id)
      saveUsers(newUsers)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, password: user.password })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (!editingUser) return
    const newUsers = users.map(u => 
      u.id === editingUser.id 
        ? { ...u, name: formData.name, email: formData.email, password: formData.password }
        : u
    )
    saveUsers(newUsers)
    setEditDialogOpen(false)
    setEditingUser(null)
  }

  const handleAdd = () => {
    setFormData({ name: '', email: '', password: '' })
    setAddDialogOpen(true)
  }

  const handleSaveAdd = () => {
    const newUser: User = {
      id: String(Date.now()),
      name: formData.name,
      email: formData.email,
      password: formData.password,
      isAdmin: false
    }
    saveUsers([...users, newUser])
    setAddDialogOpen(false)
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 p-6 relative">
        <ThemeToggle />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Доступ запрещен</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-muted-foreground">У вас нет доступа к этой странице.</p>
            <Link href="/login">
              <Button>Вернуться на страницу входа</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 to-purple-600">
      <ThemeToggle />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <Users className="size-6" />
            <h1 className="text-xl font-semibold">Управление пользователями</h1>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="size-4" />
            Добавить пользователя
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card className="bg-white/95 dark:bg-slate-800/90">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Пароль</TableHead>
                  <TableHead>Админ</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="font-mono">{user.password}</TableCell>
                    <TableCell>
                      {user.isAdmin && <span className="text-green-600 font-medium">Да</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(user.id)}
                          disabled={user.isAdmin}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Имя</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Имя</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Введите имя"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="Введите пароль"
              />
            </div>
            <Button onClick={handleSaveAdd} className="w-full">Добавить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
