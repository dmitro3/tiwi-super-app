"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { OrderbookState } from "./useBinanceOrderbook";
import { Network, SocketClient } from '@dydxprotocol/v4-client-js';

/**
 * Custom hook for real-time dYdX v4 orderbook via official Indexer SocketClient
 */
type Level = [number, number, number]; // [price, size, messageId]

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

    const bidsList = useRef<Level[]>([]);
    const asksList = useRef<Level[]>([]);
    const socketRef = useRef<SocketClient | null>(null);
    const updateThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

    // dYdX Indexer WS uses markets like "BTC-USD"
    let dydxMarket = market.toUpperCase().replace('_', '-').replace('/', '-');
    if (dydxMarket.includes('USDT')) {
        dydxMarket = dydxMarket.replace('USDT', 'USD');
    }
    if (dydxMarket && !dydxMarket.includes('-')) {
        dydxMarket = `${dydxMarket}-USD`;
    }

    const resolveCrossedOrderBook = (bids: Level[], asks: Level[]): [Level[], Level[]] => {
        while (bids.length && asks.length && bids[0][0] >= asks[0][0]) {
            const bid = bids[0];
            const ask = asks[0];

            if (bid[2] < ask[2]) {
                bids.shift();
            } else if (bid[2] > ask[2]) {
                asks.shift();
            } else {
                const tradedAmount = Math.min(bid[1], ask[1]);
                bid[1] -= tradedAmount;
                ask[1] -= tradedAmount;

                if (bid[1] <= 0) bids.shift();
                if (ask[1] <= 0) asks.shift();
            }
        }
        return [bids, asks];
    };

    const scheduleUpdate = useCallback(() => {
        if (updateThrottle.current) return;
        updateThrottle.current = setTimeout(() => {
            updateThrottle.current = null;

            const formatPrice = (p: number) => p.toFixed(2);
            const formatQty = (q: number) => q.toFixed(4);

            bidsList.current.sort((a, b) => b[0] - a[0]);
            asksList.current.sort((a, b) => a[0] - b[0]);

            let [resolvedBids, resolvedAsks] = resolveCrossedOrderBook(
                [...bidsList.current],
                [...asksList.current]
            );

            const finalBids = resolvedBids.slice(0, 15).map(l => ({
                price: formatPrice(l[0]),
                quantity: formatQty(l[1]),
                total: formatPrice(l[0] * l[1])
            }));

            const finalAsks = resolvedAsks.slice(0, 15).map(l => ({
                price: formatPrice(l[0]),
                quantity: formatQty(l[1]),
                total: formatPrice(l[0] * l[1])
            }));

            finalAsks.reverse();

            let currentPrice = 0;
            if (resolvedBids.length > 0 && resolvedAsks.length > 0) {
                currentPrice = (resolvedBids[0][0] + resolvedAsks[0][0]) / 2;
            } else if (resolvedBids.length > 0) {
                currentPrice = resolvedBids[0][0];
            } else if (resolvedAsks.length > 0) {
                currentPrice = resolvedAsks[0][0];
            }

            setState((prev) => ({
                ...prev,
                bids: finalBids,
                asks: finalAsks,
                currentPrice,
                isLoading: false,
                supported: true,
                error: null
            }));
        }, 150);
    }, []);

    const updateList = (updateEntries: any[], list: Level[], messageId: number) => {
        updateEntries.forEach((entry) => {
            const price = typeof entry[0] === 'number' ? entry[0] : Number(entry.price || entry[0]);
            const size = typeof entry[1] === 'number' ? entry[1] : Number(entry.size || entry[1]);

            const index = list.findIndex(([p]) => p === price);
            if (size === 0) {
                if (index !== -1) list.splice(index, 1);
            } else if (index !== -1) {
                list[index] = [price, size, messageId];
            } else {
                list.push([price, size, messageId]);
            }
        });
    };

    const applyUpdates = useCallback((contents: any, messageId: number) => {
        if (!contents) return;

        if (Array.isArray(contents)) {
            contents.forEach(update => {
                if (update.bids) updateList(update.bids, bidsList.current, messageId);
                if (update.asks) updateList(update.asks, asksList.current, messageId);
            });
        } else {
            if (contents.bids) updateList(contents.bids, bidsList.current, messageId);
            if (contents.asks) updateList(contents.asks, asksList.current, messageId);
        }

        scheduleUpdate();
    }, [scheduleUpdate]);

    useEffect(() => {
        if (!market || market.toLowerCase().includes('undefined')) {
            return;
        }

        let isCancelled = false;
        bidsList.current = [];
        asksList.current = [];

        const indexerConfig = Network.mainnet().indexerConfig;

        const socket = new SocketClient(
            indexerConfig,
            () => {
                if (isCancelled) return;
                console.log(`[useDydxOrderbook] Socket opened for ${dydxMarket}`);
            },
            () => {
                if (isCancelled) return;
                console.log(`[useDydxOrderbook] Socket closed`);
                setState(prev => ({ ...prev, isConnected: false }));
            },
            (message: any) => {
                if (isCancelled) return;
                try {
                    // Note: SocketClient might already parse JSON depending on version, 
                    // but the user's snippet shows message.data as string
                    const data = typeof message.data === 'string' ? JSON.parse(message.data) : message;

                    const msgId = data.message_id || 0;

                    if (data.type === 'connected') {
                        console.log(`[useDydxOrderbook] Connected, subscribing to ${dydxMarket}...`);
                        setState(prev => ({ ...prev, isConnected: true }));
                        socket.subscribeToOrderbook(dydxMarket);
                    } else if (data.type === 'subscribed' || data.type === 'channel_batch' || data.type === 'channel_data') {
                        applyUpdates(data.contents, msgId);
                    } else if (data.type === 'error') {
                        console.error('[useDydxOrderbook] API Error:', data.message);
                        setState(prev => ({ ...prev, error: data.message }));
                    }
                } catch (err) {
                    console.error('[useDydxOrderbook] Parse error:', err);
                }
            },
            (err: any) => {
                if (isCancelled) return;
                console.error('[useDydxOrderbook] Socket error:', err);
                setState(prev => ({
                    ...prev,
                    error: 'Unreachable. Check connection or VPN.',
                    isConnected: false,
                    isLoading: false
                }));
            }
        );

        socketRef.current = socket;
        socket.connect();

        return () => {
            isCancelled = true;
            if (socketRef.current) {
                socketRef.current.unsubscribeFromOrderbook(dydxMarket);
                socketRef.current.close();
            }
        };
    }, [dydxMarket, applyUpdates]);

    return state;
}
