import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentMember } from '@/hooks/useOrganization';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { data: currentMember, isLoading: memberLoading, error } = useCurrentMember();
  const location = useLocation();

  if (loading || (user && memberLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no organization and is not on the create-organization page
  if (!currentMember && !memberLoading && location.pathname !== '/create-organization') {
    return <Navigate to="/create-organization" replace />;
  }

  return <>{children}</>;
}
