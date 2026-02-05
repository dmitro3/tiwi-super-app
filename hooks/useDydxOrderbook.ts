"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { OrderbookState, OrderBookLevel } from "./useBinanceOrderbook";

/**
 * Custom hook for real-time dYdX v4 orderbook via Indexer WebSocket
 */
export function useDydxOrderbook(
    market: string,
): OrderbookState {
    const [state, setState] = useState<OrderbookState>({
        bids: [],
        asks: [],
        currentPrice: 0,
        isConnected: false,
        isLoading: true,
        error: null,
        supported: true,
    });

    const bidsMap = useRef<Map<string, string>>(new Map());
    const asksMap = useRef<Map<string, string>>(new Map());
    const wsRef = useRef<WebSocket | null>(null);
    const updateThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

    // dYdX Indexer WS uses markets like "BTC-USD"
    const dydxMarket = market.toUpperCase().includes('-') ? market.toUpperCase() : `${market.toUpperCase().replace('USDT', '')}-USD`;

    const scheduleUpdate = useCallback(() => {
        if (updateThrottle.current) return;
        updateThrottle.current = setTimeout(() => {
            updateThrottle.current = null;

            const formatPrice = (p: number) => p.toFixed(2);
            const formatQty = (q: number) => q.toFixed(4);

            const bids = Array.from(bidsMap.current.entries())
                .map(([price, size]) => ({
                    priceNum: parseFloat(price),
                    qtyNum: parseFloat(size),
                }))
                .filter(l => l.qtyNum > 0)
                .sort((a, b) => b.priceNum - a.priceNum)
                .slice(0, 12)
                .map(l => ({
                    price: formatPrice(l.priceNum),
                    quantity: formatQty(l.qtyNum),
                    total: formatPrice(l.priceNum * l.qtyNum)
                }));

            const asks = Array.from(asksMap.current.entries())
                .map(([price, size]) => ({
                    priceNum: parseFloat(price),
                    qtyNum: parseFloat(size),
                }))
                .filter(l => l.qtyNum > 0)
                .sort((a, b) => a.priceNum - b.priceNum)
                .slice(0, 12)
                .map(l => ({
                    price: formatPrice(l.priceNum),
                    quantity: formatQty(l.qtyNum),
                    total: formatPrice(l.priceNum * l.qtyNum)
                }));

            // Invert asks for UI (highest at top)
            asks.reverse();

            let currentPrice = 0;
            if (bids.length > 0 && asks.length > 0) {
                currentPrice = (parseFloat(bids[0].price) + parseFloat(asks[asks.length - 1].price)) / 2;
            }

            setState((prev) => ({
                ...prev,
                bids,
                asks,
                currentPrice,
                isLoading: false,
            }));
        }, 250);
    }, []);

    const applyUpdates = useCallback((bids: [string, string][], asks: [string, string][]) => {
        for (const [price, size] of bids) {
            if (parseFloat(size) === 0) bidsMap.current.delete(price);
            else bidsMap.current.set(price, size);
        }
        for (const [price, size] of asks) {
            if (parseFloat(size) === 0) asksMap.current.delete(price);
            else asksMap.current.set(price, size);
        }
        scheduleUpdate();
    }, [scheduleUpdate]);

    useEffect(() => {
        if (!market) return;

        const wsUrl = 'wss://indexer.dydx.trade/v4/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[useDydxOrderbook] Connected to dYdX WS');
            setState(prev => ({ ...prev, isConnected: true }));

            // Subscribe to orderbook
            ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'v4_orderbook',
                id: dydxMarket
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'subscribed' || data.type === 'channel_batch' || data.type === 'channel_data') {
                    if (data.contents) {
                        applyUpdates(data.contents.bids || [], data.contents.asks || []);
                    }
                }
            } catch (err) {
                console.error('[useDydxOrderbook] WS parse error:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('[useDydxOrderbook] WS error:', err);
            setState(prev => ({ ...prev, error: 'Connection error', isConnected: false }));
        };

        ws.onclose = () => {
            console.log('[useDydxOrderbook] WS closed');
            setState(prev => ({ ...prev, isConnected: false }));
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'unsubscribe',
                    channel: 'v4_orderbook',
                    id: dydxMarket
                }));
                ws.close();
            }
        };
    }, [dydxMarket, applyUpdates]);

    return state;
}
