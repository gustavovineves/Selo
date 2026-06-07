export const BLOCKCHAIN_PROOF_PROVIDER_TOKEN = 'BLOCKCHAIN_PROOF_PROVIDER';

export interface ProofResult {
  provider: string;
  network: string;
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
  proofHash: string;
  txHash: string | null;
  submittedAt: Date | null;
  errorMessage: string | null;
}

export interface IBlockchainProofProvider {
  readonly providerName: string;
  readonly networkName: string;

  /**
   * Submits a proof payload to the blockchain (or simulates it).
   * Returns the result with proofHash and optional txHash.
   */
  submitProof(eventType: string, payload: Record<string, unknown>): Promise<ProofResult>;
}
