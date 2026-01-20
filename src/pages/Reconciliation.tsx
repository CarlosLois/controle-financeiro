import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
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
  RefreshCw,
  Trash2,
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
import { useTransactions, useCreateTransaction } from "@/hooks/useTransactions";
import { 
  usePendingStatementEntries, 
  useUpdateStatementEntryStatus,
  useDeleteStatementEntry,
  type BankStatementEntry 
} from "@/hooks/useBankStatementEntries";

// Types for action matching
type ActionType = 'CL' | 'IL' | null;

interface StatementEntryWithAction extends BankStatementEntry {
  _action: ActionType;
  _matchedTransactionId: string | null;
  _matchScore: number;
}

const Reconciliation = () => {
  const { data: bankAccounts = [], refetch: refetchAccounts } = useBankAccounts();
  const { selectedAccountId } = useAccountFilter();
  const { data: transactions = [], isLoading: isLoadingTransactions, refetch: refetchTransactions } = useTransactions();
  const { data: statementEntries = [], isLoading: isLoadingStatement, refetch: refetchStatement } = usePendingStatementEntries(selectedAccountId || undefined);
  const updateStatusMutation = useUpdateStatementEntryStatus();
  const createTransactionMutation = useCreateTransaction();
  const deleteStatementMutation = useDeleteStatementEntry();

  // State for selected items
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<string[]>([]);
  
  // Filter states
  const [filtroLocalizacao, setFiltroLocalizacao] = useState<'todos' | 'localizado' | 'nao_localizado'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'C' | 'D'>('todos');
  const [filtroPendencia, setFiltroPendencia] = useState<'todos' | 'pending' | 'reconciled'>('todos');
  const [searchExtrato, setSearchExtrato] = useState('');
  const [searchTransacoes, setSearchTransacoes] = useState('');
  const [mostrarTodasTransacoes, setMostrarTodasTransacoes] = useState(false);
  const [positionedStatementId, setPositionedStatementId] = useState<string | null>(null);

  // Processed entries with actions
  const [processedEntries, setProcessedEntries] = useState<Map<string, { action: ActionType; matchedTransactionId: string | null; matchScore: number }>>(new Map());

  // Dialogs
  const [showConciliarDialog, setShowConciliarDialog] = useState(false);
  const [showDesconciliarDialog, setShowDesconciliarDialog] = useState(false);
  const [showLancarDialog, setShowLancarDialog] = useState(false);
  const [showRemoverDialog, setShowRemoverDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for auto-scroll
  const statementItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Get selected account
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return bankAccounts.find((acc) => acc.id === selectedAccountId) || null;
  }, [selectedAccountId, bankAccounts]);

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchAccounts(),
        refetchTransactions(),
        refetchStatement(),
      ]);
      toast({
        title: "Dados atualizados",
        description: "A conciliação foi atualizada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Process reconciliation - find matches
  const processReconciliation = useCallback(() => {
    if (!selectedAccountId) return;

    const pendingStatements = statementEntries.filter(e => e.status === 'pending' && e.account_id === selectedAccountId);
    const pendingTransactions = transactions.filter(t => t.status === 'pending' && t.account_id === selectedAccountId);

    const newProcessedEntries = new Map<string, { action: ActionType; matchedTransactionId: string | null; matchScore: number }>();
    const usedTransactionIds = new Set<string>();

    for (const entry of pendingStatements) {
      const entryType = entry.type; // 'C' or 'D'
      const entryAmount = entry.amount;
      const entryDate = new Date(entry.date);
      const entryDescription = entry.description.toLowerCase();

      let bestMatch: { transactionId: string; score: number } | null = null;

      for (const tx of pendingTransactions) {
        if (usedTransactionIds.has(tx.id)) continue;

        const txType = tx.type === 'income' ? 'C' : 'D';
        
        // Type must match
        if (txType !== entryType) continue;

        let score = 0;

        // Amount matching (exact = 50 points, close = 25 points)
        const amountDiff = Math.abs(tx.amount - entryAmount);
        if (amountDiff < 0.01) {
          score += 50;
        } else if (amountDiff / entryAmount < 0.05) {
          score += 25;
        }

        // Date matching (same day = 30 points, within 3 days = 15 points, within 7 days = 5 points)
        const txDate = new Date(tx.date);
        const daysDiff = Math.abs(differenceInDays(entryDate, txDate));
        if (daysDiff === 0) {
          score += 30;
        } else if (daysDiff <= 3) {
          score += 15;
        } else if (daysDiff <= 7) {
          score += 5;
        }

        // Description matching (contains = 20 points)
        const txDescription = tx.description.toLowerCase();
        if (entryDescription.includes(txDescription) || txDescription.includes(entryDescription)) {
          score += 20;
        } else {
          // Partial word match
          const entryWords = entryDescription.split(/\s+/);
          const txWords = txDescription.split(/\s+/);
          const matchingWords = entryWords.filter(w => txWords.some(tw => tw.includes(w) || w.includes(tw)));
          if (matchingWords.length > 0) {
            score += Math.min(matchingWords.length * 5, 15);
          }
        }

        // Only consider if score is above threshold and better than current best
        if (score >= 50 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { transactionId: tx.id, score };
        }
      }

      if (bestMatch) {
        newProcessedEntries.set(entry.id, {
          action: 'CL',
          matchedTransactionId: bestMatch.transactionId,
          matchScore: bestMatch.score,
        });
        usedTransactionIds.add(bestMatch.transactionId);
      } else {
        newProcessedEntries.set(entry.id, {
          action: 'IL',
          matchedTransactionId: null,
          matchScore: 0,
        });
      }
    }

    setProcessedEntries(newProcessedEntries);

    const clCount = Array.from(newProcessedEntries.values()).filter(v => v.action === 'CL').length;
    const ilCount = Array.from(newProcessedEntries.values()).filter(v => v.action === 'IL').length;

    toast({
      title: "Processamento concluído",
      description: `${clCount} conciliações sugeridas, ${ilCount} lançamentos a incluir`,
    });
  }, [statementEntries, transactions, selectedAccountId]);

  // Filter statement entries with actions
  const filteredStatementEntries = useMemo(() => {
    let filtered = statementEntries;

    // Filter by account
    if (selectedAccountId) {
      filtered = filtered.filter((e) => e.account_id === selectedAccountId);
    }

    // Filter by localization status
    if (filtroLocalizacao === 'localizado') {
      filtered = filtered.filter((e) => {
        const processed = processedEntries.get(e.id);
        return processed?.action === 'CL';
      });
    } else if (filtroLocalizacao === 'nao_localizado') {
      filtered = filtered.filter((e) => {
        const processed = processedEntries.get(e.id);
        return !processed?.action || processed?.action === 'IL';
      });
    }

    // Filter by pendency status (based on TAG shown: Pendente = pending, Conciliado = reconciled or has CL match)
    if (filtroPendencia === 'pending') {
      // Pendente: status is pending AND no suggested match (CL)
      filtered = filtered.filter((e) => {
        const processed = processedEntries.get(e.id);
        const hasSuggestedMatch = processed?.action === 'CL';
        return e.status === 'pending' && !hasSuggestedMatch;
      });
    } else if (filtroPendencia === 'reconciled') {
      // Conciliado: status is reconciled OR has suggested match (CL)
      filtered = filtered.filter((e) => {
        const processed = processedEntries.get(e.id);
        const hasSuggestedMatch = processed?.action === 'CL';
        return e.status === 'reconciled' || hasSuggestedMatch;
      });
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

    // Add action info
    const entriesWithAction: StatementEntryWithAction[] = filtered.map(e => {
      const processed = processedEntries.get(e.id);
      return {
        ...e,
        _action: processed?.action || null,
        _matchedTransactionId: processed?.matchedTransactionId || null,
        _matchScore: processed?.matchScore || 0,
      };
    });

    // Sort by date descending
    return entriesWithAction.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [statementEntries, selectedAccountId, filtroLocalizacao, filtroTipo, filtroPendencia, searchExtrato, processedEntries]);

  // Get positioned statement item
  const positionedStatementItem = useMemo(() => {
    if (!positionedStatementId) return null;
    return filteredStatementEntries.find((e) => e.id === positionedStatementId) || null;
  }, [positionedStatementId, filteredStatementEntries]);

  // Get IDs of transactions that are already reconciled with statement entries (from database)
  const reconciledTransactionIds = useMemo(() => {
    return new Set(
      statementEntries
        .filter(e => e.status === 'reconciled' && e.matched_transaction_id)
        .map(e => e.matched_transaction_id!)
    );
  }, [statementEntries]);

  // Get IDs of transactions that are suggested as match (CL) by the automatic processing
  const suggestedMatchTransactionIds = useMemo(() => {
    const ids = new Set<string>();
    processedEntries.forEach((value, entryId) => {
      if (value.action === 'CL' && value.matchedTransactionId) {
        ids.add(value.matchedTransactionId);
      }
    });
    return ids;
  }, [processedEntries]);

  // Filter transactions based on positioned statement item
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by account
    if (selectedAccountId) {
      filtered = filtered.filter((t) => t.account_id === selectedAccountId);
    }

    // Filter out transactions already reconciled or with suggested match (unless showing all)
    if (!mostrarTodasTransacoes) {
      filtered = filtered.filter((t) => {
        // Exclude if transaction is not pending or already reconciled in DB
        if (t.status !== 'pending' || reconciledTransactionIds.has(t.id)) {
          return false;
        }
        // Exclude if transaction has a suggested match with ANOTHER statement entry (not the current positioned one)
        if (suggestedMatchTransactionIds.has(t.id)) {
          // Allow if this is the match for the currently positioned statement
          if (positionedStatementItem?._matchedTransactionId === t.id) {
            return true;
          }
          return false;
        }
        return true;
      });
    }


    // Filter by search
    if (searchTransacoes.trim()) {
      const search = searchTransacoes.toLowerCase();
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(search) ||
        t.amount.toString().includes(search)
      );
    }

    // If we have a positioned statement with action CL, show only matched transaction
    if (positionedStatementItem) {
      if (positionedStatementItem._action === 'CL' && positionedStatementItem._matchedTransactionId) {
        // Show only the matched transaction
        const matchedTx = filtered.find(t => t.id === positionedStatementItem._matchedTransactionId);
        if (matchedTx) {
          return [{ ...matchedTx, _matchScore: positionedStatementItem._matchScore }];
        }
        return [];
      } else if (!mostrarTodasTransacoes) {
        // No match (IL) - filter by type only
        const statementType = positionedStatementItem.type;
        filtered = filtered.filter((t) => {
          const transactionType = t.type === 'income' ? 'C' : 'D';
          return transactionType === statementType;
        });

        // Calculate match scores for display
        const statementAmount = positionedStatementItem.amount;

        filtered = filtered.map((t) => {
          const amountMatch = Math.abs(t.amount - statementAmount) < 0.01;
          return {
            ...t,
            _matchScore: amountMatch ? 50 : 0,
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
    }

    // Sort by date ascending
    return [...filtered].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [transactions, selectedAccountId, searchTransacoes, positionedStatementItem, mostrarTodasTransacoes, reconciledTransactionIds, suggestedMatchTransactionIds]);

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
  const canConciliar = selectedStatement.length > 0 && selectedTransactions.length > 0 && allSelectedStatementPending;
  const canLancar = selectedStatement.length > 0 && selectedTransactions.length === 0 && allSelectedStatementPending;
  const canDesconciliar = selectedStatement.length > 0 && allSelectedStatementReconciled;
  const canRemover = selectedStatement.length > 0;

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
    setProcessedEntries(new Map());
  }, [selectedAccountId]);

  // Toggle selection
  const toggleStatement = (entry: StatementEntryWithAction) => {
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
      // Get first selected transaction ID for matching
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

      // Clear selections and processed entries for these items
      setSelectedStatement([]);
      setSelectedTransactions([]);
      setProcessedEntries(prev => {
        const next = new Map(prev);
        selectedStatementItems.forEach(e => next.delete(e.id));
        return next;
      });
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

  // Handle create transaction (Lançar Tesouraria)
  const handleLancar = () => {
    if (!canLancar) return;
    setShowLancarDialog(true);
  };

  const executeLancar = async () => {
    setIsProcessing(true);

    try {
      for (const entry of selectedStatementItems) {
        // Create transaction from statement entry
        await createTransactionMutation.mutateAsync({
          account_id: entry.account_id,
          amount: entry.amount,
          description: entry.description,
          date: entry.date,
          type: entry.type === 'C' ? 'income' : 'expense',
          status: 'completed',
        });

        // Update statement entry to reconciled
        await updateStatusMutation.mutateAsync({
          entryId: entry.id,
          status: 'reconciled',
        });
      }

      toast({
        title: "Lançamentos criados",
        description: `${selectedStatementItems.length} transação(ões) criada(s) e conciliada(s)`,
      });

      setSelectedStatement([]);
      setProcessedEntries(prev => {
        const next = new Map(prev);
        selectedStatementItems.forEach(e => next.delete(e.id));
        return next;
      });
    } catch (error) {
      toast({
        title: "Erro ao lançar",
        description: "Não foi possível criar os lançamentos",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowLancarDialog(false);
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

  // Handle remove
  const handleRemover = () => {
    if (!canRemover) return;
    setShowRemoverDialog(true);
  };

  const executeRemover = async () => {
    setIsProcessing(true);

    try {
      for (const entry of selectedStatementItems) {
        await deleteStatementMutation.mutateAsync(entry.id);
      }

      toast({
        title: "Registros removidos",
        description: `${selectedStatementItems.length} registro(s) removido(s) do extrato`,
      });

      setSelectedStatement([]);
      setProcessedEntries(prev => {
        const next = new Map(prev);
        selectedStatementItems.forEach(e => next.delete(e.id));
        return next;
      });
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover os registros",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowRemoverDialog(false);
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

  const getActionBadge = (action: ActionType) => {
    if (action === 'CL') {
      return (
        <Badge className="text-[9px] px-1 py-0 bg-blue-500 hover:bg-blue-600">
          CL
        </Badge>
      );
    }
    if (action === 'IL') {
      return (
        <Badge className="text-[9px] px-1 py-0 bg-orange-500 hover:bg-orange-600">
          IL
        </Badge>
      );
    }
    return null;
  };

  const isLoading = isLoadingTransactions || isLoadingStatement;

  return (
    <MainLayout title="Conciliação" subtitle="Compare e concilie transações bancárias" onRefresh={processReconciliation}>
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

      {/* Lançar Dialog */}
      <AlertDialog open={showLancarDialog} onOpenChange={setShowLancarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lançar Tesouraria</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Deseja criar lançamentos para os {selectedStatementItems.length} registro(s) selecionado(s)?</p>
                <div className="mt-3 p-3 bg-muted rounded-md space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Total:</span>{" "}
                    <span className="font-semibold">
                      {statementTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Serão criadas transações no sistema e os registros do extrato serão marcados como conciliados.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeLancar} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Criar Lançamentos'
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

      {/* Remover Dialog */}
      <AlertDialog open={showRemoverDialog} onOpenChange={setShowRemoverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover {selectedStatementItems.length} registro(s) do extrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeRemover} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Remover'
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
            {/* Header Actions - Following reference layout */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              {/* Left side - Location filters */}
              <div className="flex items-center gap-2">
                <Button
                  variant={filtroLocalizacao === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroLocalizacao('todos')}
                >
                  Todos
                </Button>
                <Button
                  variant={filtroLocalizacao === 'localizado' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroLocalizacao('localizado')}
                  className="gap-1"
                >
                  <Search className="h-3 w-3" />
                  Localizado
                </Button>
                <Button
                  variant={filtroLocalizacao === 'nao_localizado' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroLocalizacao('nao_localizado')}
                  className="gap-1"
                >
                  <SearchX className="h-3 w-3" />
                  Não localizado
                </Button>
              </div>

              {/* Right side - Action buttons with colors from reference */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleConciliar}
                  disabled={!canConciliar}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Conciliar
                </Button>
                <Button
                  onClick={handleLancar}
                  disabled={!canLancar}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Lançar Tesouraria
                </Button>
                <Button
                  onClick={handleDesconciliar}
                  disabled={!canDesconciliar}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Desconciliar
                </Button>
                <Button
                  onClick={handleRemover}
                  disabled={!canRemover}
                  size="sm"
                  className="bg-red-400 hover:bg-red-500 text-white"
                >
                  Remover
                </Button>
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
                    <div className="flex items-center gap-2">
                      {/* Status filter */}
                      <div className="flex gap-1 bg-muted p-1 rounded-lg">
                        <Button
                          variant={filtroPendencia === 'todos' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setFiltroPendencia('todos')}
                          className="text-xs h-7 px-3"
                        >
                          Todos
                        </Button>
                        <Button
                          variant={filtroPendencia === 'pending' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setFiltroPendencia('pending')}
                          className="text-xs h-7 px-3"
                        >
                          Pendente
                        </Button>
                        <Button
                          variant={filtroPendencia === 'reconciled' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setFiltroPendencia('reconciled')}
                          className="text-xs h-7 px-3"
                        >
                          Conciliado
                        </Button>
                      </div>
                      {/* Type filter */}
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
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por descrição, documento, CPF/CNPJ, valor, data..."
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
                      Nenhuma transação pendente no extrato
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
                              variant={entry._action === 'CL' ? 'default' : entry.status === 'pending' ? 'destructive' : 'secondary'}
                              className={cn(
                                "text-[9px] px-1 py-0",
                                entry._action === 'CL' && "bg-blue-500 hover:bg-blue-600"
                              )}
                            >
                              {entry._action === 'CL' ? 'Conciliado' : entry.status === 'pending' ? 'Pendente' : 'Conciliado'}
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
                      <h3 className="font-semibold">Transações</h3>
                      <p className="text-sm text-muted-foreground">
                        {filteredTransactions.length} lançamentos do sistema
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por pessoa, observação, documento, valor, data..."
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
                  {/* Exibir todas transações checkbox */}
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="mostrarTodas"
                      checked={mostrarTodasTransacoes}
                      onCheckedChange={(checked) => setMostrarTodasTransacoes(!!checked)}
                    />
                    <label htmlFor="mostrarTodas" className="text-xs text-muted-foreground cursor-pointer">
                      Exibir todas transações
                    </label>
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
                              {positionedStatementItem?._action === 'CL' && positionedStatementItem?._matchedTransactionId === t.id && (
                                <Badge className="text-[9px] px-1 py-0 bg-blue-500 hover:bg-blue-600">Conciliado</Badge>
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

            {/* Bottom action bar with Processar button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={processReconciliation}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Processar Conciliação
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Reconciliation;
