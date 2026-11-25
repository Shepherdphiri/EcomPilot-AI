export async function sendWhatsAppAlert(params: {
  toPhoneE164: string;
  severity: string;
  title: string;
  actionSummary: string;
}): Promise<{ messageId?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !accessToken) {
    throw new Error('WhatsApp Cloud API credentials are not configured.');
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.toPhoneE164.replace('+', ''),
      type: 'text',
      text: {
        body: `[EcomPilot ${params.severity.toUpperCase()}] ${params.title}\nNext step: ${params.actionSummary}`,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WhatsApp Cloud API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  return { messageId: data.messages?.[0]?.id };
}
