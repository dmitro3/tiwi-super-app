/**
 * Translation API Route
 * 
 * Translates text from English to target language using external translation service.
 * Uses MyMemory Translation API (free, no API key required for basic usage).
 */

import { NextRequest, NextResponse } from 'next/server';

interface TranslateRequest {
  text: string;
  targetLanguage: string; // ISO 639-1 language code (e.g., "fr", "de", "zh")
}

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
  };
  quotaFinished?: boolean;
  mtLangSupported?: string;
  responseDetails?: string;
  responseStatus?: number;
}

/**
 * Translate text using MyMemory Translation API
 * Free tier: up to 100,000 characters per day
 */
async function translateText(text: string, targetLang: string): Promise<string> {
  const sourceLang = 'en'; // We translate from English
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.statusText}`);
    }
    
    const data: MyMemoryResponse = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    
    throw new Error(data.responseDetails || 'Translation failed');
  } catch (error) {
    console.error('[TranslationAPI] Error translating:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: TranslateRequest = await req.json();
    const { text, targetLanguage } = body;
    
    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: text and targetLanguage' },
        { status: 400 }
      );
    }
    
    // Normalize language code (e.g., zh-Hans -> zh)
    const normalizedLang = targetLanguage.split('-')[0].toLowerCase();
    
    // If target is English, return as-is
    if (normalizedLang === 'en') {
      return NextResponse.json({ translatedText: text });
    }
    
    // Translate the text
    const translatedText = await translateText(text, normalizedLang);
    
    return NextResponse.json({ 
      translatedText,
      sourceLanguage: 'en',
      targetLanguage: normalizedLang,
    });
  } catch (error: any) {
    console.error('[API] /api/v1/translate POST error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to translate text',
        translatedText: null,
      },
      { status: 500 }
    );
  }
}
