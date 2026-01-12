export function formatDocument(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 14 digits (CNPJ max)
  const limited = digits.slice(0, 14);
  
  if (limited.length <= 11) {
    // Format as CPF: 000.000.000-00
    return limited
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // Format as CNPJ: 00.000.000/0000-00
    return limited
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

export function validateDocument(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 11) {
    return validateCPF(digits);
  } else if (digits.length === 14) {
    return validateCNPJ(digits);
  }
  
  return false;
}

function validateCPF(cpf: string): boolean {
  // Check for known invalid CPFs
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[9])) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[10])) return false;
  
  return true;
}

function validateCNPJ(cnpj: string): boolean {
  // Check for known invalid CNPJs
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Validate first digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cnpj[12])) return false;
  
  // Validate second digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cnpj[13])) return false;
  
  return true;
}
