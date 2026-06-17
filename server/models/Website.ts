import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWebsite extends Document {
  url: string;
  domain: string;
  lastScannedAt?: Date;
  scanCount: number;
  createdAt: Date;
}

const websiteSchema = new Schema<IWebsite>(
  {
    url: { type: String, required: true },
    domain: { type: String, required: true, index: true },
    lastScannedAt: { type: Date },
    scanCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

websiteSchema.index({ url: 1 });

export const Website = mongoose.model<IWebsite>('Website', websiteSchema);

export type WebsiteDocument = IWebsite & { _id: Types.ObjectId };
