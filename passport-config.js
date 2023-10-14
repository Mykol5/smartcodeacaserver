// passport-config.js

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { pool } = require('./database'); // Import your database connection pool

// Configure Passport to use the Local strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'user_id', // Replace with your user identifier field
  },
  async (user_id, password, done) => {
    try {
      // Check if the user_id and password are valid (you might not need a password for your case)
      const userQuery = {
        text: 'SELECT * FROM users WHERE user_id = $1',
        values: [user_id],
      };

      const result = await pool.query(userQuery);

      if (result.rows.length === 1) {
        const user = result.rows[0];
        if (user.is_verified) {
          // User is authenticated, return the user object
          return done(null, user);
        }
      }

      // User authentication failed
      return done(null, false, { message: 'Authentication failed' });
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (user_id, done) => {
  try {
    const userQuery = {
      text: 'SELECT * FROM users WHERE user_id = $1',
      values: [user_id],
    };

    const result = await pool.query(userQuery);

    if (result.rows.length === 1) {
      const user = result.rows[0];
      done(null, user);
    } else {
      done(new Error('User not found'));
    }
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
