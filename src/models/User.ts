import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
    CREATOR = 'CREATOR',
    BRAND = 'BRAND',
    AGENCY = 'AGENCY'
}

/**
 * Social Media Account Interface
 * Generic structure for any connected social platform
 */
export interface ISocialAccount {
    platform: string;              // 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', etc.
    platformId: string;            // Unique ID on that platform
    username: string;
    displayName?: string;
    profilePictureUrl?: string;
    bio?: string;
    followerCount: number;
    followingCount?: number;
    mediaCount: number;
    isBusinessAccount?: boolean;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    permissions: string[];
    accountConnectedAt: Date;
    isPrimary: boolean;            // True if this is the primary account
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
    };
    socialAccounts: ISocialAccount[];  // Multiple platform support
    primaryAccount?: {
        platform: string;
        platformId: string;
    };  // Convenience field - reference to primary account
    socialMetrics: {
        lastMetricsUpdate?: Date;  // Track when metrics were last fetched from API
    };
    createdAt: Date;
    updatedAt: Date;
}

const InstagramAccountSchema: Schema = new Schema({
    instagramId: { type: String, required: true, index: true },
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
    accountConnectedAt: { type: Date, default: Date.now }
}, { _id: false });

const SocialAccountSchema: Schema = new Schema({
    platform: {
        type: String,
        enum: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'TWITTER', 'FACEBOOK', 'LINKEDIN'],
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
        default: Date.now,
        index: true
    },
    isPrimary: {
        type: Boolean,
        default: false,
        index: true
    }
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
        bio: { type: String }
    },
    socialAccounts: [SocialAccountSchema],
    primaryAccount: {
        platform: String,
        platformId: String
    },
    socialMetrics: {
        lastMetricsUpdate: { type: Date }
    }
}, { timestamps: true });

// Indexes for frequently queried fields
UserSchema.index({ email: 1 });
UserSchema.index({ 'socialAccounts.platform': 1, 'socialAccounts.platformId': 1 }, { unique: true });
UserSchema.index({ 'socialAccounts.username': 1 });
UserSchema.index({ 'socialAccounts.isPrimary': 1 });  // Find primary account quickly
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
