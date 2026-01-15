import santanderLogo from '@/assets/banks/santander.svg';
import nubankLogo from '@/assets/banks/nubank.svg';
import itauLogo from '@/assets/banks/itau.svg';
import interLogo from '@/assets/banks/inter.svg';
import caixaLogo from '@/assets/banks/caixa.svg';
import c6BankLogo from '@/assets/banks/c6-bank.svg';
import bradescoLogo from '@/assets/banks/bradesco.svg';
import bancoDoBrasilLogo from '@/assets/banks/banco-do-brasil.svg';

type BankLogoMap = {
  [key: string]: string;
};

const bankLogos: BankLogoMap = {
  // Santander variations
  'santander': santanderLogo,
  'banco santander': santanderLogo,
  
  // Nubank variations
  'nubank': nubankLogo,
  'nu': nubankLogo,
  
  // Itaú variations
  'itau': itauLogo,
  'itaú': itauLogo,
  'banco itau': itauLogo,
  'banco itaú': itauLogo,
  'itaú unibanco': itauLogo,
  'itau unibanco': itauLogo,
  
  // Inter variations
  'inter': interLogo,
  'banco inter': interLogo,
  
  // Caixa variations
  'caixa': caixaLogo,
  'cef': caixaLogo,
  'caixa economica': caixaLogo,
  'caixa econômica': caixaLogo,
  'caixa economica federal': caixaLogo,
  'caixa econômica federal': caixaLogo,
  
  // C6 Bank variations
  'c6': c6BankLogo,
  'c6 bank': c6BankLogo,
  'c6bank': c6BankLogo,
  
  // Bradesco variations
  'bradesco': bradescoLogo,
  'banco bradesco': bradescoLogo,
  
  // Banco do Brasil variations
  'banco do brasil': bancoDoBrasilLogo,
  'bb': bancoDoBrasilLogo,
  'brasil': bancoDoBrasilLogo,
};

export function getBankLogo(bankName: string): string | null {
  const normalizedName = bankName.toLowerCase().trim();
  return bankLogos[normalizedName] || null;
}

export function hasBankLogo(bankName: string): boolean {
  return getBankLogo(bankName) !== null;
}

export const availableBanks = [
  { name: 'Nubank', logo: nubankLogo },
  { name: 'Inter', logo: interLogo },
  { name: 'Itaú', logo: itauLogo },
  { name: 'Santander', logo: santanderLogo },
  { name: 'Bradesco', logo: bradescoLogo },
  { name: 'Banco do Brasil', logo: bancoDoBrasilLogo },
  { name: 'Caixa', logo: caixaLogo },
  { name: 'C6 Bank', logo: c6BankLogo },
];
