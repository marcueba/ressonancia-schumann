import { config } from 'dotenv';
config();
import { runCollector } from '../services/collector';

async function main() {
    console.log('[Schumann Job] started');
    
    // Configura o DATA_MODE explicitamente se não estiver
    if (process.env.DATA_MODE !== 'live') {
        process.env.DATA_MODE = 'live';
    }

    try {
        const result = await runCollector();
        if (result === 'persisted' || result === 'already_exists') {
            console.log('[Schumann Job] completed');
            process.exit(0);
        } else if (result === 'no_valid_observation') {
            console.log('[Schumann Job] no valid observation');
            console.log('[Schumann Job] completed');
            process.exit(0);
        } else {
            console.error('[Schumann Job] failed to collect');
            process.exit(1);
        }
    } catch (error: any) {
        // Mensagem sanitizada
        console.error(`[Schumann Job] Error: ${error.message || 'Unknown error'}`);
        process.exit(1);
    }
}

main();
