import type { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import type { AuthRequest } from '../types';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export async function register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
    }

    const { name, email, password } = req.body as { name: string; email: string; password: string };

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed });

    const token = signToken({ id: user._id.toString(), email: user.email, name: user.name });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
    }

    const { email, password } = req.body as { email: string; password: string };

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      throw new AppError('Invalid credentials', 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = signToken({ id: user._id.toString(), email: user.email, name: user.name });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await User.findById(req.authUser.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
}

export function logout(_req: AuthRequest, res: Response): void {
  res.json({ message: 'Logged out successfully' });
}
