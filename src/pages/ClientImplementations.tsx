import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Package, 
  Sparkles, 
  TrendingUp, 
  Timer, 
  Clock, 
  CheckCircle2,
  Search,
  ArrowLeft,
  History
} from 'lucide-react';
import { useImplementations, Implementation } from '@/hooks/useImplementations';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BlueBackground from '@/components/BlueBackground';
import logo from '@/assets/logo-pcon-grande.png';

const ClientImplementations = () => {
  const navigate = useNavigate();
  const { client, isAuthenticated, logout } = useClientAuth();
  const {
    implementations,
    requests,
    loading,
    fetchImplementations,
    fetchRequests,
    createRequest,
    getCategories
  } = useImplementations();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImpl, setSelectedImpl] = useState<Implementation | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/cliente');
      return;
    }
    fetchImplementations(true);
    if (client?.id) {
      fetchRequests(client.id);
    }
  }, [isAuthenticated, client?.id, fetchImplementations, fetchRequests, navigate]);

  const categories = getCategories();

  const filteredImplementations = implementations.filter(impl => {
    const matchesCategory = selectedCategory === 'all' || impl.category === selectedCategory;
    const matchesSearch = impl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      impl.short_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      impl.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleRequestClick = (impl: Implementation) => {
    setSelectedImpl(impl);
    setIsRequestDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedImpl || !client?.id) return;
    
    setSubmitting(true);
    const success = await createRequest(selectedImpl.id, client.id, requestNotes);
    
    if (success) {
      setIsRequestDialogOpen(false);
      setRequestNotes('');
      setSelectedImpl(null);
      fetchRequests(client.id);
    }
    setSubmitting(false);
  };

  const getTagIcon = (tag: string) => {
    if (tag.toLowerCase() === 'novo') return <Sparkles className="w-3 h-3" />;
    if (tag.toLowerCase() === 'popular') return <TrendingUp className="w-3 h-3" />;
    if (tag.toLowerCase() === 'em breve') return <Timer className="w-3 h-3" />;
    return null;
  };

  const getTagColor = (tag: string) => {
    if (tag.toLowerCase() === 'novo') return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (tag.toLowerCase() === 'popular') return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    if (tag.toLowerCase() === 'em breve') return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    return '';
  };

  const getStatusInfo = (status: string) => {
    const info: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
      pending: { color: 'text-yellow-600', label: 'Aguardando', icon: <Clock className="w-4 h-4" /> },
      approved: { color: 'text-green-600', label: 'Aprovado', icon: <CheckCircle2 className="w-4 h-4" /> },
      rejected: { color: 'text-red-600', label: 'Rejeitado', icon: null },
      completed: { color: 'text-blue-600', label: 'Concluído', icon: <CheckCircle2 className="w-4 h-4" /> }
    };
    return info[status] || info.pending;
  };

  const isAlreadyRequested = (implId: string) => {
    return requests.some(r => 
      r.implementation_id === implId && 
      (r.status === 'pending' || r.status === 'approved')
    );
  };

  return (
    <div className="relative min-h-screen">
      <BlueBackground />
      <div className="relative min-h-screen p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/cliente')}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={logo} alt="P-CON" className="h-10 lg:h-12" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80 text-sm hidden sm:block">
                Olá, {client?.name?.split(' ')[0]}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Sair
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Implantações Futuras
            </h1>
            <p className="text-white/70">
              Conheça nossos módulos e sistemas disponíveis para contratação
            </p>
          </div>

          <Tabs defaultValue="available" className="w-full">
            <TabsList className="bg-white/10 border-white/20 mb-6">
              <TabsTrigger value="available" className="data-[state=active]:bg-white data-[state=active]:text-primary gap-2">
                <Package className="w-4 h-4" />
                Disponíveis
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-primary gap-2">
                <History className="w-4 h-4" />
                Minhas Solicitações
                {requests.length > 0 && (
                  <Badge className="ml-1 bg-primary/20 text-primary">
                    {requests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              {/* Filters */}
              <Card className="mb-6 bg-white/95 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar implantações..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {categories.length > 0 && (
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as categorias</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Implementations Grid */}
              {loading ? (
                <div className="text-center py-12 text-white/70">Carregando...</div>
              ) : filteredImplementations.length === 0 ? (
                <Card className="bg-white/95 backdrop-blur">
                  <CardContent className="text-center py-12 text-muted-foreground">
                    Nenhuma implantação encontrada
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredImplementations.map((impl) => (
                    <Card key={impl.id} className="bg-white/95 backdrop-blur hover:shadow-lg transition-shadow overflow-hidden group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight">{impl.name}</CardTitle>
                            {impl.category && (
                              <CardDescription className="mt-1">{impl.category}</CardDescription>
                            )}
                          </div>
                          {impl.availability === 'coming_soon' && (
                            <Badge variant="secondary" className="shrink-0">
                              <Timer className="w-3 h-3 mr-1" />
                              Em Breve
                            </Badge>
                          )}
                        </div>
                        {impl.tags && impl.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {impl.tags.map(tag => (
                              <Badge 
                                key={tag} 
                                variant="outline" 
                                className={`text-xs gap-1 ${getTagColor(tag)}`}
                              >
                                {getTagIcon(tag)}
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {impl.short_description || impl.description || 'Sem descrição disponível'}
                        </p>
                        <div className="mt-4">
                          <span className="text-2xl font-bold text-primary">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(impl.value)}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/30 border-t">
                        {isAlreadyRequested(impl.id) ? (
                          <Button variant="secondary" className="w-full" disabled>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Já Solicitado
                          </Button>
                        ) : impl.availability === 'coming_soon' ? (
                          <Button variant="outline" className="w-full" disabled>
                            <Timer className="w-4 h-4 mr-2" />
                            Em Breve
                          </Button>
                        ) : (
                          <Button 
                            className="w-full"
                            onClick={() => handleRequestClick(impl)}
                          >
                            Quero esse módulo
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <Card className="bg-white/95 backdrop-blur">
                <CardHeader>
                  <CardTitle>Histórico de Solicitações</CardTitle>
                  <CardDescription>
                    Acompanhe o status das suas solicitações de implantação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {requests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Você ainda não fez nenhuma solicitação
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((req) => {
                        const statusInfo = getStatusInfo(req.status);
                        return (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium">{req.implementation?.name || 'Implantação'}</h4>
                              <p className="text-sm text-muted-foreground">
                                Solicitado em {format(new Date(req.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              {req.notes && (
                                <p className="text-sm text-muted-foreground mt-1 italic">
                                  "{req.notes}"
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                                {statusInfo.icon}
                                <span className="font-medium">{statusInfo.label}</span>
                              </div>
                              {req.implementation && (
                                <span className="text-sm text-muted-foreground">
                                  {new Intl.NumberFormat('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL' 
                                  }).format(req.implementation.value)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Request Dialog */}
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Implantação</DialogTitle>
              <DialogDescription>
                Você está solicitando: <strong>{selectedImpl?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Valor:</p>
                <p className="text-2xl font-bold text-primary">
                  {selectedImpl && new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(selectedImpl.value)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Alguma observação ou necessidade específica?"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitRequest} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Confirmar Solicitação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ClientImplementations;
