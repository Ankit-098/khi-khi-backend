import mongoose, { Schema, Document } from 'mongoose';

export enum BidStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED'
}

export interface IBid extends Document {
    campaignId: mongoose.Types.ObjectId;
    creatorId: mongoose.Types.ObjectId;
    bidAmount: number;
    agencyCommission: number;
    message?: string;
    status: BidStatus;
}

const BidSchema: Schema = new Schema({
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bidAmount: { type: Number, required: true },
    agencyCommission: { type: Number, default: 0 },
    message: { type: String },
    status: {
        type: String,
        enum: Object.values(BidStatus),
        default: BidStatus.PENDING
    }
}, { timestamps: true });

export default mongoose.model<IBid>('Bid', BidSchema);
