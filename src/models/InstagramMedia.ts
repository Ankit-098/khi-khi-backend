import mongoose, { Schema, Document } from 'mongoose';

export enum MediaType {
    POST = 'POST',
    REEL = 'REEL',
    STORY = 'STORY',
    CAROUSEL = 'CAROUSEL'
}

/**
 * Instagram Media Document
 * Stores STATIC post/reel data only
 * Real-time metrics (likes, comments, reach) fetched from Instagram API
 */
export interface IInstagramMedia extends Document {
    userId: mongoose.Types.ObjectId;
    instagramId: string;              // Instagram media ID
    mediaType: MediaType;
    caption?: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    permalink?: string;
    postedAt: Date;                   // When posted on Instagram
    hashtags: string[];
    mentions: string[];
    isSponsored: boolean;
    createdAt: Date;                  // When saved in our DB
    updatedAt: Date;
}

const InstagramMediaSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    instagramId: {
        type: String,
        required: true,
        unique: true,
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
    }
}, { timestamps: true });

// Indexes for efficient querying
InstagramMediaSchema.index({ userId: 1, postedAt: -1 });
InstagramMediaSchema.index({ userId: 1, mediaType: 1 });
InstagramMediaSchema.index({ createdAt: -1 });

export default mongoose.model<IInstagramMedia>('InstagramMedia', InstagramMediaSchema);
