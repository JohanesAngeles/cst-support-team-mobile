import { Request, Response } from 'express';
import * as deepl from 'deepl-node';

// DeepL target language codes — free keys end with :fx, paid use api.deepl.com
// The deepl-node package auto-detects the tier from the key suffix.
const LANG_MAP: Record<string, deepl.TargetLanguageCode> = {
  'en': 'EN-US',
  'es': 'ES',
  'fr': 'FR',
  'de': 'DE',
  'it': 'IT',
  'zh': 'ZH',
  'ru': 'RU',
  'pt': 'PT-BR',
  'pl': 'PL',
  'nl': 'NL',
  'ja': 'JA',
  'ko': 'KO',
  'ar': 'AR',
  'tr': 'TR',
  'uk': 'UK',
  'sv': 'SV',
  'da': 'DA',
  'fi': 'FI',
  'nb': 'NB',
  'cs': 'CS',
  'ro': 'RO',
  'hu': 'HU',
  'bg': 'BG',
  'sk': 'SK',
  'sl': 'SL',
  'lt': 'LT',
  'lv': 'LV',
  'et': 'ET',
  'id': 'ID',
};

const SOURCE_MAP: Record<string, deepl.SourceLanguageCode> = {
  'en': 'EN',
  'es': 'ES',
  'fr': 'FR',
  'de': 'DE',
  'it': 'IT',
  'zh': 'ZH',
  'ru': 'RU',
  'pt': 'PT',
  'pl': 'PL',
  'nl': 'NL',
  'ja': 'JA',
  'ko': 'KO',
};

let _translator: deepl.Translator | null = null;

function getTranslator(): deepl.Translator {
  if (_translator) return _translator;
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error('DEEPL_API_KEY is not set in .env');
  _translator = new deepl.Translator(key);
  return _translator;
}

export const translate = async (req: Request, res: Response) => {
  const { text, fromLang, toLang } = req.body;

  if (!text?.trim())   { res.status(400).json({ message: 'text is required' }); return; }
  if (!toLang)         { res.status(400).json({ message: 'toLang is required' }); return; }
  if (text.length > 5000) { res.status(400).json({ message: 'Text too long. Max 5000 characters.' }); return; }

  const targetCode = LANG_MAP[toLang?.toLowerCase()];
  if (!targetCode) { res.status(400).json({ message: `Unsupported target language: ${toLang}` }); return; }

  const sourceCode = fromLang ? (SOURCE_MAP[fromLang?.toLowerCase()] ?? null) : null;

  try {
    const translator = getTranslator();
    const result = await translator.translateText(text.trim(), sourceCode, targetCode);
    const translated = Array.isArray(result) ? result[0].text : result.text;
    const detectedLang = Array.isArray(result) ? result[0].detectedSourceLang : result.detectedSourceLang;
    res.json({ translatedText: translated, detectedSourceLang: detectedLang });
  } catch (err: any) {
    if (err.message?.includes('DEEPL_API_KEY')) {
      res.status(500).json({ message: 'Translation service not configured. Add DEEPL_API_KEY to server .env' });
    } else {
      res.status(500).json({ message: err.message ?? 'Translation failed' });
    }
  }
};

export const getSupportedLanguages = async (_req: Request, res: Response) => {
  try {
    const translator = getTranslator();
    const [source, target] = await Promise.all([
      translator.getSourceLanguages(),
      translator.getTargetLanguages(),
    ]);
    res.json({ source, target });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to fetch languages' });
  }
};
