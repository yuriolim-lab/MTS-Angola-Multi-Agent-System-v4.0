// MTS Angola - Documents API
// Manages PDF documents with agent-based access control

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllDocumentsStatus, 
  verifyAllDocuments,
  getAgentDocuments,
  canAgentSendDocument,
  type AgentName 
} from '@/lib/services/document-service';

// GET - Get documents status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';
    const agent = searchParams.get('agent') as AgentName | null;

    switch (action) {
      case 'all':
        const allDocs = getAllDocumentsStatus();
        return NextResponse.json({
          success: true,
          data: allDocs,
        });

      case 'verify':
        const verification = verifyAllDocuments();
        return NextResponse.json({
          success: true,
          data: verification,
        });

      case 'agent':
        if (!agent) {
          return NextResponse.json({
            success: false,
            error: 'Agent parameter required',
          }, { status: 400 });
        }
        
        const agentDocs = getAgentDocuments(agent);
        // agentDocs is an array of DocumentInfo objects
        const allowedDocs = agentDocs
          .filter(doc => canAgentSendDocument(agent, doc.filename.replace('.pdf', '').toLowerCase()))
          .map(doc => doc.filename);
        
        return NextResponse.json({
          success: true,
          data: {
            agent,
            documents: agentDocs,
            canSend: allowedDocs,
          },
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
