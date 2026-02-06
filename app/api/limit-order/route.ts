import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const chainId = searchParams.get('chainId');

        if (!chainId) {
            return NextResponse.json({ error: 'Chain ID is required' }, { status: 400 });
        }

        const body = await req.json();

        // Use the non-public key for server-side requests
        const apiKey = process.env.ONEINCH_API_KEY || process.env.NEXT_PUBLIC_ONEINCH_API_KEY;

        if (!apiKey) {
            console.error('[LimitOrderProxy] No API key found in environment');
            return NextResponse.json({ error: 'Configuration Error', message: '1inch API key is missing' }, { status: 500 });
        }

        console.log(`[LimitOrderProxy] Submitting order to chain ${chainId}...`);

        const response = await fetch(`https://api.1inch.dev/limit-order/v4.0/${chainId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'User-Agent': 'TiwiSuperApp/1.0',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('[LimitOrderProxy] 1inch API Error:', {
                status: response.status,
                statusText: response.statusText,
                data
            });
            return NextResponse.json(data, { status: response.status });
        }

        console.log('[LimitOrderProxy] Success');
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[LimitOrderProxy] Critical Error:', {
            message: error.message,
            stack: error.stack
        });
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error.message || 'Unknown error during submission'
        }, { status: 500 });
    }
}
