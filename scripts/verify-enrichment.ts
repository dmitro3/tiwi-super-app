import { getEnrichedMetadata } from '../lib/backend/services/enrichment-service';
import { getDydxMarkets } from '../lib/backend/services/dydx-service';

async function run() {
    console.log('Checking dYdX Market Enrichment...');

    try {
        // 1. Test Enlightenment on a symbol likely needing fallback
        const symbol = 'JUP';
        console.log(`Enriching ${symbol}...`);
        const meta = await getEnrichedMetadata(symbol);
        console.log('Result:', JSON.stringify(meta, null, 2));

        // 2. Test dYdX markets fetch
        console.log('\nFetching dYdX markets...');
        const markets = await getDydxMarkets();
        console.log(`Found ${markets.length} markets.`);

        const sample = markets.find(m => m.ticker === 'BTC-USD');
        console.log('Sample Market (BTC-USD):', JSON.stringify({
            ticker: sample?.ticker,
            name: sample?.name,
            logo: sample?.logo ? (sample.logo.substring(0, 50) + '...') : 'N/A',
            source: sample?.metadataSource
        }, null, 2));

    } catch (error) {
        console.error('Error during verification:', error);
    }
}

run();
