// src/utils/security.ts
/**
 * Security utilities for XSS prevention and data sanitization
 * Implements enterprise-grade security practices
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - Raw HTML string that may contain malicious code
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true
  });
}

/**
 * Sanitizes text content by escaping HTML entities
 * @param text - Raw text that may contain HTML
 * @returns Escaped text safe for display
 */
export function sanitizeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validates and sanitizes PGN input
 * @param pgn - Raw PGN string from user input
 * @returns Sanitized PGN or throws error if invalid
 */
export function sanitizePGN(pgn: string): string {
  // Remove any HTML tags completely
  const textOnly = pgn.replace(/<[^>]*>/g, '');
  
  // Validate PGN structure
  if (!isValidPGNStructure(textOnly)) {
    throw new Error('Invalid PGN format detected');
  }
  
  return textOnly.trim();
}

/**
 * Basic PGN structure validation
 */
function isValidPGNStructure(pgn: string): boolean {
  // Must contain move numbers or metadata
  const hasMoves = /\d+\.\s*[a-h1-8NBRQK+#=\-O]+/.test(pgn);
  const hasMetadata = /\[.*\]/.test(pgn);
  
  return hasMoves || hasMetadata;
}

/**
 * Encrypts sensitive data using Web Crypto API
 * @param data - Data to encrypt
 * @param key - Encryption key
 * @returns Encrypted data as base64 string
 */
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data encrypted with encryptData
 * @param encryptedData - Base64 encrypted data
 * @param key - Decryption key
 * @returns Decrypted string
 */
export async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(char => char.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generates a cryptographic key for data encryption
 * @returns CryptoKey for AES-GCM encryption
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Content Security Policy helper
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};