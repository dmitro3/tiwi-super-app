/**
 * useLimitOrder Hook
 * 
 * Hook for managing 1inch Limit Order creation and state.
 */

import { useState, useCallback } from 'react';
import type { WalletClient } from 'viem';
import { oneInchLimitService } from '@/lib/frontend/services/limit-order/oneinch-limit-service';
import type { CreateLimitOrderParams, LimitOrderResult, LimitOrderStatus } from '@/lib/frontend/services/limit-order/types';

export function useLimitOrder() {
    const [isExecuting, setIsExecuting] = useState(false);
    const [status, setStatus] = useState<LimitOrderStatus | null>(null);
    const [result, setResult] = useState<LimitOrderResult | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const createOrder = useCallback(async (
        params: CreateLimitOrderParams,
        walletClient: WalletClient
    ) => {
        setIsExecuting(true);
        setStatus(null);
        setResult(null);
        setError(null);

        try {
            const orderResult = await oneInchLimitService.createAndSubmitOrder(
                params,
                walletClient,
                (newStatus) => setStatus(newStatus)
            );

            setResult(orderResult);
            return orderResult;
        } catch (err: any) {
            setError(err);
            setStatus({
                stage: 'failed' as any,
                message: err.message || 'Failed to place limit order',
                error: err
            });
            throw err;
        } finally {
            setIsExecuting(false);
        }
    }, []);

    const reset = useCallback(() => {
        setIsExecuting(false);
        setStatus(null);
        setResult(null);
        setError(null);
    }, []);

    return {
        isExecuting,
        status,
        result,
        error,
        createOrder,
        reset
    };
}
