import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Loader2, Building2, ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { formatDocument, validateDocument } from '@/utils/documentMask';

interface FoundOrganization {
  id: string;
  name: string;
  document: string;
}

type LoginStep = 'document' | 'credentials' | 'set-password';

export default function Auth() {
  const { user, loading, signIn, registerOrganization, checkPasswordSet } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [document, setDocument] = useState('');
  const [documentError, setDocumentError] = useState('');

  // Login flow state
  const [loginStep, setLoginStep] = useState<LoginStep>('document');
  const [loginDocument, setLoginDocument] = useState('');
  const [loginDocumentError, setLoginDocumentError] = useState('');
  const [foundOrg, setFoundOrg] = useState<FoundOrganization | null>(null);
  const [isSearchingOrg, setIsSearchingOrg] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

  useEffect(() => {
    const checkPassword = async () => {
      if (user) {
        setCheckingPassword(true);
        const isSet = await checkPasswordSet();
        setNeedsPassword(!isSet);
        setCheckingPassword(false);
      }
    };
    checkPassword();
  }, [user, checkPasswordSet]);

  if (loading || checkingPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !needsPassword) {
    return <Navigate to="/" replace />;
  }

  if (user && needsPassword) {
    return <SetPasswordForm />;
  }

  const handleFindOrganization = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSearchingOrg(true);
    setLoginDocumentError('');

    if (!validateDocument(loginDocument)) {
      setLoginDocumentError('CNPJ ou CPF inválido');
      setIsSearchingOrg(false);
      return;
    }

    const cleanDocument = loginDocument.replace(/\D/g, '');

    const { data, error } = await supabase
      .rpc('find_organization_by_document', { _document: cleanDocument });

    if (error) {
      toast.error('Erro ao buscar organização: ' + error.message);
      setIsSearchingOrg(false);
      return;
    }

    if (!data || data.length === 0) {
      setLoginDocumentError('Organização não encontrada. Verifique o documento ou cadastre uma nova.');
      setIsSearchingOrg(false);
      return;
    }

    setFoundOrg(data[0] as FoundOrganization);
    setLoginStep('credentials');
    setIsSearchingOrg(false);
  };

  const handleLoginDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value);
    setLoginDocument(formatted);
    setLoginDocumentError('');
  };

  const handleBackToDocument = () => {
    setLoginStep('document');
    setFoundOrg(null);
    setLoginEmail('');
    setIsNewUser(false);
    setShowPasswordField(false);
  };

  const handleBackToCredentials = () => {
    setLoginStep('credentials');
    setIsNewUser(false);
    setShowPasswordField(false);
  };

  const handleCheckUserAndProceed = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!foundOrg) return;

    setIsCheckingUser(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    setLoginEmail(email);

    try {
      const { data, error } = await supabase.functions.invoke('check-new-user', {
        body: { email, organizationId: foundOrg.id }
      });

      if (error) throw error;

      if (!data.exists) {
        toast.error('Usuário não encontrado nesta organização');
        setIsCheckingUser(false);
        return;
      }

      if (data.needsPassword) {
        setIsNewUser(true);
        setLoginStep('set-password');
      } else {
        // User exists and has password, show password field
        setIsNewUser(false);
        setShowPasswordField(true);
      }
    } catch (error: any) {
      toast.error('Erro ao verificar usuário: ' + error.message);
    }
    setIsCheckingUser(false);
  };

  const handleSetFirstPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!foundOrg) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('set-first-password', {
        body: { 
          email: loginEmail, 
          organizationId: foundOrg.id,
          password 
        }
      });

      if (error) throw error;

      toast.success('Senha definida com sucesso! Fazendo login...');
      
      // Auto login after setting password
      const { error: signInError } = await signIn(loginEmail, password);
      if (signInError) {
        toast.error('Erro ao fazer login: ' + signInError.message);
      }
    } catch (error: any) {
      toast.error('Erro ao definir senha: ' + error.message);
    }
    setIsSubmitting(false);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    if (error) {
      toast.error('Erro ao entrar: ' + error.message);
    }
    setIsSubmitting(false);
  };

  const handleRegisterOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validate document
    if (!validateDocument(document)) {
      setDocumentError('CNPJ ou CPF inválido');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      setIsSubmitting(false);
      return;
    }

    // Remove formatting before saving
    const cleanDocument = document.replace(/\D/g, '');
    const { error } = await registerOrganization({ document: cleanDocument, name, email, password });
    if (error) {
      toast.error('Erro ao cadastrar organização: ' + error.message);
    } else {
      toast.success('Organização cadastrada! Você já está logado.');
    }
    setIsSubmitting(false);
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value);
    setDocument(formatted);
    setDocumentError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md p-8 glass-card">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Controle Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas finanças com facilidade</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            {loginStep === 'document' && (
              <form onSubmit={handleFindOrganization} className="space-y-4">
                <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Identificação da Organização</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-document">CNPJ ou CPF da Organização</Label>
                  <Input
                    id="login-document"
                    name="document"
                    type="text"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    value={loginDocument}
                    onChange={handleLoginDocumentChange}
                    className={loginDocumentError ? 'border-destructive' : ''}
                    required
                  />
                  {loginDocumentError && (
                    <p className="text-sm text-destructive">{loginDocumentError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSearchingOrg}>
                  {isSearchingOrg ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </form>
            )}

            {loginStep === 'credentials' && (
              <>
                {!showPasswordField ? (
                  <form onSubmit={handleCheckUserAndProceed} className="space-y-4">
                    <button
                      type="button"
                      onClick={handleBackToDocument}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>

                    {foundOrg && (
                      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg mb-4">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{foundOrg.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDocument(foundOrg.document)}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isCheckingUser}>
                      {isCheckingUser ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        'Continuar'
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <button
                      type="button"
                      onClick={handleBackToDocument}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>

                    {foundOrg && (
                      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg mb-4">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{foundOrg.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDocument(foundOrg.document)}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="flex gap-2">
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          value={loginEmail}
                          readOnly
                          className="bg-muted flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowPasswordField(false)}
                          title="Alterar email"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <PasswordInput
                        id="login-password"
                        name="password"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>
                  </form>
                )}
              </>
            )}

            {loginStep === 'set-password' && (
              <form onSubmit={handleSetFirstPassword} className="space-y-4">
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>

                {foundOrg && (
                  <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg mb-4">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{foundOrg.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDocument(foundOrg.document)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4 p-3 bg-amber-500/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-amber-600" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    Primeiro acesso! Defina sua senha.
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="set-email">Email</Label>
                  <Input
                    id="set-email"
                    type="email"
                    value={loginEmail}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-password">Nova Senha</Label>
                  <PasswordInput
                    id="set-password"
                    name="password"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-confirm-password">Confirmar Senha</Label>
                  <PasswordInput
                    id="set-confirm-password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Definir Senha e Entrar'
                  )}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegisterOrg} className="space-y-4">
              <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Cadastro de Organização</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="document">CNPJ ou CPF</Label>
                <Input
                  id="document"
                  name="document"
                  type="text"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={document}
                  onChange={handleDocumentChange}
                  className={documentError ? 'border-destructive' : ''}
                  required
                />
                {documentError && (
                  <p className="text-sm text-destructive">{documentError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Razão Social / Nome</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nome da empresa ou pessoa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email do Administrador</Label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="admin@empresa.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Senha</Label>
                <PasswordInput
                  id="register-password"
                  name="password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <PasswordInput
                  id="confirm-password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar Organização'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function SetPasswordForm() {
  const { setPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      setIsSubmitting(false);
      return;
    }

    const { error } = await setPassword(password);
    if (error) {
      toast.error('Erro ao definir senha: ' + error.message);
    } else {
      toast.success('Senha definida com sucesso!');
      window.location.reload();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md p-8 glass-card">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Defina sua Senha</h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Este é seu primeiro acesso. Por favor, defina uma senha para sua conta.
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Definir Senha'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}