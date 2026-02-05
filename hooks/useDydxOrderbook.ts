"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { OrderbookState } from "./useBinanceOrderbook";
import { useDydxPollingOrderbook } from "./useDydxPollingOrderbook";

/**
 * Hybrid dYdX Orderbook Hook
 * Tries WebSocket first, falls back to server-side polling if connection fails.
 */
export function useDydxOrderbook(market: string): OrderbookState {
    const [wsState, setWsState] = useState<OrderbookState>({
        bids: [],
        asks: [],
        currentPrice: 0,
        isConnected: false,
        isLoading: true,
        error: null,
        supported: true,
    });

    const [isFallbackActive, setIsFallbackActive] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const connectionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Normalize market
    let dydxMarket = market.toUpperCase().replace('_', '-').replace('/', '-');
    if (dydxMarket.includes('USDT')) {
        dydxMarket = dydxMarket.replace('USDT', 'USD');
    }
    if (dydxMarket && !dydxMarket.includes('-')) {
        dydxMarket = `${dydxMarket}-USD`;
    }

    // Use the polling hook (always running but we only use its state if fallback is active)
    const pollingState = useDydxPollingOrderbook(market, isFallbackActive);

    const connectWs = useCallback(() => {
        if (!market) return;

        console.log(`[useDydxOrderbook] Attempting WebSocket for ${dydxMarket}...`);
        const wsUrl = 'wss://indexer.dydx.trade/v4/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // Set a timeout to switch to polling if we don't connect within 5 seconds
        connectionTimeout.current = setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                console.warn("[useDydxOrderbook] WS Connection timed out. Switching to polling fallback.");
                setIsFallbackActive(true);
                ws.close();
            }
        }, 3000);

        ws.onopen = () => {
            if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
            console.log('[useDydxOrderbook] WS Connected');
            setIsFallbackActive(false);
            setWsState(prev => ({ ...prev, isConnected: true }));

            ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'v4_orderbook',
                id: dydxMarket
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'channel_data' && data.contents) {
                    // Update state from WS
                    // Note: This logic is simplified for now to match the UI expectations
                    // If you need full depth management, you'd use a Map here.
                    const transform = (levels: any[]) => levels.map((l: any) => ({
                        price: parseFloat(l[0] || l.price).toFixed(2),
                        quantity: parseFloat(l[1] || l.size || l.quantity).toFixed(4),
                        total: (parseFloat(l[0] || l.price) * parseFloat(l[1] || l.size)).toFixed(2)
                    }));

                    setWsState(prev => ({
                        ...prev,
                        bids: transform(data.contents.bids || []).slice(0, 15),
                        asks: transform(data.contents.asks || []).slice(0, 15).reverse(),
                        isLoading: false,
                        error: null
                    }));
                }
            } catch (err) {
                console.error('[useDydxOrderbook] WS parse error:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('[useDydxOrderbook] WS Error:', err);
            setIsFallbackActive(true);
        };

        ws.onclose = () => {
            console.log('[useDydxOrderbook] WS Closed');
            // If it closed unexpectedly, trigger fallback
            setIsFallbackActive(true);
        };
    }, [dydxMarket, market]);

    useEffect(() => {
        setIsFallbackActive(false);
        connectWs();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        };
    }, [connectWs]);

    // Return polling state if fallback is active, else return WS state
    return isFallbackActive ? pollingState : wsState;
}