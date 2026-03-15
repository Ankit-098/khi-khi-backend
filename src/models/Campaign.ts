import mongoose, { Schema, Document } from 'mongoose';

export enum CampaignStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    COMPLETED = 'COMPLETED'
}

export interface ICampaign extends Document {
    brandId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    requirements: string[];
    minBid?: number;
    maxBid?: number;
    startDate: Date;
    endDate: Date;
    status: CampaignStatus;
}

const CampaignSchema: Schema = new Schema({
    brandId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    minBid: { type: Number },
    maxBid: { type: Number },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
        type: String,
        enum: Object.values(CampaignStatus),
        default: CampaignStatus.OPEN
    }
}, { timestamps: true });

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);
