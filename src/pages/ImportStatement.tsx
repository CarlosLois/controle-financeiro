import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useAccountFilter } from "@/contexts/AccountFilterContext";
import { useImportBankStatement, usePendingStatementEntries } from "@/hooks/useBankStatementEntries";
import { BankLogo } from "@/components/BankLogo";
import { parseOFX, OFXTransaction, OFXBankInfo } from "@/utils/ofxParser";
import { getBankNameFromCode } from "@/utils/bankLogos";

interface FileWithData {
  name: string;
  size: number;
  status: "pending" | "processing" | "success" | "error";
  file?: File;
  transactions?: OFXTransaction[];
  bankInfo?: OFXBankInfo;
  errorMessage?: string;
}

const ImportStatement = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileData, setFileData] = useState<FileWithData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: bankAccounts = [] } = useBankAccounts();
  const { selectedAccountId } = useAccountFilter();
  const importMutation = useImportBankStatement();

  // Find the selected account
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return undefined;
    return bankAccounts.find((acc) => acc.id === selectedAccountId);
  }, [selectedAccountId, bankAccounts]);

  // Get pending entries for this account
  const { data: pendingEntries = [] } = usePendingStatementEntries(selectedAccountId || undefined);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      processFile(droppedFiles[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const processFile = async (file: File) => {
    const isValid = file.name.toLowerCase().endsWith(".ofx");
    
    if (!isValid) {
      setFileData({
        name: file.name,
        size: file.size,
        status: "error",
        errorMessage: "Formato inválido. Apenas arquivos OFX são aceitos.",
      });
      return;
    }

    setFileData({
      name: file.name,
      size: file.size,
      status: "processing",
      file,
    });

    try {
      const content = await file.text();
      const parseResult = parseOFX(content);
      
      if (parseResult.transactions.length === 0) {
        setFileData({
          name: file.name,
          size: file.size,
          status: "error",
          errorMessage: "Nenhuma transação encontrada no arquivo.",
        });
        return;
      }

      setFileData({
        name: file.name,
        size: file.size,
        status: "pending",
        file,
        transactions: parseResult.transactions,
        bankInfo: parseResult.bankInfo,
      });
    } catch (error) {
      console.error("Error parsing OFX file:", error);
      setFileData({
        name: file.name,
        size: file.size,
        status: "error",
        errorMessage: "Erro ao ler o arquivo OFX.",
      });
    }
  };

  const removeFile = () => {
    setFileData(null);
  };

  const handleImportClick = () => {
    if (!selectedAccountId || !selectedAccount) {
      return;
    }

    if (!fileData || !fileData.transactions || fileData.transactions.length === 0) {
      return;
    }

    setShowConfirmDialog(true);
  };

  // Get bank name from OFX code and check if it matches account
  const fileBankName = useMemo(() => {
    if (!fileData?.bankInfo?.bankId) return null;
    return getBankNameFromCode(fileData.bankInfo.bankId);
  }, [fileData?.bankInfo?.bankId]);

  const bankNameMatch = useMemo(() => {
    if (!fileBankName || !selectedAccount?.bank) return null;
    const accountBankNormalized = selectedAccount.bank.toLowerCase().trim();
    const fileBankNormalized = fileBankName.toLowerCase().trim();
    return accountBankNormalized.includes(fileBankNormalized) || fileBankNormalized.includes(accountBankNormalized);
  }, [fileBankName, selectedAccount?.bank]);

  const handleConfirmImport = async () => {
    setShowConfirmDialog(false);
    
    if (!selectedAccountId || !fileData?.transactions) return;

    setFileData((prev) => prev ? { ...prev, status: "processing" } : null);

    try {
      await importMutation.mutateAsync({
        accountId: selectedAccountId,
        transactions: fileData.transactions,
      });

      setFileData((prev) => prev ? { ...prev, status: "success" } : null);
    } catch {
      setFileData((prev) => prev ? { ...prev, status: "error", errorMessage: "Erro ao importar extrato" } : null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "dd MMM yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <MainLayout title="Importar Extrato" subtitle="Importe arquivos OFX do seu banco">
      <div className="space-y-6">
        {/* When no account selected */}
        {!selectedAccountId && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Selecione uma conta para continuar</p>
                <p className="text-sm text-muted-foreground">
                  Use o seletor de contas no menu superior.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Upload area when account is selected */}
        {selectedAccountId && (
          <>
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Upload do Arquivo</h2>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 transition-all",
                  "flex flex-col items-center justify-center text-center cursor-pointer",
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                {!fileData ? (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Arraste o arquivo aqui</p>
                    <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                    <input
                      type="file"
                      accept=".ofx"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" asChild>
                        <span>Selecionar Arquivo</span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-4">Formato aceito: OFX</p>
                  </>
                ) : (
                  <div className="w-full flex items-center gap-4 p-4 bg-muted rounded-lg">
                    {fileData.status === "processing" ? (
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    ) : (
                      <FileText className="h-8 w-8 text-primary" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium">{fileData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(fileData.size)}
                        {fileData.transactions && ` • ${fileData.transactions.length} transações`}
                        {fileData.errorMessage && (
                          <span className="text-destructive"> • {fileData.errorMessage}</span>
                        )}
                      </p>
                    </div>
                    {fileData.status === "success" && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                    {fileData.status === "error" && <AlertCircle className="h-6 w-6 text-destructive" />}
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Preview of transactions */}
              {fileData?.transactions && fileData.transactions.length > 0 && fileData.status === "pending" && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Prévia das transações ({fileData.transactions.length})
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {fileData.transactions.slice(0, 10).map((tx, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-2 rounded-full",
                              tx.type === "C" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                            )}
                          >
                            {tx.type === "C" ? (
                              <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tx.memo || "Sem descrição"}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(tx.datePosted)}</p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "font-semibold",
                            tx.type === "C" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {tx.type === "C" ? "+" : "-"}
                          {tx.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                    ))}
                    {fileData.transactions.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        ... e mais {fileData.transactions.length - 10} transações
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={removeFile} disabled={!fileData || importMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleImportClick}
                disabled={!fileData?.transactions || fileData.status !== "pending" || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  "Importar Extrato"
                )}
              </Button>
            </div>

            {/* Pending entries list */}
            {pendingEntries.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Lançamentos Pendentes</h2>
                  <span className="text-sm text-muted-foreground">
                    {pendingEntries.length} registro{pendingEntries.length > 1 ? "s" : ""} aguardando conciliação
                  </span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pendingEntries.map((entry) => {
                    const isCredit = entry.type === "C";
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-2 rounded-full",
                              isCredit ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                            )}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{entry.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(entry.date)}
                              {entry.check_number && ` • Doc: ${entry.check_number}`}
                            </p>
                            {selectedAccount && (
                              <div className="flex items-center gap-2 mt-1">
                                <BankLogo bankName={selectedAccount.bank} size="xs" />
                                <span className="text-xs text-muted-foreground">
                                  {selectedAccount.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "font-semibold",
                              isCredit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}
                          >
                            {isCredit ? "+" : "-"}
                            {entry.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">
                            Pendente
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>Verifique se os dados do arquivo correspondem à conta selecionada:</p>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                    <p>
                      <strong>Banco do arquivo:</strong> {fileBankName || "Não identificado"}
                    </p>
                    <p>
                      <strong>Conta selecionada:</strong> {selectedAccount?.bank || "-"}
                    </p>
                    <p>
                      <strong>Transações:</strong> {fileData?.transactions?.length || 0} registro(s)
                    </p>
                  </div>
                  
                  {bankNameMatch === false && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Atenção: O banco do arquivo ({fileBankName || "desconhecido"}) não corresponde à conta selecionada ({selectedAccount?.bank}). 
                        Deseja continuar mesmo assim?
                      </p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default ImportStatement;
