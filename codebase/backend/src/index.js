/**
 * Smart Bill Splitter — Cloudflare Worker
 *
 * POST /api/scan-receipt
 *   Body: { image: "<base64 data-url string>" }
 *   Returns: { restaurant, items, sharedFees }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPT = `You are an expert Vietnamese receipt / bill parser.
Given an image of a restaurant bill, extract ALL information into the following JSON structure.

Rules:
1. "restaurant": Name of the restaurant (string). If unclear, use "Không rõ".
2. "items": Array of individual food/drink items. Each item has:
   - "id": sequential integer starting from 1
   - "name": item name in Vietnamese as printed on bill
   - "qty": quantity (integer, default 1)
   - "price": unit price in VND (integer, NO dots/commas)
   - "type": always "food"
3. "sharedFees": Array of shared fees/taxes. Each fee has:
   - "id": sequential integer starting from 101
   - "name": fee name (e.g. "VAT (8%)", "Phí phục vụ (5%)")
   - "amount": fee amount in VND (integer)
4. Items like "Khăn lạnh", "Khăn giấy", "Gửi xe" that appear per-person should go to "items", NOT "sharedFees".
5. Always return ONLY valid JSON, no markdown fences, no extra text.`;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', service: 'smart-bill-splitter-api' });
    }

    if (url.pathname === '/api/scan-receipt' && request.method === 'POST') {
      return handleScanReceipt(request, env);
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  },
};

async function handleScanReceipt(request, env) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return jsonResponse({ error: 'Missing "image" field (base64 data-url)' }, 400);
    }

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: 'OPENAI_API_KEY not configured on server' }, 500);
    }

    // Ensure we have a proper data URL for OpenAI
    const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Parse this restaurant receipt image into JSON.' },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI API error:', errText);
      return jsonResponse({ error: 'AI service error', details: errText }, 502);
    }

    const data = await openaiRes.json();
    const rawText = data?.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse AI output:', rawText);
      return jsonResponse({ error: 'AI returned invalid JSON', raw: rawText }, 422);
    }

    const result = {
      restaurant: parsed.restaurant || 'Không rõ',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      sharedFees: Array.isArray(parsed.sharedFees) ? parsed.sharedFees : [],
    };

    return jsonResponse(result);
  } catch (err) {
    console.error('Scan receipt error:', err);
    return jsonResponse({ error: 'Internal server error', message: err.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
