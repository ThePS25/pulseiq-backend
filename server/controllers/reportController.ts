import type { Response, NextFunction } from 'express';
import { Report } from '../models/Report';
import { Metric } from '../models/Metric';
import { AppError } from '../middleware/errorHandler';
import { generateReportPdf } from '../services/pdf/pdfService';
import { userIdFilter } from '../utils/objectId';
import type { AuthRequest } from '../types';

export async function getReportStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const filter = userIdFilter(req.authUser.id);

    const [total, completed, failed, recent] = await Promise.all([
      Report.countDocuments(filter),
      Report.countDocuments({ ...filter, status: 'completed' }),
      Report.countDocuments({ ...filter, status: 'failed' }),
      Report.find({ ...filter, status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id url scores createdAt scanDuration'),
    ]);

    res.json({ total, completed, failed, recent });
  } catch (error) {
    next(error);
  }
}

export async function listReports(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const { search, sort = 'date', order = 'desc', scoreCategory, page = '1', limit = '50' } = req.query as {
      search?: string;
      sort?: string;
      order?: string;
      scoreCategory?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = { ...userIdFilter(req.authUser.id), status: 'completed' };
    if (search) {
      filter.url = { $regex: search, $options: 'i' };
    }

    let sortField: Record<string, 1 | -1> = { createdAt: order === 'asc' ? 1 : -1 };
    if (sort === 'score' && scoreCategory) {
      sortField = { [`scores.${scoreCategory}`]: order === 'asc' ? 1 : -1 };
    }

    const [reports, total] = await Promise.all([
      Report.find(filter).sort(sortField).skip(skip).limit(limitNum),
      Report.countDocuments(filter),
    ]);

    res.json({ reports, total, page: pageNum, limit: limitNum });
  } catch (error) {
    next(error);
  }
}

export async function getReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const report = await Report.findOne({ _id: String(req.params.id), ...userIdFilter(req.authUser.id) });
    if (!report) throw new AppError('Report not found', 404);

    res.json(report);
  } catch (error) {
    next(error);
  }
}

export async function deleteReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const report = await Report.findOneAndDelete({ _id: String(req.params.id), ...userIdFilter(req.authUser.id) });
    if (!report) throw new AppError('Report not found', 404);

    res.json({ message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
}

export async function exportPdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const report = await Report.findOne({ _id: String(req.params.id), ...userIdFilter(req.authUser.id) });
    if (!report) throw new AppError('Report not found', 404);

    const pdfBytes = await generateReportPdf(report);
    const domain = new URL(report.url).hostname;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pulseiq-${domain}-report.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    next(error);
  }
}

export async function getMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Not authenticated', 401);

    const websiteId = String(req.params.websiteId);

    const ownsWebsite = await Report.exists({ websiteId, ...userIdFilter(req.authUser.id) });
    if (!ownsWebsite) throw new AppError('Metrics not found', 404);

    const metrics = await Metric.find({ websiteId }).sort({ date: 1 }).limit(20);

    res.json(metrics);
  } catch (error) {
    next(error);
  }
}
