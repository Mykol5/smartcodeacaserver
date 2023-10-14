const jwt = require('jsonwebtoken');

// Secret key for signing tokens (keep this secret!)
const secretKey = 'your-secret-key'; // Replace with your own secret key

// Generate a token with user-related data
function generateAuthToken(user_id) {
  // Data to be stored in the token (e.g., user ID)
  const payload = {
    user_id: user_id,
  };

  // Options for token generation (e.g., expiration time)
  const options = {
    expiresIn: '1h', // Token expiration time (1 hour in this example)
  };

  // Create and sign the token
  const token = jwt.sign(payload, secretKey, options);

  return token;
}

module.exports = generateAuthToken;
