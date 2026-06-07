import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sanitizeForProof } from '../../../common/utils/sensitive-proof-sanitizer.util';
import { sha256 } from '../../../common/utils/canonical-json.util';
import type { IBlockchainProofProvider, ProofResult } from './blockchain-proof-provider.interface';

/**
 * Testnet provider stub — prepared for Ethereum/Polygon testnet integration.
 * Only executes real calls when BLOCKCHAIN_ENABLE_REAL_CALLS=true.
 * In all other cases, returns a FAILED result with a clear explanation.
 *
 * To enable real testnet calls (future):
 *   BLOCKCHAIN_PROVIDER=testnet
 *   BLOCKCHAIN_ENABLE_REAL_CALLS=true
 *   BLOCKCHAIN_RPC_URL=<rpc>
 *   BLOCKCHAIN_PRIVATE_KEY=<key>      ← NEVER commit
 *   BLOCKCHAIN_CONTRACT_ADDRESS=<addr>
 *   BLOCKCHAIN_NETWORK=polygon_amoy   (or ethereum_sepolia)
 */
@Injectable()
export class TestnetBlockchainProofProvider implements IBlockchainProofProvider {
  private readonly logger = new Logger(TestnetBlockchainProofProvider.name);

  readonly providerName = 'testnet';

  constructor(private readonly config: ConfigService) {}

  get networkName(): string {
    return this.config.get<string>('BLOCKCHAIN_NETWORK', 'polygon_amoy');
  }

  async submitProof(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<ProofResult> {
    const enableRealCalls = this.config.get<string>('BLOCKCHAIN_ENABLE_REAL_CALLS', 'false');

    const sanitized = sanitizeForProof(payload) as Record<string, unknown>;
    const proofHash = sha256({ eventType, ...sanitized });

    if (enableRealCalls !== 'true') {
      this.logger.warn(
        `TestnetBlockchainProofProvider: BLOCKCHAIN_ENABLE_REAL_CALLS is not 'true'. ` +
          `Returning PENDING (no network call). eventType=${eventType}`,
      );
      return {
        provider: this.providerName,
        network: this.networkName,
        status: 'PENDING',
        proofHash,
        txHash: null,
        submittedAt: null,
        errorMessage:
          'Testnet calls disabled. Set BLOCKCHAIN_ENABLE_REAL_CALLS=true and configure RPC/private key to enable.',
      };
    }

    // Real testnet call — Fase futura com ethers/viem.
    // Requires: BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, BLOCKCHAIN_CONTRACT_ADDRESS
    const rpcUrl = this.config.get<string>('BLOCKCHAIN_RPC_URL');
    const contractAddress = this.config.get<string>('BLOCKCHAIN_CONTRACT_ADDRESS');

    if (!rpcUrl || !contractAddress) {
      return {
        provider: this.providerName,
        network: this.networkName,
        status: 'FAILED',
        proofHash,
        txHash: null,
        submittedAt: new Date(),
        errorMessage: 'Missing BLOCKCHAIN_RPC_URL or BLOCKCHAIN_CONTRACT_ADDRESS. Cannot submit to testnet.',
      };
    }

    // Placeholder — real ethers/viem integration goes here in Fase 27+.
    // The private key must NEVER be logged.
    this.logger.log(`TestnetBlockchainProofProvider: Would submit proofHash=${proofHash} to ${this.networkName}`);

    return {
      provider: this.providerName,
      network: this.networkName,
      status: 'PENDING',
      proofHash,
      txHash: null,
      submittedAt: new Date(),
      errorMessage: 'Real testnet submission not yet implemented. Marked PENDING for future processing.',
    };
  }
}
