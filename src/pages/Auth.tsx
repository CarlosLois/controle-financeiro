import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const { user, loading, signIn, registerOrganization, checkPasswordSet } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);

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
    const document = formData.get('document') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
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

    const { error } = await registerOrganization({ document, name, email, password });
    if (error) {
      toast.error('Erro ao cadastrar organização: ' + error.message);
    } else {
      toast.success('Organização cadastrada! Você já está logado.');
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
          <h1 className="text-2xl font-bold text-foreground">Controle Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas finanças com facilidade</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
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
                  placeholder="00.000.000/0000-00"
                  required
                />
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
                <Input
                  id="register-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
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
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
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
