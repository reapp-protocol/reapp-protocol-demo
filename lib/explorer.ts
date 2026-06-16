/**
 * Block-explorer links, centralized. Change EXPLORER_BASE to switch explorers in
 * one place. We use stellar.expert (richest contract + activity pages on Stellar).
 * Note its path segments are singular: /account, /contract, /tx.
 */
export const EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

export const txUrl = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`;
export const accountUrl = (account: string) => `${EXPLORER_BASE}/account/${account}`;
export const contractUrl = (contract: string) => `${EXPLORER_BASE}/contract/${contract}`;
