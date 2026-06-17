import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ReportScores } from '../types';

export interface IMetric extends Document {
  websiteId: Types.ObjectId;
  reportId: Types.ObjectId;
  date: Date;
  scores: ReportScores;
}

const metricSchema = new Schema<IMetric>(
  {
    websiteId: { type: Schema.Types.ObjectId, ref: 'Website', required: true, index: true },
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', required: true },
    date: { type: Date, default: Date.now, index: true },
    scores: {
      performance: { type: Number, required: true },
      seo: { type: Number, required: true },
      accessibility: { type: Number, required: true },
      security: { type: Number, required: true },
      bestPractices: { type: Number, required: true },
    },
  },
  { timestamps: false },
);

export const Metric = mongoose.model<IMetric>('Metric', metricSchema);
