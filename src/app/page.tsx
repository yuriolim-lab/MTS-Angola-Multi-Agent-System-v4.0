'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Ship,
  Users,
  Mail,
  DollarSign,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  Bell,
  MapPin,
  Calendar,
  Building,
  Phone,
  Globe,
  AlertTriangle,
  Zap,
  Play
} from 'lucide-react'

// Types
interface DashboardData {
  overview: {
    vesselsTracked: number
    totalClients: number
    newContacts: number
    emailsSent: number
    estimatedValue: number
  }
  vessels: {
    total: number
    upcoming: number
    byPort: Array<{ port: string; count: number }>
    arrivals: Array<{
      id: string
      vesselName: string
      imo: string
      port: string
      eta: string
      owner?: string
    }>
  }
  clients: {
    total: number
    byStatus: Record<string, number>
    newThisPeriod: number
  }
  communications: {
    emails: { sent: number; failed: number; byAgent: Array<{ agent: string; _count: number }> }
    whatsapp: { sent: number; failed: number; byType: Array<{ type: string; _count: number }> }
  }
  activity: Array<{
    id: string
    agent: string
    action: string
    entityType?: string
    status: string
    timestamp: string
  }>
  agents: {
    pedro: { name: string; role: string; email: string; lastActivity: string | null }
    mariana: { name: string; role: string; email: string; lastActivity: string | null }
    claudia: { name: string; role: string; email: string; lastActivity: string | null }
  }
}

interface Client {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  status: string
  language: string
  lastContactAt?: string
  nextFollowUp?: string
  interactions: Array<{ type: string; subject?: string; createdAt: string }>
  _count?: { interactions: number }
}

interface Vessel {
  id: string
  name: string
  imo: string
  type?: string
  owner?: string
  schedules?: Array<{ port: string; eta: string; status: string }>
}

export default function MTSAngolaDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      if (result.success) {
        setDashboardData(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
      setLastUpdate(new Date())
    }
  }, [])

  // Fetch clients
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch('/api/clients?limit=10')
      const result = await response.json()
      if (result.success) {
        setClients(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }, [])

  // Fetch vessels
  const fetchVessels = useCallback(async () => {
    try {
      const response = await fetch('/api/vessels?limit=10')
      const result = await response.json()
      if (result.success) {
        setVessels(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch vessels:', err)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchDashboardData()
    fetchClients()
    fetchVessels()
  }, [fetchDashboardData, fetchClients, fetchVessels])

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchDashboardData(), fetchClients(), fetchVessels()])
    setRefreshing(false)
  }

  // Execute Pedro action
  const executePedroAction = async (action: string) => {
    try {
      const response = await fetch('/api/agents/pedro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, count: 5, sendReport: true }),
      })
      const result = await response.json()
      if (result.success) {
        await fetchDashboardData()
        await fetchVessels()
      }
      return result
    } catch (err) {
      console.error('Pedro action error:', err)
      return { success: false, error: 'Failed to execute action' }
    }
  }

  // Execute Mariana action
  const executeMarianaAction = async (action: string, data?: any) => {
    try {
      const response = await fetch('/api/agents/mariana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      })
      const result = await response.json()
      if (result.success) {
        await fetchDashboardData()
        await fetchClients()
      }
      return result
    } catch (err) {
      console.error('Mariana action error:', err)
      return { success: false, error: 'Failed to execute action' }
    }
  }

  // Execute Claudia action
  const executeClaudiaAction = async (action: string, data?: any) => {
    try {
      const response = await fetch('/api/agents/claudia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      })
      const result = await response.json()
      if (result.success) {
        await fetchDashboardData()
      }
      return result
    } catch (err) {
      console.error('Claudia action error:', err)
      return { success: false, error: 'Failed to execute action' }
    }
  }

  // Execute automation task
  const executeAutomation = async (task: string) => {
    try {
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      })
      const result = await response.json()
      if (result.success) {
        await handleRefresh()
      }
      return result
    } catch (err) {
      console.error('Automation error:', err)
      return { success: false, error: 'Failed to execute automation' }
    }
  }

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cold': return 'bg-gray-500'
      case 'warm': return 'bg-blue-500'
      case 'hot': return 'bg-orange-500'
      case 'qualified': return 'bg-green-500'
      case 'inactive': return 'bg-red-500'
      case 'sent': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'pending': return 'bg-yellow-500'
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-AO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando sistema MTS Angola...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Ship className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">MTS Angola</h1>
                <p className="text-slate-400 text-sm">Sistema Multi-Agente v4.0</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Sistema Online
              </div>
              <div className="text-sm text-slate-400">
                {lastUpdate.toLocaleTimeString('pt-AO')}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Alert variant="destructive" className="bg-red-900/50 border-red-700">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Navios Rastreados</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {dashboardData?.overview.vesselsTracked || 0}
                  </p>
                </div>
                <Ship className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Clientes</p>
                  <p className="text-3xl font-bold text-green-400">
                    {dashboardData?.overview.totalClients || 0}
                  </p>
                </div>
                <Users className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Novos Contatos</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {dashboardData?.overview.newContacts || 0}
                  </p>
                </div>
                <Activity className="w-10 h-10 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Emails Enviados</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {dashboardData?.overview.emailsSent || 0}
                  </p>
                </div>
                <Mail className="w-10 h-10 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Valor Estimado</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    ${((dashboardData?.overview.estimatedValue || 0) / 1000).toFixed(0)}K
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Pedro Card */}
          <Card className="bg-gradient-to-br from-blue-900/50 to-slate-800 border-blue-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Ship className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{dashboardData?.agents.pedro.name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {dashboardData?.agents.pedro.role}
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-600">Pedro</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-400">
                <p><strong>Email:</strong> {dashboardData?.agents.pedro.email}</p>
                <p><strong>Ultima Atividade:</strong> {
                  dashboardData?.agents.pedro.lastActivity 
                    ? formatDate(dashboardData.agents.pedro.lastActivity)
                    : 'Nenhuma'
                }</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => executePedroAction('track')}
                >
                  <Ship className="w-4 h-4 mr-2" />
                  Rastrear Navios
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mariana Card */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-slate-800 border-purple-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{dashboardData?.agents.mariana.name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {dashboardData?.agents.mariana.role}
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-purple-600">Mariana</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-400">
                <p><strong>Email:</strong> {dashboardData?.agents.mariana.email}</p>
                <p><strong>Ultima Atividade:</strong> {
                  dashboardData?.agents.mariana.lastActivity 
                    ? formatDate(dashboardData.agents.mariana.lastActivity)
                    : 'Nenhuma'
                }</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 border-purple-600 text-purple-300 hover:bg-purple-800"
                  onClick={() => executeMarianaAction('reengage', { clientId: clients[0]?.id })}
                  disabled={!clients[0]?.id}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Re-engajar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Claudia Card */}
          <Card className="bg-gradient-to-br from-green-900/50 to-slate-800 border-green-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{dashboardData?.agents.claudia.name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {dashboardData?.agents.claudia.role}
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-600">Claudia</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-400">
                <p><strong>Email:</strong> {dashboardData?.agents.claudia.email}</p>
                <p><strong>Ultima Atividade:</strong> {
                  dashboardData?.agents.claudia.lastActivity 
                    ? formatDate(dashboardData.agents.claudia.lastActivity)
                    : 'Nenhuma'
                }</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 border-green-600 text-green-300 hover:bg-green-800"
                  onClick={() => executeClaudiaAction('daily_report')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Relatorio Diario
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-green-600 text-green-300 hover:bg-green-800"
                  onClick={() => executeClaudiaAction('weekly_report_whatsapp')}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Automation Panel */}
        <Card className="bg-gradient-to-br from-yellow-900/30 to-slate-800 border-yellow-700 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-600 p-2 rounded-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Automacao</CardTitle>
                  <CardDescription className="text-slate-400">
                    Executar tarefas automaticas do sistema
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => executeAutomation('daily_tracking')}
              >
                <Play className="w-4 h-4 mr-2" />
                Rastrear Navios
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => executeAutomation('reengage_inactive')}
              >
                <Users className="w-4 h-4 mr-2" />
                Re-engajar Clientes
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => executeAutomation('daily_report')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Relatorio Diario
              </Button>
              <Button 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => executeAutomation('full_automation')}
              >
                <Zap className="w-4 h-4 mr-2" />
                Automacao Completa
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="arrivals" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="arrivals" className="data-[state=active]:bg-blue-600">
              <Ship className="w-4 h-4 mr-2" />
              Chegadas de Navios
            </TabsTrigger>
            <TabsTrigger value="clients" className="data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 mr-2" />
              Clientes CRM
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-orange-600">
              <Activity className="w-4 h-4 mr-2" />
              Atividades
            </TabsTrigger>
          </TabsList>

          {/* Vessel Arrivals Tab */}
          <TabsContent value="arrivals">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-blue-400" />
                  Proximas Chegadas
                </CardTitle>
                <CardDescription>
                  Navios com ETA para os proximos 30 dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-700/50">
                      <TableHead className="text-slate-400">Navio</TableHead>
                      <TableHead className="text-slate-400">IMO</TableHead>
                      <TableHead className="text-slate-400">Porto</TableHead>
                      <TableHead className="text-slate-400">ETA</TableHead>
                      <TableHead className="text-slate-400">Armador</TableHead>
                      <TableHead className="text-slate-400">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData?.vessels.arrivals.map((arrival) => (
                      <TableRow key={arrival.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="font-medium">{arrival.vesselName}</TableCell>
                        <TableCell className="text-slate-400">{arrival.imo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            {arrival.port}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDate(arrival.eta)}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">{arrival.owner || '-'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!dashboardData?.vessels.arrivals || dashboardData.vessels.arrivals.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                          Nenhum navio encontrado. Execute o rastreamento do Pedro.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Clientes CRM
                    </CardTitle>
                    <CardDescription>
                      Gestao de relacionamento com clientes
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(dashboardData?.clients.byStatus || {}).map(([status, count]) => (
                      <Badge key={status} className={`${getStatusColor(status)} text-white`}>
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-700/50">
                      <TableHead className="text-slate-400">Nome</TableHead>
                      <TableHead className="text-slate-400">Email</TableHead>
                      <TableHead className="text-slate-400">Empresa</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Idioma</TableHead>
                      <TableHead className="text-slate-400">Ultimo Contato</TableHead>
                      <TableHead className="text-slate-400">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-slate-400">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {client.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.company ? (
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-slate-400" />
                              {client.company}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(client.status)} text-white`}>
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-slate-400" />
                            {client.language}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {client.lastContactAt ? formatDate(client.lastContactAt) : 'Nunca'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {client.status === 'cold' && (
                              <Button 
                                size="sm" 
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => executeMarianaAction('prospect', { clientId: client.id })}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Prospec.
                              </Button>
                            )}
                            {client.status === 'warm' && (
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => executeMarianaAction('qualify', { clientId: client.id })}
                              >
                                Qualificar
                              </Button>
                            )}
                            {client.status === 'qualified' && (
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => executeClaudiaAction('send_quotation', { clientId: client.id })}
                              >
                                Cotacao
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {clients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                          Nenhum cliente cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  Historico de Atividades
                </CardTitle>
                <CardDescription>
                  Registro de todas as acoes do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData?.activity.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-slate-700/50"
                    >
                      <div className={`p-2 rounded-lg ${
                        activity.agent === 'pedro' ? 'bg-blue-600' :
                        activity.agent === 'mariana' ? 'bg-purple-600' :
                        activity.agent === 'claudia' ? 'bg-green-600' :
                        'bg-slate-600'
                      }`}>
                        {activity.agent === 'pedro' && <Ship className="w-4 h-4" />}
                        {activity.agent === 'mariana' && <Users className="w-4 h-4" />}
                        {activity.agent === 'claudia' && <DollarSign className="w-4 h-4" />}
                        {activity.agent === 'system' && <Activity className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{activity.agent}</span>
                          <span className="text-slate-400">-</span>
                          <span className="text-slate-300">{activity.action.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="text-sm text-slate-400">
                          {activity.entityType && (
                            <span className="mr-2">{activity.entityType}</span>
                          )}
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 ${
                        activity.status === 'success' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {activity.status === 'success' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span className="text-sm">{activity.status}</span>
                      </div>
                    </div>
                  ))}
                  {(!dashboardData?.activity || dashboardData.activity.length === 0) && (
                    <div className="text-center text-slate-400 py-8">
                      Nenhuma atividade registrada.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Port Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Navios por Porto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.vessels.byPort.map((port) => (
                  <div key={port.port} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{port.port}</span>
                      <span className="text-slate-400">{port.count} navios</span>
                    </div>
                    <Progress 
                      value={(port.count / Math.max(...(dashboardData?.vessels.byPort.map(p => p.count) || [1]))) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
                {(!dashboardData?.vessels.byPort || dashboardData.vessels.byPort.length === 0) && (
                  <p className="text-slate-400 text-center py-4">Nenhum dado disponivel</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-orange-400" />
                Comunicacoes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-orange-400" />
                    <span className="font-medium">Emails (7 dias)</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">
                    {dashboardData?.communications.emails.sent || 0}
                  </div>
                  <div className="text-sm text-slate-400">
                    Enviados
                  </div>
                  {dashboardData?.communications?.emails?.failed && dashboardData.communications.emails.failed > 0 && (
                    <div className="text-sm text-red-400 mt-1">
                      {dashboardData.communications.emails.failed} falharam
                    </div>
                  )}
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-green-400" />
                    <span className="font-medium">WhatsApp (30 dias)</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {dashboardData?.communications.whatsapp.sent || 0}
                  </div>
                  <div className="text-sm text-slate-400">
                    Alertas enviados
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <p>MTS Angola - Sistema Multi-Agente v4.0</p>
            <p>Waste Management | Shipchandler | Hull Cleaning | Offshore Support</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
