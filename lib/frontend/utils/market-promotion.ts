import { Token } from "@/lib/frontend/types/tokens";

const TWC_ADDRESS = '0xda1060158f7d593667cce0a15db346bb3ffb3596';

interface PromoteOptions {
    position?: number; // 0-indexed position (e.g. 1 means 2nd)
    alwaysInclude?: boolean; // If true, TWC will be added even if it doesn't match filters
}

/**
 * Promotes TWC to a fixed position in the market table.
 * This ensures TIWICAT is consistently visible to users.
 */
export function promoteTWC(tokens: Token[], options: PromoteOptions = {}) {
    const { position = 1, alwaysInclude = false } = options;

    // Find TWC by address or symbol
    const twcIndex = tokens.findIndex(t =>
        t.address?.toLowerCase() === TWC_ADDRESS ||
        t.symbol?.toUpperCase() === 'TWC' ||
        t.symbol?.toUpperCase() === 'TWC-USD'
    );

    let twcToken: Token | undefined;
    let filteredTokens = tokens;

    if (twcIndex !== -1) {
        twcToken = tokens[twcIndex];
        filteredTokens = tokens.filter((_, i) => i !== twcIndex);
    } else if (alwaysInclude) {
        // This case handled if we want to force it even if filtered out
        // but it requires us to have the token data elsewhere.
        return tokens;
    } else {
        return tokens;
    }

    const result = [...filteredTokens];
    // Insert at target position (clamped to list length)
    const targetIndex = Math.min(position, result.length);
    result.splice(targetIndex, 0, twcToken);

    return result;
}
