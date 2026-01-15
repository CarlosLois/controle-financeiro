// OFX Parser utility for reading bank statement files

export interface OFXTransaction {
  fitId: string; // Unique transaction ID from bank
  type: 'C' | 'D'; // Credit or Debit
  datePosted: string; // YYYY-MM-DD format
  amount: number;
  memo: string;
  checkNumber?: string;
}

export interface OFXBankInfo {
  bankId: string;
  accountId: string;
  accountType?: string;
}

export interface OFXParseResult {
  transactions: OFXTransaction[];
  bankInfo: OFXBankInfo;
}

function extractTagValue(content: string, tagName: string): string {
  // Match <TAGNAME>value or <TAGNAME>value</TAGNAME>
  const regex = new RegExp(`<${tagName}>([^<\\n]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function parseOFXDate(dateStr: string): string {
  // OFX dates are in format: YYYYMMDDHHMMSS or YYYYMMDD
  if (!dateStr || dateStr.length < 8) return '';
  
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  return `${year}-${month}-${day}`;
}

export function parseOFX(content: string): OFXParseResult {
  const transactions: OFXTransaction[] = [];
  
  // Extract bank info
  const bankInfo: OFXBankInfo = {
    bankId: extractTagValue(content, 'BANKID'),
    accountId: extractTagValue(content, 'ACCTID'),
    accountType: extractTagValue(content, 'ACCTTYPE'),
  };
  
  // Find all STMTTRN blocks (statement transactions)
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/STMTTRN>|<\/BANKTRANLIST>)/gi;
  let match;
  
  while ((match = stmttrnRegex.exec(content)) !== null) {
    const block = match[1];
    
    const trnType = extractTagValue(block, 'TRNTYPE');
    const datePosted = extractTagValue(block, 'DTPOSTED');
    const amount = extractTagValue(block, 'TRNAMT');
    const fitId = extractTagValue(block, 'FITID');
    const memo = extractTagValue(block, 'MEMO') || extractTagValue(block, 'NAME');
    const checkNumber = extractTagValue(block, 'CHECKNUM');
    
    if (fitId && amount && datePosted) {
      const amountNum = parseFloat(amount.replace(',', '.'));
      
      transactions.push({
        fitId,
        type: amountNum >= 0 ? 'C' : 'D',
        datePosted: parseOFXDate(datePosted),
        amount: Math.abs(amountNum),
        memo: memo || 'Sem descrição',
        checkNumber: checkNumber || undefined,
      });
    }
  }
  
  return { transactions, bankInfo };
}
