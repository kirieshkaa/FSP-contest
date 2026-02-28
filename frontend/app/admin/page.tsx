"use client";
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { getUsers, approveUser, rejectUser, blockUser, deleteUser, logout, isAuthenticated, getBaseUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, X, Ban, Trash2, ArrowLeft, Users, LogOut, MoreHorizontal, BarChart3, User, Sun, Moon, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type SortField = 'username' | 'email' | 'role' | 'status' | 'created_at'
type SortOrder = 'asc' | 'desc'

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('role')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
  const baseUrl = getBaseUrl()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(baseUrl + '/login')
      return
    }
    
    const role = localStorage.getItem('user_role')
    if (role !== 'admin') {
      router.push(baseUrl + '/dashboard')
      return
    }
    
    loadUsers()
  }, [router])

  const loadUsers = async () => {
    try {
      const data = await getUsers(1, 100)
      setUsers(data.items)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filteredUsers = useMemo(() => {
    let result = [...users]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(u => 
        u.username.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      )
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(u => u.status === statusFilter)
    }
    
    result.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]
      
      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return result
  }, [users, searchQuery, statusFilter, sortField, sortOrder])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="size-3 ml-1" />
    return sortOrder === 'asc' ? <ArrowUp className="size-3 ml-1" /> : <ArrowDown className="size-3 ml-1" />
  }

  const handleApprove = async (userId: string) => {
    setActionLoading(userId)
    try {
      await approveUser(userId)
      await loadUsers()
      toast({ title: 'Успешно', description: 'Статус пользователя изменён на "Одобрен"' })
    } catch (err: any) {
      const msg = err?.message || 'Не удалось одобрить пользователя'
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId: string) => {
    setActionLoading(userId)
    try {
      await rejectUser(userId)
      await loadUsers()
      toast({ title: 'Успешно', description: 'Статус пользователя изменён на "Отклонён"' })
    } catch (err: any) {
      const msg = err?.message || 'Не удалось отклонить пользователя'
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleBlock = async (userId: string) => {
    setActionLoading(userId)
    try {
      await blockUser(userId)
      await loadUsers()
      toast({ title: 'Успешно', description: 'Пользователь заблокирован' })
    } catch (err: any) {
      const msg = err?.message || 'Не удалось заблокировать пользователя'
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string) => {
    setActionLoading(userId)
    try {
      await deleteUser(userId)
      await loadUsers()
      toast({ title: 'Успешно', description: 'Пользователь удалён' })
    } catch (err: any) {
      const msg = err?.message || 'Не удалось удалить пользователя'
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push(baseUrl + '/login')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="text-green-600 font-medium">Одобрен</span>
      case 'pending':
        return <span className="text-yellow-600 font-medium">Ожидает</span>
      case 'rejected':
        return <span className="text-red-600 font-medium">Отклонён</span>
      case 'blocked':
        return <span className="text-gray-600 font-medium">Заблокирован</span>
      default:
        return status
    }
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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Users className="size-6" />
            <h1 className="text-xl font-semibold">Управление пользователями</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(baseUrl + '/dashboard')} className="gap-2 cursor-pointer">
              <BarChart3 className="size-4" />
              Прогноз
            </Button>
            <Button variant="outline" onClick={() => router.push(baseUrl + '/profile')} className="gap-2 cursor-pointer">
              <User className="size-4" />
              Профиль
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2 cursor-pointer">
              <LogOut className="size-4" />
              Выйти
            </Button>
            {mounted && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="cursor-pointer"
              >
                {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени или email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-md border bg-background text-sm"
          >
            <option value="all">Все статусы</option>
            <option value="approved">Одобрен</option>
            <option value="pending">Ожидает</option>
            <option value="rejected">Отклонён</option>
            <option value="blocked">Заблокирован</option>
          </select>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('username')}>
                    <div className="flex items-center">Имя {getSortIcon('username')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                    <div className="flex items-center">Email {getSortIcon('email')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('role')}>
                    <div className="flex items-center">Роль {getSortIcon('role')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Статус {getSortIcon('status')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center">Дата регистрации {getSortIcon('created_at')}</div>
                  </TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.id.slice(0, 8)}...</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role === 'admin' && <span className="text-purple-600 font-medium">Админ</span>}
                      {user.role === 'user' && <span className="text-muted-foreground">Пользователь</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={actionLoading === user.id}
                            className="cursor-pointer"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleApprove(user.id)}
                            disabled={user.status === 'approved' || user.role === 'admin' || user.id === currentUserId}
                          >
                            <Check className="size-4 mr-2" />
                            Одобрить
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleReject(user.id)}
                            disabled={user.status === 'rejected' || user.role === 'admin' || user.id === currentUserId}
                          >
                            <X className="size-4 mr-2" />
                            Отклонить
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleBlock(user.id)}
                            disabled={user.status === 'blocked' || user.role === 'admin' || user.id === currentUserId}
                          >
                            <Ban className="size-4 mr-2" />
                            Заблокировать
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleApprove(user.id)}
                            disabled={user.status === 'approved' || user.role === 'admin' || user.id === currentUserId}
                          >
                            <Check className="size-4 mr-2" />
                            Разблокировать
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(user.id)}
                            disabled={user.role === 'admin' || user.id === currentUserId}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' 
                        ? 'Нет пользователей, соответствующих критериям поиска' 
                        : 'Нет пользователей'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
