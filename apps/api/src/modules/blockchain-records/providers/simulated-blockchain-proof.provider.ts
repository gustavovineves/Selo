import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sanitizeForProof } from '../../../common/utils/sensitive-proof-sanitizer.util';
import { sha256, canonicalJson } from '../../../common/utils/canonical-json.util';
import { createHash } from 'crypto';
import type { IBlockchainProofProvider, ProofResult } from './blockchain-proof-provider.interface';

@Injectable()
export class SimulatedBlockchainProofProvider implements IBlockchainProofProvider {
  readonly providerName = 'simulated';

  constructor(private readonly config: ConfigService) {}

  get networkName(): string {
    return this.config.get<string>('BLOCKCHAIN_NETWORK', 'polygon_amoy');
  }

  async submitProof(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<ProofResult> {
    const sanitized = sanitizeForProof(payload) as Record<string, unknown>;
    const proofHash = sha256({ eventType, ...sanitized });

    // Deterministic fake txHash — not a real transaction but unique per proof
    const txHash =
      '0x' +
      createHash('sha256')
        .update(canonicalJson({ proofHash, eventType, provider: 'simulated' }))
        .digest('hex');

    return {
      provider: this.providerName,
      network: this.networkName,
      status: 'SUBMITTED',
      proofHash,
      txHash,
      submittedAt: new Date(),
      errorMessage: null,
    };
  }
}
