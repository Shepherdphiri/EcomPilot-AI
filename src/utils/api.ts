export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let parsed: Record<string, unknown> | null = null;

  try {
    parsed = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const serverMessage =
      parsed && typeof parsed.error === 'string' ? parsed.error : null;
    if (serverMessage) {
      throw new Error(serverMessage);
    }
    if (rawText.trimStart().startsWith('<')) {
      throw new Error(
        `Server returned HTTP ${res.status} (HTML error page). Please wait a moment and try again.`
      );
    }
    throw new Error(`Request failed with HTTP ${res.status}.`);
  }

  if (!parsed) {
    throw new Error(
      'Backend API returned HTML instead of JSON. Use the live AI Studio preview or a full-stack host (Cloud Run / Railway / Render) running "npm start".'
    );
  }

  return parsed as T;
}
