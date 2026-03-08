// MTS Angola - AI Service using z-ai-web-dev-sdk
// Handles intelligent automation for the multi-agent system

import ZAI from 'z-ai-web-dev-sdk';

// Initialize AI client
async function getAIClient() {
  return await ZAI.create();
}

// Analyze client response and determine lead quality
export async function analyzeLeadQuality(params: {
  clientName: string;
  emailContent: string;
  previousInteractions?: string[];
}): Promise<{
  quality: 'cold' | 'warm' | 'hot' | 'qualified';
  reason: string;
  suggestedAction: string;
}> {
  try {
    const zai = await getAIClient();

    const prompt = `You are a lead qualification expert for MTS Angola, a maritime services company.

Analyze the following client email response and determine the lead quality.

Client: ${params.clientName}
Email Content: ${params.emailContent}
${params.previousInteractions ? `Previous Interactions: ${params.previousInteractions.join('; ')}` : ''}

Respond in JSON format:
{
  "quality": "cold" | "warm" | "hot" | "qualified",
  "reason": "brief explanation",
  "suggestedAction": "what the agent should do next"
}

Classification criteria:
- cold: No interest shown, generic response
- warm: Some interest, asking general questions
- hot: Strong interest, asking about specific services
- qualified: Asking for price/quote (should be transferred to Claudia)

IMPORTANT: If the client is asking for "price", "quote", "cotacao", "preco" - classify as "qualified" immediately.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a lead qualification expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      quality: 'cold',
      reason: 'Unable to analyze',
      suggestedAction: 'Follow up in 30 days',
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      quality: 'cold',
      reason: 'Analysis failed',
      suggestedAction: 'Manual review required',
    };
  }
}

// Generate email content for Mariana (marketing)
export async function generateMarketingEmail(params: {
  clientName: string;
  language: 'PT' | 'EN' | 'ES';
  vesselName?: string;
  port?: string;
}): Promise<{ subject: string; body: string }> {
  try {
    const zai = await getAIClient();

    const languageInstructions = {
      PT: 'Write in Portuguese (Portuguese from Portugal/Angola)',
      EN: 'Write in English',
      ES: 'Write in Spanish',
    };

    const prompt = `Generate a professional marketing email for MTS Angola maritime services.

Client Name: ${params.clientName}
Language: ${languageInstructions[params.language]}
${params.vesselName ? `Vessel: ${params.vesselName}` : ''}
${params.port ? `Port: ${params.port}` : ''}

MTS Angola Services:
- Waste Management
- Shipchandler
- Hull Cleaning
- Offshore Support

Requirements:
1. Professional but warm tone
2. Keep it concise (3-4 paragraphs)
3. Do NOT mention prices
4. Mention that portfolio is attached
5. Sign as "Mariana Silva | Marketing & CRM | MTS Angola"

Respond in JSON format:
{
  "subject": "email subject line",
  "body": "HTML email body (use <p> tags for paragraphs)"
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a professional email copywriter. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback
    return {
      subject: `Apresentacao de Servicos MTS Angola${params.vesselName ? ` - ${params.vesselName}` : ''}`,
      body: `<p>Prezado(a) ${params.clientName},</p><p>A MTS Angola oferece servicos maritimos 24/7.</p><p>Em anexo, nosso portfolio.</p><p>Atenciosamente,<br>Mariana Silva | MTS Angola</p>`,
    };
  } catch (error) {
    console.error('Email generation error:', error);
    return {
      subject: `Apresentacao de Servicos MTS Angola`,
      body: `<p>Prezado(a) ${params.clientName},</p><p>A MTS Angola oferece servicos maritimos 24/7.</p><p>Atenciosamente,<br>Mariana Silva | MTS Angola</p>`,
    };
  }
}

// Generate daily report summary
export async function generateDailySummary(data: {
  vesselsTracked: number;
  newContacts: number;
  reengagements: number;
  leadsTransferred: number;
  quotationsSent: number;
  estimatedValue: number;
}): Promise<string> {
  try {
    const zai = await getAIClient();

    const prompt = `Generate a brief executive summary for a daily operations report.

Data:
- Vessels Tracked: ${data.vesselsTracked}
- New Contacts: ${data.newContacts}
- Re-engagements: ${data.reengagements}
- Leads Transferred to Commercial: ${data.leadsTransferred}
- Quotations Sent: ${data.quotationsSent}
- Estimated Value: USD ${data.estimatedValue}

Write 2-3 sentences summarizing today's performance. Be concise and professional.
Write in Portuguese.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a business analyst writing executive summaries.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content || 'Relatorio gerado com sucesso.';
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Relatorio diario processado.';
  }
}

// Generate re-engagement email for inactive clients
export async function generateReengagementEmail(params: {
  clientName: string;
  language: 'PT' | 'EN' | 'ES';
  daysInactive: number;
  hasVesselArriving: boolean;
  vesselName?: string;
}): Promise<{ subject: string; body: string }> {
  try {
    const zai = await getAIClient();

    const languageInstructions = {
      PT: 'Write in Portuguese',
      EN: 'Write in English',
      ES: 'Write in Spanish',
    };

    const prompt = `Generate a re-engagement email for an inactive client of MTS Angola maritime services.

Client Name: ${params.clientName}
Language: ${languageInstructions[params.language]}
Days Since Last Contact: ${params.daysInactive}
Has Vessel Arriving: ${params.hasVesselArriving}
${params.vesselName ? `Arriving Vessel: ${params.vesselName}` : ''}

Requirements:
1. Friendly but professional tone
2. If vessel is arriving, mention it and offer specific services
3. If no vessel, just express availability and desire to reconnect
4. Do NOT mention prices
5. Keep it brief (2-3 paragraphs)
6. Sign as "Mariana Silva | Marketing & CRM | MTS Angola"

Respond in JSON format:
{
  "subject": "email subject line",
  "body": "HTML email body"
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a professional email copywriter. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback
    return {
      subject: 'MTS Angola - Continuamos a sua disposicao',
      body: `<p>Prezado(a) ${params.clientName},</p><p>Gostariamos de relembrar que a MTS Angola continua a sua disposicao.</p><p>Atenciosamente,<br>Mariana Silva | MTS Angola</p>`,
    };
  } catch (error) {
    console.error('Re-engagement email error:', error);
    return {
      subject: 'MTS Angola - Continuamos a sua disposicao',
      body: `<p>Prezado(a) ${params.clientName},</p><p>A MTS Angola continua disponivel para seus servicos maritimos.</p>`,
    };
  }
}
