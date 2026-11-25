import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
const FROM_EMAIL = process.env.EMAIL_FROM || 'alerts@ecompilot.ai';

export async function sendOperationalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string }> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    throw new Error(`Resend email delivery failed: ${error.message}`);
  }
  return { id: data?.id };
}

export async function sendDailyMorningReportEmail(params: {
  to: string;
  workspaceName: string;
  reportDate: string;
  revenueYesterdayZar: number;
  ordersCount: number;
  lowStockCount: number;
  suppressedCount: number;
  potentialLossZar: number;
  executiveSummary: string;
  topActions: Array<{ rank: number; severity: string; action: string; impactZar: number }>;
}) {
  const actionsHtml = params.topActions
    .map(
      (a) =>
        `<li style="margin-bottom:8px;"><strong>[${a.severity.toUpperCase()}]</strong> ${a.action} — <em>Est. R${a.impactZar.toLocaleString('en-ZA')} impact</em></li>`
    )
    .join('');

  const actionsText = params.topActions
    .map(
      (a) =>
        `${a.rank}. [${a.severity.toUpperCase()}] ${a.action} (Est. R${a.impactZar.toLocaleString('en-ZA')})`
    )
    .join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#0F172A;">
      <h2 style="margin-bottom:4px;">EcomPilot 06:00 SAST Morning Report — ${params.workspaceName}</h2>
      <p style="color:#64748B;margin-top:0;">${params.reportDate}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px;border:1px solid #E2E8F0;"><strong>Revenue Yesterday</strong><br/>R${params.revenueYesterdayZar.toLocaleString('en-ZA')}</td>
          <td style="padding:8px;border:1px solid #E2E8F0;"><strong>Orders</strong><br/>${params.ordersCount}</td>
          <td style="padding:8px;border:1px solid #E2E8F0;"><strong>Low Stock</strong><br/>${params.lowStockCount}</td>
          <td style="padding:8px;border:1px solid #E2E8F0;"><strong>Suppressed</strong><br/>${params.suppressedCount}</td>
        </tr>
      </table>
      <p><strong>Potential Revenue at Risk:</strong> R${params.potentialLossZar.toLocaleString('en-ZA')}</p>
      <p>${params.executiveSummary}</p>
      <h3>Top Recommended Actions</h3>
      <ol>${actionsHtml}</ol>
    </div>
  `;

  const text = `EcomPilot 06:00 SAST Morning Report — ${params.workspaceName} (${params.reportDate})
Revenue Yesterday: R${params.revenueYesterdayZar.toLocaleString('en-ZA')} | Orders: ${params.ordersCount}
Low Stock SKUs: ${params.lowStockCount} | Suppressed Listings: ${params.suppressedCount}
Potential Revenue Loss: R${params.potentialLossZar.toLocaleString('en-ZA')}

${params.executiveSummary}

Top Recommended Actions:
${actionsText}`;

  return sendOperationalEmail({
    to: params.to,
    subject: `[EcomPilot 06:00] R${params.revenueYesterdayZar.toLocaleString('en-ZA')} yesterday · ${params.suppressedCount} suppressed · ${params.lowStockCount} low stock`,
    html,
    text,
  });
}
