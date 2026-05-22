import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/auth';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export const legalChat = async (req: AuthRequest, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ message: 'Message is required' });
    return;
  }

  if (message.length > 1000) {
    res.status(400).json({ message: 'Message too long (max 1000 characters)' });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message.trim() }],
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ reply });
  } catch (err: any) {
    console.error('AI error:', err.message);
    res.status(503).json({ message: 'AI service temporarily unavailable' });
  }
};
