"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for real-time dYdX trade data via WebSocket
 */
export function useDydxTrades(market: string) {
    const [trades, setTrades] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!market) return;

        const connect = () => {
            const socket = new WebSocket('wss://indexer.dydx.trade/v4/ws');
            ws.current = socket;

            socket.onopen = () => {
                setIsConnected(true);
                // Subscribe to trades channel
                socket.send(JSON.stringify({
                    type: 'subscribe',
                    channel: 'v4_trades',
                    id: market
                }));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'channel_data' && data.contents?.trades) {
                        const newTrades = data.contents.trades.map((t: any) => ({
                            id: t.id,
                            side: t.side, // 'BUY' or 'SELL'
                            price: parseFloat(t.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                            size: parseFloat(t.size).toFixed(4),
                            timestamp: t.createdAt
                        }));

                        setTrades(prev => {
                            const combined = [...newTrades, ...prev];
                            return combined.slice(0, 30); // Keep last 30 trades
                        });
                    }
                } catch (err) {
                    console.error('[useDydxTrades] Error parsing message:', err);
                }
            };

            socket.onclose = () => {
                setIsConnected(false);
                // Attempt to reconnect after 3 seconds
                setTimeout(connect, 3000);
            };

            socket.onerror = (err) => {
                console.error('[useDydxTrades] WebSocket error:', err);
                socket.close();
            };
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [market]);

    return { trades, isConnected };
}
