import mongoose, { Schema, Document, Types, type SchemaDefinitionProperty } from 'mongoose';
import type { ReportScores, TechnologyResult } from '../types';

export type ReportStatus = 'pending' | 'scanning' | 'completed' | 'failed';

export interface IReport extends Document {
  userId: Types.ObjectId;
  websiteId?: Types.ObjectId;
  url: string;
  status: ReportStatus;
  scores: ReportScores;
  performance: {
    metrics: Record<string, number | string>;
    recommendations: string[];
  };
  seo: {
    findings: Record<string, unknown>;
    recommendations: string[];
  };
  accessibility: {
    issues: Array<{ type: string; description: string; count?: number }>;
    recommendations: string[];
  };
  security: {
    headers: Record<string, string | boolean>;
    ssl: Record<string, unknown>;
    recommendations: string[];
  };
  technologies: TechnologyResult[];
  scanDuration?: number;
  errorMessage?: string;
  createdAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    websiteId: { type: Schema.Types.ObjectId, ref: 'Website' },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'scanning', 'completed', 'failed'],
      default: 'pending',
    },
    scores: {
      performance: { type: Number, default: 0 },
      seo: { type: Number, default: 0 },
      accessibility: { type: Number, default: 0 },
      security: { type: Number, default: 0 },
      bestPractices: { type: Number, default: 0 },
    },
    performance: {
      metrics: { type: Schema.Types.Mixed, default: {} },
      recommendations: { type: [String], default: [] },
    },
    seo: {
      findings: { type: Schema.Types.Mixed, default: {} },
      recommendations: { type: [String], default: [] },
    },
    accessibility: {
      issues: { type: [Schema.Types.Mixed], default: [] },
      recommendations: { type: [String], default: [] },
    },
    security: {
      headers: { type: Schema.Types.Mixed, default: {} },
      ssl: { type: Schema.Types.Mixed, default: {} },
      recommendations: { type: [String], default: [] },
    },
    technologies: {
      type: [{
        name: String,
        category: String,
        confidence: Number,
      }],
      default: [],
    } as SchemaDefinitionProperty<TechnologyResult[]>,
    scanDuration: { type: Number },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

reportSchema.index({ createdAt: -1 });
reportSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
