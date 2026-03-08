// MTS Angola - Document Management Service
// Manages PDF documents with agent-based access control

import fs from 'fs';
import path from 'path';

// Base documents directory
const DOCUMENTS_DIR = path.join(process.cwd(), 'public', 'documents');

// Document configuration by agent
export const AGENT_DOCUMENTS = {
  mariana: {
    folder: 'mariana',
    role: 'Marketing & CRM',
    canSend: ['portfolio'],
    documents: {
      portfolio: {
        filename: 'MARSHIPPING_PORTFOLIO.pdf',
        description: 'Portfolio de Servicos MTS Angola',
        type: 'marketing',
        allowedRecipients: ['prospects', 'clients', 'leads'],
      },
    },
  },
  claudia: {
    folder: 'claudia',
    role: 'CEO Comercial & Financeiro',
    canSend: ['hull_cleaning', 'shipchandler_waste'],
    documents: {
      hull_cleaning: {
        filename: 'Hull_Cleaning_Quotation.pdf',
        description: 'Cotacao Hull Cleaning - Limpeza de Casco',
        type: 'quotation',
        allowedRecipients: ['qualified', 'hot'],
      },
      shipchandler_waste: {
        filename: 'Shipchandler_Waste_Quotation.pdf',
        description: 'Cotacao Shipchandler + Waste Management',
        type: 'quotation',
        allowedRecipients: ['qualified', 'hot'],
      },
    },
  },
  pedro: {
    folder: '',
    role: 'Operacoes & Inteligencia',
    canSend: [], // Pedro não envia documentos, apenas relatórios
    documents: {},
  },
} as const;

export type AgentName = keyof typeof AGENT_DOCUMENTS;
export type DocumentType<T extends AgentName> = keyof typeof AGENT_DOCUMENTS[T]['documents'];

// Document info interface
interface DocumentInfo {
  filename: string;
  description: string;
  type: string;
  path: string;
  exists: boolean;
  size: number | null;
}

// Check if document exists
export function documentExists(agent: AgentName, docType: string): boolean {
  const agentConfig = AGENT_DOCUMENTS[agent];
  if (!agentConfig || !agentConfig.documents[docType as keyof typeof agentConfig.documents]) {
    return false;
  }

  const doc = agentConfig.documents[docType as keyof typeof agentConfig.documents] as {
    filename: string;
  };
  const folder = agentConfig.folder;
  const filePath = folder
    ? path.join(DOCUMENTS_DIR, folder, doc.filename)
    : path.join(DOCUMENTS_DIR, doc.filename);

  return fs.existsSync(filePath);
}

// Get document path
export function getDocumentPath(agent: AgentName, docType: string): string | null {
  const agentConfig = AGENT_DOCUMENTS[agent];
  if (!agentConfig) return null;

  const docs = agentConfig.documents as Record<string, { filename: string }>;
  const doc = docs[docType];
  if (!doc) return null;

  const folder = agentConfig.folder;
  const filePath = folder
    ? path.join(DOCUMENTS_DIR, folder, doc.filename)
    : path.join(DOCUMENTS_DIR, doc.filename);

  return fs.existsSync(filePath) ? filePath : null;
}

// Get all documents for an agent
export function getAgentDocuments(agent: AgentName): DocumentInfo[] {
  const agentConfig = AGENT_DOCUMENTS[agent];
  if (!agentConfig) return [];

  const documents: DocumentInfo[] = [];
  const docs = agentConfig.documents as Record<string, {
    filename: string;
    description: string;
    type: string;
  }>;

  for (const [docType, doc] of Object.entries(docs)) {
    const folder = agentConfig.folder;
    const filePath = folder
      ? path.join(DOCUMENTS_DIR, folder, doc.filename)
      : path.join(DOCUMENTS_DIR, doc.filename);

    const exists = fs.existsSync(filePath);
    let size: number | null = null;

    if (exists) {
      try {
        const stats = fs.statSync(filePath);
        size = stats.size;
      } catch {
        size = null;
      }
    }

    documents.push({
      filename: doc.filename,
      description: doc.description,
      type: doc.type,
      path: filePath,
      exists,
      size,
    });
  }

  return documents;
}

// Verify agent can send document type
export function canAgentSendDocument(agent: AgentName, docType: string): boolean {
  const agentConfig = AGENT_DOCUMENTS[agent];
  if (!agentConfig) return false;

  return agentConfig.canSend.includes(docType as never);
}

// Get all available documents with status
export function getAllDocumentsStatus(): Record<AgentName, {
  role: string;
  documents: DocumentInfo[];
  canSend: readonly string[];
}> {
  const result: Record<AgentName, {
    role: string;
    documents: DocumentInfo[];
    canSend: readonly string[];
  }> = {} as Record<AgentName, {
    role: string;
    documents: DocumentInfo[];
    canSend: readonly string[];
  }>;

  for (const [agent, config] of Object.entries(AGENT_DOCUMENTS)) {
    result[agent as AgentName] = {
      role: config.role,
      documents: getAgentDocuments(agent as AgentName),
      canSend: config.canSend,
    };
  }

  return result;
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get default document for agent
export function getDefaultDocumentForAgent(agent: AgentName): {
  docType: string;
  path: string;
} | null {
  const agentConfig = AGENT_DOCUMENTS[agent];
  if (!agentConfig || agentConfig.canSend.length === 0) return null;

  // Return first available document
  for (const docType of agentConfig.canSend) {
    const docPath = getDocumentPath(agent, docType);
    if (docPath) {
      return { docType, path: docPath };
    }
  }

  return null;
}

// Verify all required documents exist
export function verifyAllDocuments(): {
  allExist: boolean;
  missing: string[];
  existing: Array<{ agent: string; docType: string; path: string }>;
} {
  const missing: string[] = [];
  const existing: Array<{ agent: string; docType: string; path: string }> = [];

  for (const [agent, config] of Object.entries(AGENT_DOCUMENTS)) {
    const docs = config.documents as Record<string, { filename: string }>;
    for (const [docType, doc] of Object.entries(docs)) {
      const folder = config.folder;
      const filePath = folder
        ? path.join(DOCUMENTS_DIR, folder, doc.filename)
        : path.join(DOCUMENTS_DIR, doc.filename);

      if (fs.existsSync(filePath)) {
        existing.push({ agent, docType, path: filePath });
      } else {
        missing.push(`${agent}/${docType}: ${doc.filename}`);
      }
    }
  }

  return {
    allExist: missing.length === 0,
    missing,
    existing,
  };
}

// Read document as buffer
export function readDocumentBuffer(agent: AgentName, docType: string): Buffer | null {
  const docPath = getDocumentPath(agent, docType);
  if (!docPath) return null;

  try {
    return fs.readFileSync(docPath);
  } catch (error) {
    console.error(`[DOCUMENT SERVICE] Error reading document: ${docPath}`, error);
    return null;
  }
}
