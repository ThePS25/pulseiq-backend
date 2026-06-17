import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import { env } from './env';

export function configurePassport(): void {
  if (!env.googleClientId || !env.googleClientSecret) {
    console.warn('Google OAuth not configured — skipping passport setup');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email from Google'), undefined);
          }

          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

          if (user) {
            if (!user.googleId) {
              user.googleId = profile.id;
              user.avatar = profile.photos?.[0]?.value;
              await user.save();
            }
          } else {
            user = await User.create({
              name: profile.displayName || email.split('@')[0],
              email,
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value,
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      },
    ),
  );
}
