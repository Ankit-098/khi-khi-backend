/**
 * Social Media Service Factory
 * Registry pattern for platform-specific services
 * Allows extensible addition of new platforms
 */

import { ISocialMediaService } from './ISocialMediaService';
import InstagramAPIService from './instagramAPI.service';

export enum SocialPlatform {
    INSTAGRAM = 'INSTAGRAM',
    TIKTOK = 'TIKTOK',
    YOUTUBE = 'YOUTUBE',
    TWITTER = 'TWITTER',
    FACEBOOK = 'FACEBOOK',
    LINKEDIN = 'LINKEDIN'
}

class SocialMediaServiceFactory {
    private services: Map<string, ISocialMediaService> = new Map();

    constructor() {
        this.registerService(SocialPlatform.INSTAGRAM, InstagramAPIService);
        // TODO: Register other platforms as they're implemented
        // this.registerService(SocialPlatform.TIKTOK, new TikTokAPIService());
        // this.registerService(SocialPlatform.YOUTUBE, new YouTubeAPIService());
    }

    /**
     * Register a platform service
     */
    registerService(platform: SocialPlatform | string, service: ISocialMediaService): void {
        this.services.set(platform.toUpperCase(), service);
    }

    /**
     * Get service for a platform
     */
    getService(platform: SocialPlatform | string): ISocialMediaService {
        const service = this.services.get(platform.toUpperCase());
        if (!service) {
            throw new Error(`Social media service not implemented for platform: ${platform}`);
        }
        return service;
    }

    /**
     * Check if platform is supported
     */
    isSupported(platform: SocialPlatform | string): boolean {
        return this.services.has(platform.toUpperCase());
    }

    /**
     * Get all supported platforms
     */
    getSupportedPlatforms(): string[] {
        return Array.from(this.services.keys());
    }
}

export default new SocialMediaServiceFactory();
