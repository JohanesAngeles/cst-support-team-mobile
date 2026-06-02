import { Response } from 'express';
import OpenAI from 'openai';
import { AuthRequest } from '../middleware/auth';

const xai = new OpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.GROK_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI Legal Assistant specializing in commercial trucking law, FMCSA regulations, and driver rights in the United States. You work for Commercial Support Technologies (CST), a platform built for truckers.

Your expertise includes:
- Traffic violations and ticket disputes for commercial drivers
- FMCSA Hours of Service (HOS) regulations
- Coercion rules and driver protection rights
- Broker payment disputes and freight claims
- Cargo damage and loss claims
- DOT compliance and inspections
- CDL requirements and violations
- LLC formation and business structure for owner-operators
- State-specific trucking laws across all 50 states
- Independent contractor vs employee classification

Guidelines:
- Give clear, actionable advice in plain English
- Always note when professional legal counsel is strongly recommended
- Cite specific regulations (e.g., 49 CFR Part 395) when relevant
- Keep responses concise but complete — aim for 3-5 sentences for simple questions, more for complex ones
- Never give advice that could endanger public safety
- Remind users this is general guidance, not a substitute for a licensed attorney`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const rateAdvisor = async (req: AuthRequest, res: Response) => {
  const { origin, destination, miles, offeredRate, fuelPrice, truckMpg } = req.body;

  const m = parseFloat(miles);
  const rate = parseFloat(offeredRate);
  const ppg = parseFloat(fuelPrice) || 3.80;
  const mpg = parseFloat(truckMpg) || 6.5;

  if (!origin || !destination || !m || m <= 0 || !rate || rate <= 0) {
    res.status(400).json({ message: 'origin, destination, miles, and offeredRate are required' });
    return;
  }

  const fuelCost = (m / mpg) * ppg;
  const rpm = rate / m;
  const estimatedProfit = rate - fuelCost;
  const profitPerMile = estimatedProfit / m;

  const prompt = `A truck driver is evaluating this load:
- Lane: ${origin} to ${destination}
- Miles: ${m}
- Offered rate: $${rate.toFixed(2)} total ($${rpm.toFixed(2)}/mile)
- Calculated fuel cost: $${fuelCost.toFixed(2)} (at $${ppg}/gal, ${mpg} MPG)
- Estimated profit after fuel: $${estimatedProfit.toFixed(2)} ($${profitPerMile.toFixed(2)}/mile)

Evaluate this load offer for a commercial truck driver (dry van assumed unless lane context suggests otherwise). Respond in this EXACT JSON format with no extra text:
{
  "verdict": "LOW" | "FAIR" | "GOOD",
  "marketRpmMin": <number>,
  "marketRpmMax": <number>,
  "suggestedCounter": <dollar amount as number>,
  "reason": "<2-3 sentences explaining your verdict and market context>"
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3',
      max_tokens: 300,
      messages: [
        { role: 'system', content: 'You are a trucking industry rate analyst with expert knowledge of US freight market rates by lane and truck type. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      verdict: parsed.verdict ?? 'FAIR',
      marketRpmMin: parsed.marketRpmMin ?? null,
      marketRpmMax: parsed.marketRpmMax ?? null,
      suggestedCounter: parsed.suggestedCounter ?? null,
      reason: parsed.reason ?? '',
      fuelCost: parseFloat(fuelCost.toFixed(2)),
      estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
      profitPerMile: parseFloat(profitPerMile.toFixed(2)),
      rpm: parseFloat(rpm.toFixed(2)),
    });
  } catch (err: any) {
    console.error('Rate advisor error:', err.message);
    res.status(503).json({ message: 'AI service temporarily unavailable' });
  }
};

export const rateBenchmark = async (req: AuthRequest, res: Response) => {
  const { origin, destination, truckType } = req.body;

  if (!origin || !destination) {
    res.status(400).json({ message: 'origin and destination are required' });
    return;
  }

  const type = truckType || 'Dry Van';

  const prompt = `Provide freight rate benchmarks for a ${type} truck on the lane: ${origin} to ${destination}.

Respond in this EXACT JSON format with no extra text:
{
  "rpmMin": <number>,
  "rpmMax": <number>,
  "rpmAvg": <number>,
  "marketCondition": "TIGHT" | "BALANCED" | "SOFT",
  "insight": "<2-3 sentences about this lane's market dynamics, typical demand, and what drivers should know when negotiating>"
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3',
      max_tokens: 300,
      messages: [
        { role: 'system', content: 'You are a freight market analyst with deep knowledge of US trucking lane rates. Provide realistic, current market rate benchmarks. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      rpmMin: parsed.rpmMin ?? null,
      rpmMax: parsed.rpmMax ?? null,
      rpmAvg: parsed.rpmAvg ?? null,
      marketCondition: parsed.marketCondition ?? 'BALANCED',
      insight: parsed.insight ?? '',
    });
  } catch (err: any) {
    console.error('Rate benchmark error:', err.message);
    res.status(503).json({ message: 'AI service temporarily unavailable' });
  }
};

export const legalChat = async (req: AuthRequest, res: Response) => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ message: 'Message is required' });
    return;
  }

  if (message.length > 1000) {
    res.status(400).json({ message: 'Message too long (max 1000 characters)' });
    return;
  }

  const prior: ChatMessage[] = Array.isArray(history)
    ? history
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
    : [];

  const messages: ChatMessage[] = [...prior, { role: 'user', content: message.trim() }];

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    const reply = response.choices[0]?.message?.content ?? '';
    res.json({ reply });
  } catch (err: any) {
    console.error('AI error:', err.message);
    res.status(503).json({ message: 'AI service temporarily unavailable' });
  }
};
