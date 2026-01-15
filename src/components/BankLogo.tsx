import { Building2 } from 'lucide-react';
import { getBankLogo } from '@/utils/bankLogos';
import { cn } from '@/lib/utils';

interface BankLogoProps {
  bankName: string;
  fallbackColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function BankLogo({ bankName, fallbackColor = '#3B82F6', size = 'md', className }: BankLogoProps) {
  const logo = getBankLogo(bankName);

  if (logo) {
    return (
      <div className={cn(
        'rounded-xl flex items-center justify-center bg-white overflow-hidden p-1.5',
        sizeClasses[size],
        className
      )}>
        <img 
          src={logo} 
          alt={`${bankName} logo`} 
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Fallback to icon with color
  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: `${fallbackColor}20` }}
    >
      <Building2 className={iconSizeClasses[size]} style={{ color: fallbackColor }} />
    </div>
  );
}
