import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  getMe,
  logout,
  registerValidation,
  loginValidation,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { signToken } from '../utils/jwt';
import { env } from '../config/env';
import type { IUser } from '../models/User';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

router.get('/google', (req, res, next) => {
  if (!env.googleClientId) {
    res.status(503).json({ message: 'Google OAuth is not configured' });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!env.googleClientId) {
    res.redirect(`${env.frontendUrl}/login?error=oauth_not_configured`);
    return;
  }

  passport.authenticate('google', { session: false, failureRedirect: `${env.frontendUrl}/login?error=oauth_failed` })(
    req,
    res,
    (err: Error | null) => {
      if (err) {
        res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
        return;
      }

      const user = req.user as IUser | undefined;
      if (!user) {
        res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
        return;
      }

      const token = signToken({ id: user._id.toString(), email: user.email, name: user.name });
      res.redirect(`${env.frontendUrl}/auth/callback?token=${token}`);
    },
  );
});

export default router;
