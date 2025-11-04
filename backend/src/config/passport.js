import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import passport from 'passport';
import db from '../db/knex.js';

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

const strategy = new JwtStrategy(opts, async (payload, done) => {
  try {
    const user = await db('users')
      .select('id', 'email', 'role', 'status')
      .where({ id: payload.sub })
      .first();

    if (!user || user.status !== 'CONFIRMED') {
      return done(null, false);
    }

    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
});

passport.use(strategy);

export default passport;