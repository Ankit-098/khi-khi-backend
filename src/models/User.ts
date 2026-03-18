import mongoose, { Schema, Document } from 'mongoose';
import { dateUtils } from '../utils/date.utils';

export enum UserRole {
    CREATOR = 'CREATOR',
    BRAND = 'BRAND',
    AGENCY = 'AGENCY'
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    DELETED = 'DELETED'
}

export enum CreatorCategory {
    TECH = 'TECH',
    FASHION = 'FASHION',
    LIFESTYLE = 'LIFESTYLE',
    GAMING = 'GAMING',
    BEAUTY = 'BEAUTY',
    FITNESS = 'FITNESS',
    TRAVEL = 'TRAVEL',
    FOOD = 'FOOD',
    EDUCATION = 'EDUCATION',
    ENTERTAINMENT = 'ENTERTAINMENT',
    FINANCE = 'FINANCE',
    ART = 'ART',
    OTHER = 'OTHER'
}

export enum Platform {
    INSTAGRAM = 'INSTAGRAM',
    FACEBOOK = 'FACEBOOK',
    LINKEDIN = 'LINKEDIN',
    YOUTUBE = 'YOUTUBE'
}

export enum DeliverableType {
    // Instagram specific
    STORY = 'STORY',
    REEL = 'REEL',
    INSTA_CAROUSEL = 'INSTA_CAROUSEL',
    
    // YouTube
    DEDICATED_VIDEO = 'DEDICATED_VIDEO',
    INTEGRATED_SHOUTOUT = 'INTEGRATED_SHOUTOUT',
    YT_SHORTS = 'YT_SHORTS',

    // LinkedIn / Facebook
    TEXT_POST = 'TEXT_POST',
    LINKEDIN_VIDEO = 'LINKEDIN_VIDEO'
}

/**
 * Deliverable Pricing Schema
 * Defines the rate card for a specific connected account.
 */
export interface IDeliverablePricing {
    type: DeliverableType;
    minPrice: number;
    maxPrice?: number;
    currency: string;
    description?: string;
    options?: any; // Useful for specific length rates, e.g., { duration: "90s" } 
}

/**
 * Social Media Account Interface
 * Generic structure for any connected social platform
 */
export interface ISocialAccount {
    platform: Platform;            // 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', etc.
    platformId: string;            // Unique ID on that platform
    username: string;
    displayName?: string;
    profilePictureUrl?: string;
    bio?: string;
    followerCount: number;
    followingCount?: number;
    mediaCount: number;
    lastStatsSync?: Date;          // For background auto-updating (TTL)
    isBusinessAccount?: boolean;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    permissions: string[];
    accountConnectedAt: Date;
    lastLogin?: Date;              // Track last login for this specific account
    isPrimary: boolean;            // True if this is the primary account
    rates?: IDeliverablePricing[]; // Pricing matrix for this specific account
}

/**
 * Instagram Account Details Interface (Legacy)
 * For backward compatibility - now uses ISocialAccount
 */
export interface IInstagramAccount extends ISocialAccount {}

/**
 * User Document Interface
 * Supports multiple connected social media platforms
 */
export interface IUser extends Document {
    email: string;
    password?: string;
    role: UserRole;
    authMethods: string[];
    profile: {
        name: string;
        avatarUrl?: string;
        bio?: string;
        phoneNumber?: string;
        contactEmail?: string;
        country?: string;
        state?: string;
        city?: string;
        contactPrivacy: 'EVERYONE' | 'ON_REQUEST';
        category?: CreatorCategory;
        subCategories?: string[]; // Flexible tags like 'coding', 'review', 'vlog'
    };
    status: UserStatus;
    verification: {
        profile: boolean;
        contact: boolean;
        emailVerified?: boolean;
        phoneVerified?: boolean;
    };
    socialAccounts: ISocialAccount[];  // Multiple platform support
    primaryAccount?: {
        platform: Platform;
        platformId: string;
    };  // Convenience field - reference to primary account
    socialMetrics: {
        lastMetricsUpdate?: Date;  // Track when metrics were last fetched from API
    };
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Retained for any legacy dependencies, otherwise SocialAccountSchema manages all.
const InstagramAccountSchema: Schema = new Schema({
    // Deprecated. See SocialAccountSchema
});

const SocialAccountSchema: Schema = new Schema({
    platform: {
        type: String,
        enum: Object.values(Platform),
        required: true,
        index: true
    },
    platformId: {
        type: String,
        required: true,
        index: true
    },
    username: { type: String, required: true, lowercase: true },
    displayName: { type: String },
    profilePictureUrl: { type: String },
    bio: { type: String },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    mediaCount: { type: Number, default: 0 },
    isBusinessAccount: { type: Boolean, default: false },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },
    permissions: [{ type: String }],
    accountConnectedAt: {
        type: Date,
        default: () => dateUtils.now().toDate(),
        index: true
    },
    lastLogin: {
        type: Date,
        default: () => dateUtils.now().toDate()
    },
    isPrimary: {
        type: Boolean,
        default: false,
        index: true
    },
    rates: [{
        type: { type: String, enum: Object.values(DeliverableType), required: true },
        minPrice: { type: Number, required: true },
        maxPrice: { type: Number },
        currency: { type: String, default: 'INR' },
        description: { type: String },
        options: { type: Schema.Types.Mixed }
    }]
}, { _id: false });

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    role: {
        type: String,
        enum: Object.values(UserRole),
        required: true,
        index: true
    },
    authMethods: [{ type: String }],
    profile: {
        name: { type: String, required: true },
        avatarUrl: { type: String },
        bio: { type: String },
        phoneNumber: { type: String },
        contactEmail: { type: String },
        country: { type: String },
        state: { type: String },
        city: { type: String },
        contactPrivacy: { 
            type: String, 
            enum: ['EVERYONE', 'ON_REQUEST'], 
            default: 'ON_REQUEST' 
        },
        category: {
            type: String,
            enum: Object.values(CreatorCategory),
            index: true
        },
        subCategories: [{ type: String, lowercase: true, trim: true }]
    },
    status: {
        type: String,
        enum: Object.values(UserStatus),
        default: UserStatus.ACTIVE,
        index: true
    },
    verification: {
        profile: { type: Boolean, default: false },
        contact: { type: Boolean, default: false },
        emailVerified: { type: Boolean, default: false },
        phoneVerified: { type: Boolean, default: false }
    },
    socialAccounts: [SocialAccountSchema],
    primaryAccount: {
        platform: String,
        platformId: String
    },
    socialMetrics: {
        lastMetricsUpdate: { type: Date }
    },
    lastLogin: { type: Date }
}, { timestamps: true });

// Indexes for frequently queried fields
UserSchema.index({ 'socialAccounts.platform': 1, 'socialAccounts.platformId': 1 }, { unique: true });
UserSchema.index({ 'socialAccounts.username': 1 });
UserSchema.index({ role: 1, createdAt: -1 });

// Pre-save middleware to sync primaryAccount convenience field
UserSchema.pre('save', function(next) {
    const doc = this as any;
    if (doc.socialAccounts && Array.isArray(doc.socialAccounts)) {
        const primarySocial = doc.socialAccounts.find((acc: any) => acc.isPrimary);
        if (primarySocial) {
            doc.primaryAccount = {
                platform: primarySocial.platform,
                platformId: primarySocial.platformId
            };
        } else {
            doc.primaryAccount = undefined;
        }
    }
    next();
});

export default mongoose.model<IUser>('User', UserSchema);
