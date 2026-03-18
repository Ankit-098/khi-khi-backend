import mongoose, { Schema, Document } from 'mongoose';

export enum OTPMethod {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    WHATSAPP = 'WHATSAPP'
}

export interface IOTP extends Document {
    userId: mongoose.Types.ObjectId;
    method: OTPMethod;
    otp: string;
    expiresAt: Date;
    contactValue: string; // email or mobile number
    isUsed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OTPSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    method: {
        type: String,
        enum: Object.values(OTPMethod),
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '5m' } // TTL index to auto-delete expired OTPs
    },
    contactValue: {
        type: String,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Index for quick lookup during verification
OTPSchema.index({ userId: 1, method: 1, otp: 1, isUsed: 1 });

export default mongoose.model<IOTP>('OTP', OTPSchema);
