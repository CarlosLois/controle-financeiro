import { useState, useMemo, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  SearchX,
  X,
  Link2,
  Unlink,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useAccountFilter } from "@/contexts/AccountFilterContext";
import { useTransactions } from "@/hooks/useTransactions";
import { 
  usePendingStatementEntries, 
  useUpdateStatementEntryStatus,
  type BankStatementEntry 
} from "@/hooks/useBankStatementEntries";
import { BankLogo } from "@/components/BankLogo";

const Reconciliation = () => {
  const { data: bankAccounts = [] } = useBankAccounts();
  const { selectedAccountId } = useAccountFilter();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions();
  const { data: statementEntries = [], isLoading: isLoadingStatement } = usePendingStatementEntries(selectedAccountId || undefined);
  const updateStatusMutation = useUpdateStatementEntryStatus();

  // State for selected items
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<string[]>([]);
  
  // Filter states
  const [filtroLocalizacao, setFiltroLocalizacao] = useState<'todos' | 'pendente' | 'conciliado'>('pendente');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'C' | 'D'>('todos');
  const [searchExtrato, setSearchExtrato] = useState('');
  const [searchTransacoes, setSearchTransacoes] = useState('');
  const [positionedStatementId, setPositionedStatementId] = useState<string | null>(null);

  // Dialogs
  const [showConciliarDialog, setShowConciliarDialog] = useState(false);
  const [showDesconciliarDialog, setShowDesconciliarDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for auto-scroll
  const statementItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Get selected account
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return bankAccounts.find((acc) => acc.id === selectedAccountId) || null;
  }, [selectedAccountId, bankAccounts]);

  // Filter statement entries
  const filteredStatementEntries = useMemo(() => {
    let filtered = statementEntries;

    // Filter by account
    if (selectedAccountId) {
      filtered = filtered.filter((e) => e.account_id === selectedAccountId);
    }

    // Filter by status
    if (filtroLocalizacao === 'pendente') {
      filtered = filtered.filter((e) => e.status === 'pending');
    } else if (filtroLocalizacao === 'conciliado') {
      filtered = filtered.filter((e) => e.status === 'reconciled');
    }

    // Filter by type
    if (filtroTipo === 'C') {
      filtered = filtered.filter((e) => e.type === 'C');
    } else if (filtroTipo === 'D') {
      filtered = filtered.filter((e) => e.type === 'D');
    }

    // Filter by search
    if (searchExtrato.trim()) {
      const search = searchExtrato.toLowerCase();
      filtered = filtered.filter((e) =>
        e.description.toLowerCase().includes(search) ||
        e.memo?.toLowerCase().includes(search) ||
        e.check_number?.toLowerCase().includes(search) ||
        e.amount.toString().includes(search)
      );
    }

    // Sort by date descending
    return [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [statementEntries, selectedAccountId, filtroLocalizacao, filtroTipo, searchExtrato]);

  // Get positioned statement item
  const positionedStatementItem = useMemo(() => {
    if (!positionedStatementId) return null;
    return filteredStatementEntries.find((e) => e.id === positionedStatementId) || null;
  }, [positionedStatementId, filteredStatementEntries]);

  // Filter transactions (predicted) based on positioned statement item
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by account
    if (selectedAccountId) {
      filtered = filtered.filter((t) => t.account_id === selectedAccountId);
    }

    // Filter pending only
    filtered = filtered.filter((t) => t.status === 'pending');

    // Filter by search
    if (searchTransacoes.trim()) {
      const search = searchTransacoes.toLowerCase();
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(search) ||
        t.amount.toString().includes(search)
      );
    }

    // If we have a positioned statement, prioritize transactions with matching amount/type
    if (positionedStatementItem) {
      const statementAmount = positionedStatementItem.amount;
      const statementType = positionedStatementItem.type;

      filtered = filtered.map((t) => {
        const transactionType = t.type === 'income' ? 'C' : 'D';
        const amountMatch = Math.abs(t.amount - statementAmount) < 0.01;
        const typeMatch = transactionType === statementType;
        return {
          ...t,
          _matchScore: (amountMatch ? 50 : 0) + (typeMatch ? 30 : 0),
        };
      });

      // Sort by match score descending, then by date
      return [...filtered].sort((a, b) => {
        const scoreA = (a as any)._matchScore || 0;
        const scoreB = (b as any)._matchScore || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }

    // Sort by date ascending
    return [...filtered].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [transactions, selectedAccountId, searchTransacoes, positionedStatementItem]);

  // Calculate totals for selected items
  const statementTotal = useMemo(() => {
    return filteredStatementEntries
      .filter((e) => selectedStatement.includes(e.id))
      .reduce((sum, e) => sum + (e.type === 'D' ? -e.amount : e.amount), 0);
  }, [filteredStatementEntries, selectedStatement]);

  const transactionsTotal = useMemo(() => {
    return filteredTransactions
      .filter((t) => selectedTransactions.includes(t.id))
      .reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0);
  }, [filteredTransactions, selectedTransactions]);

  const isBalanced = Math.abs(statementTotal - transactionsTotal) < 0.01;

  // Get selected items for validation
  const selectedStatementItems = useMemo(() => {
    return filteredStatementEntries.filter((e) => selectedStatement.includes(e.id));
  }, [filteredStatementEntries, selectedStatement]);

  const selectedTransactionItems = useMemo(() => {
    return filteredTransactions.filter((t) => selectedTransactions.includes(t.id));
  }, [filteredTransactions, selectedTransactions]);

  // Check if all selected statement items are pending
  const allSelectedStatementPending = useMemo(() => {
    if (selectedStatementItems.length === 0) return false;
    return selectedStatementItems.every((e) => e.status === 'pending');
  }, [selectedStatementItems]);

  // Check if all selected statement items are reconciled
  const allSelectedStatementReconciled = useMemo(() => {
    if (selectedStatementItems.length === 0) return false;
    return selectedStatementItems.every((e) => e.status === 'reconciled');
  }, [selectedStatementItems]);

  // Button enable rules
  const canConciliar = selectedStatement.length > 0 && allSelectedStatementPending;
  const canDesconciliar = selectedStatement.length > 0 && allSelectedStatementReconciled;

  // Auto-position on first statement item when filter changes
  useEffect(() => {
    if (filteredStatementEntries.length > 0 && !positionedStatementId) {
      setPositionedStatementId(filteredStatementEntries[0].id);
    }
  }, [filteredStatementEntries, positionedStatementId]);

  // Clear selections when account changes
  useEffect(() => {
    setSelectedTransactions([]);
    setSelectedStatement([]);
    setPositionedStatementId(null);
  }, [selectedAccountId]);

  // Toggle selection
  const toggleStatement = (entry: BankStatementEntry) => {
    setSelectedStatement((prev) =>
      prev.includes(entry.id)
        ? prev.filter((id) => id !== entry.id)
        : [...prev, entry.id]
    );
  };

  const toggleTransaction = (id: string) => {
    setSelectedTransactions((prev) =>
      prev.includes(id)
        ? prev.filter((tid) => tid !== id)
        : [...prev, id]
    );
  };

  // Handle reconciliation
  const handleConciliar = () => {
    if (!canConciliar) return;
    setShowConciliarDialog(true);
  };

  const executeConciliar = async () => {
    setIsProcessing(true);

    try {
      // Get first selected transaction ID (if any) for matching
      const matchedTransactionId = selectedTransactionItems[0]?.id || undefined;

      // Update all selected statement entries to reconciled
      for (const entry of selectedStatementItems) {
        await updateStatusMutation.mutateAsync({
          entryId: entry.id,
          status: 'reconciled',
          matchedTransactionId,
        });
      }

      toast({
        title: "Conciliação realizada",
        description: `${selectedStatementItems.length} registro(s) conciliado(s) com sucesso`,
      });

      // Clear selections
      setSelectedStatement([]);
      setSelectedTransactions([]);
    } catch (error) {
      toast({
        title: "Erro na conciliação",
        description: "Não foi possível conciliar os registros",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowConciliarDialog(false);
    }
  };

  // Handle unreconciliation
  const handleDesconciliar = () => {
    if (!canDesconciliar) return;
    setShowDesconciliarDialog(true);
  };

  const executeDesconciliar = async () => {
    setIsProcessing(true);

    try {
      for (const entry of selectedStatementItems) {
        await updateStatusMutation.mutateAsync({
          entryId: entry.id,
          status: 'pending',
        });
      }

      toast({
        title: "Desconciliação realizada",
        description: `${selectedStatementItems.length} registro(s) desconciliado(s)`,
      });

      setSelectedStatement([]);
    } catch (error) {
      toast({
        title: "Erro na desconciliação",
        description: "Não foi possível desconciliar os registros",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowDesconciliarDialog(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const isLoading = isLoadingTransactions || isLoadingStatement;

  return (
    <MainLayout title="Conciliação" subtitle="Compare e concilie transações bancárias">
      {/* Conciliar Dialog */}
      <AlertDialog open={showConciliarDialog} onOpenChange={setShowConciliarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Conciliação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Deseja conciliar os registros selecionados?</p>
                <div className="mt-3 p-3 bg-muted rounded-md space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Extrato:</span>{" "}
                    <span className="font-semibold">
                      {statementTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Transações:</span>{" "}
                    <span className="font-semibold">
                      {transactionsTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </p>
                  <p className={cn(
                    "text-sm font-semibold",
                    isBalanced ? "text-green-600" : "text-yellow-600"
                  )}>
                    Diferença: {(statementTotal - transactionsTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeConciliar} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Desconciliar Dialog */}
      <AlertDialog open={showDesconciliarDialog} onOpenChange={setShowDesconciliarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desconciliação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja desconciliar {selectedStatementItems.length} registro(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDesconciliar} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col h-[calc(100vh-12rem)] gap-4">
        {/* When no account selected */}
        {!selectedAccountId && (
          <Card className="p-8 flex-1">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Selecione uma conta para continuar</p>
              <p className="text-sm text-muted-foreground">
                Use o seletor de contas no menu superior.
              </p>
            </div>
          </Card>
        )}

        {selectedAccountId && (
          <>
            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant={filtroLocalizacao === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroLocalizacao('todos')}
                >
                  Todos
                </Button>
                <Button
                  variant={filtroLocalizacao === 'pendente' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroLocalizacao('pendente')}
                  className="gap-1"
                >
                  <SearchX className="h-3 w-3" />
                  Pendentes
                </Button>
                <Button
                  variant={filtroLocalizacao === 'conciliado' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroLocalizacao('conciliado')}
                  className="gap-1"
                >
                  <Search className="h-3 w-3" />
                  Conciliados
                </Button>
              </div>

              <div className="flex items-center gap-4">
                {(selectedStatement.length > 0 || selectedTransactions.length > 0) && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isBalanced && selectedStatement.length > 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    )}
                    <span className="text-muted-foreground">
                      Diferença:{" "}
                      <span className={cn("font-semibold", isBalanced ? "text-green-600" : "text-yellow-600")}>
                        {(statementTotal - transactionsTotal).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleConciliar}
                    disabled={!canConciliar}
                    size="sm"
                    className="gap-1"
                  >
                    <Link2 className="h-3 w-3" />
                    Conciliar
                  </Button>
                  <Button
                    onClick={handleDesconciliar}
                    disabled={!canDesconciliar}
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                  >
                    <Unlink className="h-3 w-3" />
                    Desconciliar
                  </Button>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative flex-1 min-h-0 overflow-hidden">
              {/* Extrato Bancário (Importado) */}
              <Card className="p-0 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">Extrato Bancário</h3>
                      <p className="text-sm text-muted-foreground">
                        {filteredStatementEntries.length} transações do banco
                      </p>
                    </div>
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      <Button
                        variant={filtroTipo === 'todos' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFiltroTipo('todos')}
                        className="text-xs h-7 px-3"
                      >
                        Todos
                      </Button>
                      <Button
                        variant={filtroTipo === 'C' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFiltroTipo('C')}
                        className="text-xs h-7 px-3"
                      >
                        Crédito
                      </Button>
                      <Button
                        variant={filtroTipo === 'D' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFiltroTipo('D')}
                        className="text-xs h-7 px-3"
                      >
                        Débito
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por descrição, documento, valor..."
                      value={searchExtrato}
                      onChange={(e) => setSearchExtrato(e.target.value)}
                      className="pl-9 pr-9 h-9 text-sm"
                    />
                    {searchExtrato && (
                      <button
                        onClick={() => setSearchExtrato('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Select All Header */}
                {filteredStatementEntries.length > 0 && (
                  <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-2">
                    <Checkbox
                      checked={selectedStatement.length === filteredStatementEntries.length && filteredStatementEntries.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStatement(filteredStatementEntries.map((e) => e.id));
                        } else {
                          setSelectedStatement([]);
                        }
                      }}
                    />
                    <div className="w-6 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {selectedStatement.length === filteredStatementEntries.length
                        ? "Desmarcar todos"
                        : "Marcar todos"}
                    </span>
                  </div>
                )}

                <div className="divide-y divide-border flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Carregando transações...
                    </div>
                  ) : filteredStatementEntries.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Nenhuma transação no extrato
                    </div>
                  ) : (
                    filteredStatementEntries.map((entry) => (
                      <div
                        key={entry.id}
                        ref={(el) => {
                          if (el) {
                            statementItemRefs.current.set(entry.id, el);
                          } else {
                            statementItemRefs.current.delete(entry.id);
                          }
                        }}
                        className={cn(
                          "px-3 py-2 flex items-start gap-2 transition-colors cursor-pointer",
                          positionedStatementId === entry.id && "bg-muted/50",
                          selectedStatement.includes(entry.id) && "bg-primary/5 border-l-2 border-l-primary"
                        )}
                        onClick={() => setPositionedStatementId(entry.id)}
                      >
                        <Checkbox
                          checked={selectedStatement.includes(entry.id)}
                          className="mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatement(entry);
                          }}
                        />
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                            entry.type === 'C' ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                          )}
                        >
                          {entry.type === 'C' ? (
                            <ArrowDownLeft className="w-3 h-3 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{entry.description}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            {selectedAccount && (
                              <>
                                <BankLogo bankName={selectedAccount.bank} size="xs" />
                                <span>•</span>
                              </>
                            )}
                            <span>{formatDate(entry.date)}</span>
                            {entry.check_number && (
                              <>
                                <span>•</span>
                                <span>Doc: {entry.check_number}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge
                              variant={entry.status === 'pending' ? 'destructive' : 'secondary'}
                              className="text-[9px] px-1 py-0"
                            >
                              {entry.status === 'pending' ? 'Pendente' : 'Conciliado'}
                            </Badge>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-semibold whitespace-nowrap",
                            entry.type === 'C' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {entry.type === 'D' ? '-' : '+'}
                          {entry.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {selectedStatement.length > 0 && (
                  <div className="px-3 py-2 border-t border-border bg-muted/30">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{selectedStatement.length} selecionado(s)</span>
                      <span className="font-semibold">
                        {statementTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Arrow */}
              <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
              </div>

              {/* Transações (Previstas) */}
              <Card className="p-0 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">Transações Previstas</h3>
                      <p className="text-sm text-muted-foreground">
                        {filteredTransactions.length} lançamentos do sistema
                      </p>
                    </div>
                    {isLoading && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">Carregando...</span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por descrição, valor..."
                      value={searchTransacoes}
                      onChange={(e) => setSearchTransacoes(e.target.value)}
                      className="pl-9 pr-9 h-9 text-sm"
                    />
                    {searchTransacoes && (
                      <button
                        onClick={() => setSearchTransacoes('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Select All Header */}
                {filteredTransactions.length > 0 && (
                  <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-2">
                    <Checkbox
                      checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTransactions(filteredTransactions.map((t) => t.id));
                        } else {
                          setSelectedTransactions([]);
                        }
                      }}
                    />
                    <div className="w-6 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {selectedTransactions.length === filteredTransactions.length
                        ? "Desmarcar todos"
                        : "Marcar todos"}
                    </span>
                  </div>
                )}

                <div className="divide-y divide-border flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Carregando lançamentos...
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Nenhum lançamento pendente no sistema
                    </div>
                  ) : (
                    filteredTransactions.map((t) => {
                      const matchScore = (t as any)._matchScore || 0;
                      const isHighMatch = matchScore >= 80;
                      const isMediumMatch = matchScore >= 30 && matchScore < 80;

                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "px-3 py-2 flex items-start gap-2 transition-colors cursor-pointer",
                            selectedTransactions.includes(t.id)
                              ? "bg-primary/5 border-l-2 border-l-primary"
                              : isHighMatch
                              ? "bg-green-100/50 dark:bg-green-900/20 border-l-2 border-l-green-500"
                              : isMediumMatch
                              ? "bg-yellow-100/50 dark:bg-yellow-900/20 border-l-2 border-l-yellow-500"
                              : ""
                          )}
                          onClick={() => toggleTransaction(t.id)}
                        >
                          <Checkbox
                            checked={selectedTransactions.includes(t.id)}
                            className="mt-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                              t.type === 'income'
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-red-100 dark:bg-red-900/30"
                            )}
                          >
                            {t.type === 'income' ? (
                              <ArrowDownLeft className="w-3 h-3 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{t.description}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              <span>{formatDate(t.date)}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="outline" className="text-[9px] px-1 py-0">
                                {t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência'}
                              </Badge>
                              {isHighMatch && (
                                <Badge className="text-[9px] px-1 py-0 bg-green-500">Match</Badge>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-xs font-semibold whitespace-nowrap",
                              t.type === 'income'
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            )}
                          >
                            {t.type === 'expense' ? '-' : '+'}
                            {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedTransactions.length > 0 && (
                  <div className="px-3 py-2 border-t border-border bg-muted/30">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{selectedTransactions.length} selecionado(s)</span>
                      <span className="font-semibold">
                        {transactionsTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Reconciliation;
