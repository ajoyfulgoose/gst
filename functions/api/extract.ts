export const onRequestPost: PagesFunction = async (context) => {
  const OPENAI_API_KEY = context.env.OPENAI_API_KEY as string;
  if (!OPENAI_API_KEY) return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500 });
  const body = await context.request.json();
  const { desiredOutcome, newText, previousTree } = body || {};

  const schema = {
    type: "object",
    properties: {
      outcome: { type: "string" },
      themes: {
        type: "array",
        items: {
          type: "object",
          required: ["name","opportunities"],
          properties: {
            name: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                required: ["name","quotes"],
                properties: {
                  name: { type: "string" },
                  quotes: { type: "array", items: { type: "string" } },
                  evidence_count: { type: "integer" }
                }
              }
            }
          }
        }
      }
    },
    required: ["themes"]
  };

  const systemPrompt = `You maintain a Teresa Torres Opportunity Solution Tree.
- Extract solution-agnostic opportunities (needs/pains/desires) from user discovery notes.
- Cluster into THEMES -> OPPORTUNITIES with concise names.
- Attach representative supporting quotes (short, verbatim).
- If previousTree is provided, merge and re-cluster consistently without losing opportunities.
- Do not invent quotes. Do not include solutions in names.`;

  const userPayload = { desiredOutcome, newText, previousTree: previousTree ?? null };

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) }
      ],
      response_format: { type: "json_schema", json_schema: { name: "OpportunityTree", schema, strict: true } }
    })
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "OpenAI error", detail: await resp.text() }), { status: 500 });
  }

  const data = await resp.json();
  let out;
  if (data.output_text) out = JSON.parse(data.output_text);
  else if (data.output?.[0]?.content?.[0]?.text) out = JSON.parse(data.output[0].content[0].text);
  else out = data;

  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
};
