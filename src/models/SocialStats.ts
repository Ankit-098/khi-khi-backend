import mongoose, { Schema, Document } from 'mongoose';

/**
 * Social Stats Snapshot
 * Historical daily/weekly snapshots for any social media platform
 * Real-time metrics are fetched directly from platform API
 */
export interface ISocialStats extends Document {
    userId: mongoose.Types.ObjectId;
    platform: string;              // 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', etc.
    platformId: string;            // Account ID on that platform
    snapshotDate: Date;            // When this snapshot was taken
    metrics: {
        followers: number;
        following?: number;
        totalPosts: number;
        totalReels?: number;       // If applicable to platform
        totalVideos?: number;      // If applicable to platform
    };
    createdAt: Date;
    updatedAt: Date;
}

const SocialStatsSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    platform: {
        type: String,
        enum: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'],
        default: 'INSTAGRAM',
        index: true
    },
    platformId: {
        type: String,
        required: true,
        index: true
    },
    snapshotDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    metrics: {
        followers: { type: Number, default: 0 },
        following: { type: Number, default: 0 },
        totalPosts: { type: Number, default: 0 },
        totalReels: { type: Number },
        totalVideos: { type: Number }
    }
}, { timestamps: true });

// Indexes for efficient querying
SocialStatsSchema.index({ userId: 1, platform: 1, snapshotDate: -1 });
SocialStatsSchema.index({ snapshotDate: -1 });  // For trend queries
SocialStatsSchema.index({ 'metrics.followers': -1 });  // Sort by followers

export default mongoose.model<ISocialStats>('SocialStats', SocialStatsSchema);
