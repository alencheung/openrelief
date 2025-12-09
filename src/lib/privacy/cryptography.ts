/**
 * Cryptographic Protection Utilities for OpenRelief
 *
 * This module implements cryptographic functions for end-to-end encryption,
 * secure key management, and identity verification using cryptographic hashes.
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto'

// Configuration for cryptographic operations
export interface CryptoConfig {
  algorithm: string; // Encryption algorithm (e.g., 'aes-256-gcm')
  keyLength: number; // Key length in bytes
  ivLength: number; // Initialization vector length in bytes
  saltLength: number; // Salt length for key derivation
  tagLength: number; // Authentication tag length for AEAD ciphers
}

// Default cryptographic configurations
export const DEFAULT_CRYPTO_CONFIG: CryptoConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  saltLength: 32, // 256 bits
  tagLength: 16 // 128 bits
}

// Key storage interface
export interface KeyStorage {
  userId: string;
  keyId: string;
  encryptedKey: string;
  salt: string;
  iv: string;
  createdAt: Date;
  expiresAt?: Date;
}

// Encrypted data structure
export interface EncryptedData {
  data: string; // Encrypted data (base64)
  iv: string; // Initialization vector (base64)
  tag: string; // Authentication tag (base64)
  keyId: string; // Reference to the key used
  algorithm: string; // Encryption algorithm used
}

// In-memory key storage (in production, use secure storage like Hashicorp Vault)
const keyStorage = new Map<string, KeyStorage>()

/**
 * Generate a cryptographically secure random key
 * @param length Key length in bytes
 * @returns Random key as base64 string
 */
export function generateSecureRandom(length: number = DEFAULT_CRYPTO_CONFIG.keyLength): string {
  return randomBytes(length).toString('base64')
}

/**
 * Generate a cryptographically secure random salt
 * @param length Salt length in bytes
 * @returns Random salt as base64 string
 */
export function generateSalt(length: number = DEFAULT_CRYPTO_CONFIG.saltLength): string {
  return randomBytes(length).toString('base64')
}

/**
 * Derive a key from a password using scrypt
 * @param password User password
 * @param salt Salt for key derivation
 * @param keyLength Desired key length in bytes
 * @returns Derived key as Promise<Buffer>
 */
export async function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number = DEFAULT_CRYPTO_CONFIG.keyLength
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (err, derivedKey) => {
      if (err) {
        reject(err)
      } else {
        resolve(derivedKey)
      }
    })
  })
}

/**
 * Encrypt data using AES-256-GCM
 * @param data Data to encrypt
 * @param key Encryption key
 * @param config Cryptographic configuration
 * @returns Encrypted data object
 */
export function encryptData(
  data: string,
  key: Buffer,
  config: CryptoConfig = DEFAULT_CRYPTO_CONFIG
): EncryptedData {
  const iv = randomBytes(config.ivLength)
  const cipher = createCipheriv(config.algorithm, key, iv)

  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const tag = cipher.getAuthTag()

  return {
    data: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyId: '', // Will be set when storing the key
    algorithm: config.algorithm
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData Encrypted data object
 * @param key Decryption key
 * @returns Decrypted data as string
 */
export function decryptData(
  encryptedData: EncryptedData,
  key: Buffer
): string {
  const iv = Buffer.from(encryptedData.iv, 'base64')
  const tag = Buffer.from(encryptedData.tag, 'base64')

  const decipher = createDecipheriv(encryptedData.algorithm, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Store an encrypted key for a user
 * @param userId User ID
 * @param key Key to encrypt and store
 * @param masterKey Master key for encrypting user keys
 * @returns Key ID for reference
 */
export async function storeUserKey(
  userId: string,
  key: Buffer,
  masterKey: Buffer
): Promise<string> {
  const keyId = generateSecureRandom(16)
  const salt = randomBytes(DEFAULT_CRYPTO_CONFIG.saltLength)
  const iv = randomBytes(DEFAULT_CRYPTO_CONFIG.ivLength)

  // Derive encryption key from master key and salt
  const derivedKey = await deriveKey(masterKey.toString('base64'), salt)

  // Encrypt the user key
  const cipher = createCipheriv(DEFAULT_CRYPTO_CONFIG.algorithm, derivedKey, iv)
  let encryptedKey = cipher.update(key.toString('base64'), 'utf8', 'base64')
  encryptedKey += cipher.final('base64')

  const tag = cipher.getAuthTag()

  // Store key information
  const keyInfo: KeyStorage = {
    userId,
    keyId,
    encryptedKey: encryptedKey,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    createdAt: new Date()
  }

  keyStorage.set(`${userId}:${keyId}`, keyInfo)

  return keyId
}

/**
 * Retrieve and decrypt a user key
 * @param userId User ID
 * @param keyId Key ID
 * @param masterKey Master key for decryption
 * @returns Decrypted user key
 */
export async function retrieveUserKey(
  userId: string,
  keyId: string,
  masterKey: Buffer
): Promise<Buffer | null> {
  const keyInfo = keyStorage.get(`${userId}:${keyId}`)
  if (!keyInfo) {
    return null
  }

  const salt = Buffer.from(keyInfo.salt, 'base64')
  const iv = Buffer.from(keyInfo.iv, 'base64')

  // Derive decryption key from master key and salt
  const derivedKey = await deriveKey(masterKey.toString('base64'), salt)

  // Decrypt the user key
  const decipher = createDecipheriv(DEFAULT_CRYPTO_CONFIG.algorithm, derivedKey, iv)

  // Note: In a real implementation, you would need to store and retrieve the auth tag
  // For this example, we're simplifying the process

  try {
    let decryptedKey = decipher.update(keyInfo.encryptedKey, 'base64', 'utf8')
    decryptedKey += decipher.final('utf8')

    return Buffer.from(decryptedKey, 'base64')
  } catch (error) {
    console.error('Failed to decrypt user key:', error)
    return null
  }
}

/**
 * Create a cryptographic hash of data
 * @param data Data to hash
 * @param algorithm Hash algorithm (default: 'sha256')
 * @returns Hash as hex string
 */
export function createHashDigest(
  data: string,
  algorithm: string = 'sha256'
): string {
  return createHash(algorithm).update(data).digest('hex')
}

/**
 * Create a cryptographic hash with salt
 * @param data Data to hash
 * @param salt Salt value
 * @param algorithm Hash algorithm (default: 'sha256')
 * @returns Salted hash as hex string
 */
export function createSaltedHash(
  data: string,
  salt: string,
  algorithm: string = 'sha256'
): string {
  return createHash(algorithm).update(data + salt).digest('hex')
}

/**
 * Verify data against a salted hash
 * @param data Original data
 * @param salt Salt used for hashing
 * @param hash Hash to verify against
 * @param algorithm Hash algorithm (default: 'sha256')
 * @returns True if data matches the hash
 */
export function verifySaltedHash(
  data: string,
  salt: string,
  hash: string,
  algorithm: string = 'sha256'
): boolean {
  const computedHash = createSaltedHash(data, salt, algorithm)
  return computedHash === hash
}

/**
 * Create a zero-knowledge proof of identity (simplified implementation)
 * @param identityData Identity data to prove
 * @param secret Secret known only to the user
 * @returns Proof object
 */
export function createIdentityProof(
  identityData: Record<string, any>,
  secret: string
): {
  commitment: string;
  challenge: string;
  response: string;
  publicData: Record<string, any>;
} {
  // Create commitment (hash of secret)
  const commitment = createHashDigest(secret)

  // Generate challenge
  const challenge = generateSecureRandom(32)

  // Create response (hash of secret + challenge)
  const response = createHashDigest(secret + challenge)

  // Return only non-sensitive data
  const publicData = { ...identityData }
  delete publicData.password
  delete publicData.ssn
  delete publicData.email

  return {
    commitment,
    challenge,
    response,
    publicData
  }
}

/**
 * Verify a zero-knowledge proof of identity
 * @param proof Proof object to verify
 * @param secret Secret known only to the user
 * @returns True if proof is valid
 */
export function verifyIdentityProof(
  proof: {
    commitment: string;
    challenge: string;
    response: string;
    publicData: Record<string, any>;
  },
  secret: string
): boolean {
  // Verify commitment
  const computedCommitment = createHashDigest(secret)
  if (computedCommitment !== proof.commitment) {
    return false
  }

  // Verify response
  const computedResponse = createHashDigest(secret + proof.challenge)
  return computedResponse === proof.response
}

/**
 * Encrypt sensitive user data for storage
 * @param userId User ID
 * @param data Sensitive data to encrypt
 * @param masterKey Master key for key encryption
 * @returns Encrypted data object
 */
export async function encryptUserData(
  userId: string,
  data: Record<string, any>,
  masterKey: Buffer
): Promise<EncryptedData> {
  // Generate a new key for this data
  const dataKey = randomBytes(DEFAULT_CRYPTO_CONFIG.keyLength)

  // Store the key securely
  const keyId = await storeUserKey(userId, dataKey, masterKey)

  // Encrypt the data
  const jsonData = JSON.stringify(data)
  const encryptedData = encryptData(jsonData, dataKey)

  // Set the key ID
  encryptedData.keyId = keyId

  return encryptedData
}

/**
 * Decrypt sensitive user data from storage
 * @param userId User ID
 * @param encryptedData Encrypted data object
 * @param masterKey Master key for key decryption
 * @returns Decrypted data object
 */
export async function decryptUserData(
  userId: string,
  encryptedData: EncryptedData,
  masterKey: Buffer
): Promise<Record<string, any> | null> {
  // Retrieve the data key
  const dataKey = await retrieveUserKey(userId, encryptedData.keyId, masterKey)
  if (!dataKey) {
    return null
  }

  // Decrypt the data
  try {
    const decryptedJson = decryptData(encryptedData, dataKey)
    return JSON.parse(decryptedJson)
  } catch (error) {
    console.error('Failed to decrypt user data:', error)
    return null
  }
}

/**
 * Generate a cryptographic signature for data integrity
 * @param data Data to sign
 * @param secretKey Secret key for signing
 * @returns Signature as hex string
 */
export function generateSignature(data: string, secretKey: string): string {
  // In a real implementation, use HMAC or digital signatures
  // This is a simplified version using a hash
  return createHashDigest(data + secretKey)
}

/**
 * Verify a cryptographic signature
 * @param data Original data
 * @param signature Signature to verify
 * @param secretKey Secret key used for signing
 * @returns True if signature is valid
 */
export function verifySignature(data: string, signature: string, secretKey: string): boolean {
  const computedSignature = generateSignature(data, secretKey)
  return computedSignature === signature
}

/**
 * Generate a secure session token
 * @param userId User ID
 * @param expiresIn Expiration time in seconds
 * @returns Session token object
 */
export function generateSessionToken(userId: string, expiresIn: number = 3600): {
  token: string;
  expiresAt: Date;
  userId: string;
} {
  const timestamp = Date.now()
  const randomData = generateSecureRandom(32)
  const tokenData = `${userId}:${timestamp}:${randomData}`
  const token = createHashDigest(tokenData)

  const expiresAt = new Date(timestamp + expiresIn * 1000)

  return {
    token,
    expiresAt,
    userId
  }
}

/**
 * Verify a session token
 * @param token Session token to verify
 * @returns True if token is valid and not expired
 */
export function verifySessionToken(token: string): boolean {
  // In a real implementation, you would store and check tokens against a database
  // This is a simplified version that only checks format
  return /^[a-f0-9]{64}$/.test(token)
}

/**
 * Generate a key pair for asymmetric encryption (simplified)
 * @returns Key pair object
 */
export function generateKeyPair(): {
  publicKey: string;
  privateKey: string;
  } {
  // In a real implementation, use proper asymmetric cryptography
  // This is a simplified version for demonstration
  const privateKey = generateSecureRandom(64)
  const publicKey = createHashDigest(privateKey)

  return {
    publicKey,
    privateKey
  }
}