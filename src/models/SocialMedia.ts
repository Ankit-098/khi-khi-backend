import mongoose, { Schema, Document } from 'mongoose';

export enum MediaType {
    POST = 'POST',
    REEL = 'REEL',
    VIDEO = 'VIDEO',
    STORY = 'STORY',
    CAROUSEL = 'CAROUSEL',
    LIVE = 'LIVE',
    SHORTS = 'SHORTS',  // YouTube Shorts
}

/**
 * Social Media Content Document
 * Stores metadata for content from any platform
 * Real-time metrics fetched from platform API on demand
 */
export interface ISocialMedia extends Document {
    userId: mongoose.Types.ObjectId;
    platform: string;           // 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', etc.
    platformMediaId: string;    // Unique ID on that platform
    mediaType: MediaType;
    caption?: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    permalink?: string;
    postedAt: Date;
    hashtags: string[];
    mentions: string[];
    isSponsored: boolean;
    language?: string;
    location?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SocialMediaSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    platform: {
        type: String,
        enum: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'TWITTER', 'FACEBOOK', 'LINKEDIN'],
        required: true,
        index: true
    },
    platformMediaId: {
        type: String,
        required: true,
        index: true
    },
    mediaType: {
        type: String,
        enum: Object.values(MediaType),
        required: true,
        index: true
    },
    caption: { type: String },
    mediaUrl: {
        type: String,
        required: true
    },
    thumbnailUrl: { type: String },
    permalink: { type: String },
    postedAt: {
        type: Date,
        required: true,
        index: true
    },
    hashtags: [{ type: String, lowercase: true }],
    mentions: [{ type: String, lowercase: true }],
    isSponsored: {
        type: Boolean,
        default: false,
        index: true
    },
    language: { type: String },
    location: { type: String }
}, { timestamps: true });

// Indexes for efficient querying
SocialMediaSchema.index({ userId: 1, postedAt: -1 });
SocialMediaSchema.index({ userId: 1, platform: 1, postedAt: -1 });
SocialMediaSchema.index({ userId: 1, mediaType: 1 });
SocialMediaSchema.index({ platform: 1, createdAt: -1 });
SocialMediaSchema.index({ 'hashtags': 1 });

export default mongoose.model<ISocialMedia>('SocialMedia', SocialMediaSchema);
