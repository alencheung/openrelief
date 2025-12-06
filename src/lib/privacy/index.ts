/**
 * Privacy Utilities Index
 * 
 * This file exports all privacy-related utilities for easy importing
 */

// Differential privacy exports
export {
  generateLaplaceNoise,
  addLaplaceNoise,
  addNoiseToLocation,
  checkPrivacyBudget,
  consumePrivacyBudget,
  initializePrivacyBudget,
  resetPrivacyBudgets,
  getPrivacyBudget,
  applyDPToSpatialResults,
  createPrivateBoundingBox,
  DEFAULT_DP_CONFIGS,
  type DPConfig,
  type PrivacyBudget
} from './differential-privacy'

// Anonymization exports
export {
  reduceLocationPrecision,
  createPrivacyGrid,
  generalizeAge,
  generalizeTimestamp,
  checkKAnonymity,
  enforceKAnonymity,
  applyTemporalDecay,
  aggregateData,
  createUserClusters,
  anonymizeUserData,
  DEFAULT_K_ANONYMITY_CONFIGS,
  DEFAULT_TEMPORAL_DECAY_CONFIGS,
  type KAnonymityConfig,
  type TemporalDecayConfig
} from './anonymization'

// Cryptography exports
export {
  generateSecureRandom,
  generateSalt,
  deriveKey,
  encryptData,
  decryptData,
  storeUserKey,
  retrieveUserKey,
  createHashDigest,
  createSaltedHash,
  verifySaltedHash,
  createIdentityProof,
  verifyIdentityProof,
  encryptUserData,
  decryptUserData,
  generateSignature,
  verifySignature,
  generateSessionToken,
  verifySessionToken,
  generateKeyPair,
  DEFAULT_CRYPTO_CONFIG,
  type CryptoConfig,
  type KeyStorage,
  type EncryptedData
} from './cryptography'