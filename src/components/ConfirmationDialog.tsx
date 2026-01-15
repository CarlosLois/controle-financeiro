import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type ConfirmationType = 'create' | 'update' | 'delete';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type: ConfirmationType;
  title?: string;
  description?: string;
  itemName?: string;
}

const defaultConfig: Record<ConfirmationType, { title: string; description: string; confirmText: string; variant: 'default' | 'destructive' }> = {
  create: {
    title: 'Confirmar Criação',
    description: 'Deseja realmente criar este item?',
    confirmText: 'Criar',
    variant: 'default',
  },
  update: {
    title: 'Confirmar Alteração',
    description: 'Deseja realmente salvar as alterações?',
    confirmText: 'Salvar',
    variant: 'default',
  },
  delete: {
    title: 'Confirmar Exclusão',
    description: 'Esta ação não pode ser desfeita. Deseja realmente excluir este item?',
    confirmText: 'Excluir',
    variant: 'destructive',
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  type,
  title,
  description,
  itemName,
}: ConfirmationDialogProps) {
  const config = defaultConfig[type];
  
  const finalDescription = description 
    ? description 
    : itemName 
      ? `${config.description.replace('este item', `"${itemName}"`)}` 
      : config.description;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || config.title}</AlertDialogTitle>
          <AlertDialogDescription>{finalDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={config.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {config.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
