import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  authUser?: AuthUser;
}

export interface ScanStage {
  stage: string;
  progress: number;
  message: string;
}

export interface TechnologyResult {
  name: string;
  category: string;
  confidence: number;
}

export interface ReportScores {
  performance: number;
  seo: number;
  accessibility: number;
  security: number;
  bestPractices: number;
}
