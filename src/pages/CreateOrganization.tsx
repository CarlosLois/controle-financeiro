import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDocument, validateDocument } from '@/utils/documentMask';

export default function CreateOrganization() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [document, setDocument] = useState('');
  const [documentError, setDocumentError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    // Validate document
    if (!validateDocument(document)) {
      setDocumentError('CNPJ ou CPF inválido');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create the organization
      const cleanDocument = document.replace(/\D/g, '');
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          document: cleanDocument,
          name: name,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as admin of the organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: user!.id,
          role: 'admin',
          password_set: true,
        });

      if (memberError) throw memberError;

      toast.success('Organização criada com sucesso!');
      navigate('/');
    } catch (error: any) {
      toast.error('Erro ao criar organização: ' + error.message);
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
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Criar Organização</h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Você ainda não pertence a nenhuma organização. Crie uma para começar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Organização'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
