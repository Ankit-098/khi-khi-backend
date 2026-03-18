/**
 * Security Service
 * Centralized encryption and decryption for sensitive data (access tokens, etc.)
 */

import crypto from 'crypto';

class SecurityService {
    private encryptionKey: string;
    private algorithm = 'aes-256-cbc';

    constructor() {
        // ENCRYPTION_KEY should be 32 bytes for aes-256-cbc
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-secret-key-must-be-32-chars-long';
        
        if (this.encryptionKey.length < 32) {
            console.warn('⚠️  ENCRYPTION_KEY is too short. Using padding, but this is less secure.');
            this.encryptionKey = this.encryptionKey.padEnd(32, '0').substring(0, 32);
        } else if (this.encryptionKey.length > 32) {
            this.encryptionKey = this.encryptionKey.substring(0, 32);
        }
    }

    /**
     * Encrypt sensitive data
     * Returns "iv:encryptedData"
     */
    encrypt(data: string): string {
        if (!data) return '';
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return `${iv.toString('hex')}:${encrypted}`;
        } catch (error) {
            console.error('❌ Encryption failed:', error);
            throw new Error('Failed to encrypt sensitive data');
        }
    }

    /**
     * Decrypt sensitive data
     * Accepts "iv:encryptedData"
     */
    decrypt(encryptedData: string): string {
        if (!encryptedData) return '';
        try {
            const [ivHex, dataHex] = encryptedData.split(':');
            if (!ivHex || !dataHex) {
                // If it's not in our format, it might be unencrypted (legacy or error)
                // We should log this but maybe return as is if we want to support transition,
                // but for security it's better to fail or handle it carefully.
                console.warn('⚠️  Attempted to decrypt data without IV separator');
                return encryptedData; 
            }
            
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
            let decrypted = decipher.update(dataHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('❌ Decryption failed:', error);
            throw new Error('Failed to decrypt sensitive data');
        }
    }

    /**
     * Helper for Token Storage
     */
    encryptToken(token: string): string {
        return this.encrypt(token);
    }

    /**
     * Helper for Token Retrieval
     */
    decryptToken(encryptedToken: string): string {
        return this.decrypt(encryptedToken);
    }
}

export default new SecurityService();
