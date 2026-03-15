/**
 * Services Export
 * Centralized export of all service classes and interfaces
 */

export {
    type ISocialMediaService,
    type IUserMetrics,
    type IMediaInsights,
    type IMediaData,
    type IAudienceDemographics
} from './ISocialMediaService';

export { default as instagramAPIService } from './instagramAPI.service';
export { default as socialMediaFactory, SocialPlatform } from './socialMediaFactory';
export { default as profileService } from './profile.service';
