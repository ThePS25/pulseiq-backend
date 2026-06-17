import type { Response, NextFunction } from 'express';
import { Report } from '../models/Report';
import { AppError } from '../middleware/errorHandler';
import { isValidUrl, normalizeUrl } from '../utils/url';
import { getScanEmitter, getLatestProgress } from '../utils/scanProgress';
import { runWebsiteScan } from '../services/analysis/scanOrchestrator';
import { userIdFilter } from '../utils/objectId';
import type { AuthRequest } from '../types';

export async function startScan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const { url: rawUrl } = req.body as { url?: string };
    if (!rawUrl || !isValidUrl(rawUrl)) {
      throw new AppError('Please provide a valid URL', 400);
    }

    const url = normalizeUrl(rawUrl);

    const report = await Report.create({
      userId: req.authUser.id,
      url,
      status: 'pending',
    });

    runWebsiteScan(report._id.toString(), url, req.authUser.id).catch(console.error);

    res.status(202).json({
      scanId: report._id,
      message: 'Scan started',
    });
  } catch (error) {
    next(error);
  }
}

export async function getScanStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const id = String(req.params.id);
    const report = await Report.findOne({ _id: id, ...userIdFilter(req.authUser!.id) });
    if (!report) throw new AppError('Scan not found', 404);

    const latest = getLatestProgress(id);
    res.json({
      status: report.status,
      progress: latest || { stage: report.status, progress: 0, message: 'Waiting...' },
      reportId: report.status === 'completed' ? report._id : undefined,
    });
  } catch (error) {
    next(error);
  }
}

export function streamScanProgress(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const id = String(req.params.id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const emitter = getScanEmitter(id);
    const latest = getLatestProgress(id);
    if (latest) {
      res.write(`data: ${JSON.stringify(latest)}\n\n`);
    }

    const onProgress = (stage: unknown) => {
      res.write(`data: ${JSON.stringify(stage)}\n\n`);
    };

    emitter.on('progress', onProgress);

    req.on('close', () => {
      emitter.off('progress', onProgress);
    });
  } catch (error) {
    next(error);
  }
}

export async function getScanResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const id = String(req.params.id);
    const report = await Report.findOne({ _id: id, ...userIdFilter(req.authUser!.id) });
    if (!report) throw new AppError('Report not found', 404);

    res.json(report);
  } catch (error) {
    next(error);
  }
}
