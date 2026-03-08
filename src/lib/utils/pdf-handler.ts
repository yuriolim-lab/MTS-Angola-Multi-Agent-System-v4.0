import fs from 'fs';
import path from 'path';

// PDF document paths
const DOCUMENTS_DIR = path.join(process.cwd(), 'public', 'documents');

// Available PDF documents
export const PDF_DOCUMENTS = {
  marketing: {
    filename: 'Marketing_MTS.pdf',
    description: 'Apresentacao da Empresa MTS Angola',
    allowedAgents: ['mariana', 'pedro', 'claudia']
  },
  quotation: {
    filename: 'Quotation_MTS.pdf',
    description: 'Tabela de Precos e Servicos MTS Angola',
    allowedAgents: ['claudia'] // Only Claudia can send quotations!
  }
} as const;

// Check if PDF exists
export function pdfExists(filename: string): boolean {
  const filePath = path.join(DOCUMENTS_DIR, filename);
  return fs.existsSync(filePath);
}

// Get PDF file path
export function getPdfPath(filename: string): string {
  return path.join(DOCUMENTS_DIR, filename);
}

// Read PDF file as buffer
export function readPdfBuffer(filename: string): Buffer | null {
  const filePath = path.join(DOCUMENTS_DIR, filename);
  
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return null;
  } catch (error) {
    console.error(`[PDF HANDLER] Error reading PDF ${filename}:`, error);
    return null;
  }
}

// Get PDF file size
export function getPdfSize(filename: string): number | null {
  const filePath = path.join(DOCUMENTS_DIR, filename);
  
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.size;
    }
    return null;
  } catch {
    return null;
  }
}

// Check if agent is allowed to send PDF
export function canAgentSendPdf(
  agent: string,
  pdfType: keyof typeof PDF_DOCUMENTS
): boolean {
  const pdf = PDF_DOCUMENTS[pdfType];
  if (!pdf) return false;
  
  return (pdf.allowedAgents as readonly string[]).includes(agent);
}

// Get all available PDFs with their status
export function getAvailablePdfs(): Array<{
  type: keyof typeof PDF_DOCUMENTS;
  filename: string;
  description: string;
  exists: boolean;
  size: number | null;
}> {
  return Object.entries(PDF_DOCUMENTS).map(([type, info]) => ({
    type: type as keyof typeof PDF_DOCUMENTS,
    filename: info.filename,
    description: info.description,
    exists: pdfExists(info.filename),
    size: getPdfSize(info.filename)
  }));
}

// Verify all required PDFs exist
export function verifyRequiredPdfs(): {
  allExist: boolean;
  missing: string[];
  existing: string[];
} {
  const missing: string[] = [];
  const existing: string[] = [];
  
  for (const [, info] of Object.entries(PDF_DOCUMENTS)) {
    if (pdfExists(info.filename)) {
      existing.push(info.filename);
    } else {
      missing.push(info.filename);
    }
  }
  
  return {
    allExist: missing.length === 0,
    missing,
    existing
  };
}

// Create documents directory if it doesn't exist
export function ensureDocumentsDir(): void {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
    console.log(`[PDF HANDLER] Created documents directory: ${DOCUMENTS_DIR}`);
  }
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
