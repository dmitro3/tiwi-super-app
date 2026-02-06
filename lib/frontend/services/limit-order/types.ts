/**
 * 1inch Limit Order Types
 */

import type { Token } from '@/lib/frontend/types/tokens';

export interface CreateLimitOrderParams {
    fromToken: Token;
    toToken: Token;
    fromAmount: string;
    limitPrice: string; // The price (in toToken units) user wants per 1 unit of fromToken
    userAddress: string;
    recipientAddress?: string; // Optional recipient if different from maker
    expiresInSeconds: number; // 0 for never, or seconds from now
}

export interface LimitOrderResult {
    orderHash: string;
    order: any;
    signature: string;
}

export enum LimitOrderStage {
    IDLE = 'idle',
    APPROVING = 'approving',
    SIGNING = 'signing',
    SUBMITTING = 'submitting',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export interface LimitOrderStatus {
    stage: LimitOrderStage;
    message: string;
    error?: Error;
}
