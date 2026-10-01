import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../config/env';
import { User } from '../models';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure Passport Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || '';
        const avatar = profile.photos?.[0]?.value || '';

        // Find or create user
        const [user] = await User.findOrCreate({
          where: { googleId: profile.id },
          defaults: {
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatar,
          },
        });

        // Update profile info on each login
        await user.update({
          name: profile.displayName,
          avatar,
          email,
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow
 */
router.get('/google', (req: Request, res: Response, next) => {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    env.GOOGLE_CLIENT_ID.includes('your-google-client-id')
  ) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_not_configured`);
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

/**
 * GET /api/auth/google/callback
 * Google OAuth callback - exchanges code for token, creates/finds user, redirects with JWT
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = generateToken(user.id);

    // Redirect to frontend with token
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile
 */
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  });
});

/**
 * POST /api/auth/dev-login
 * Quick login for testing / demo purposes without requiring Google OAuth credentials
 */
router.post('/dev-login', async (req: Request, res: Response) => {
  try {
    const email = req.body.email || 'demo.user@reachinbox.ai';
    const name = req.body.name || 'ReachInbox Demo User';

    const [user] = await User.findOrCreate({
      where: { googleId: 'demo-google-id-12345' },
      defaults: {
        googleId: 'demo-google-id-12345',
        email,
        name,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
      },
    });

    const token = generateToken(user.id);
    res.json({ token, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Dev login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
