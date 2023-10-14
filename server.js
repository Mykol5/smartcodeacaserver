const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path'); // Import the path module
const passport = require('./passport-config'); // Import your Passport configuration
const session = require('express-session');
const { initializeDatabase } = require('./database');

// Import the SSE library
const { EventEmitter } = require('events');

// Create an event emitter to manage SSE connections
const sseEmitter = new EventEmitter();

// Function to send SSE updates
function sendSSEUpdate(data) {
  sseEmitter.emit('update', data);
}

// Call the initializeDatabase function to create the "users" table if it doesn't exist
initializeDatabase();

// Configure session middleware
app.use(session({
  secret: 'your-secret-key', // Replace with a secret key
  resave: false,
  saveUninitialized: false,
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(cors({ origin: 'https://smartcodeacademy.netlify.app' }));
app.use(express.json());

// Serve static files from the "client" directory
app.use(express.static(path.join(__dirname, 'client')));

app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Add your routes
app.use('/api', require('./routes/authRoutes')); // Adjust the path to match your setup

// SSE endpoint for profile updates
app.get('/sse-profile-updates', (req, res) => {
  // Set the content type to text/event-stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  // Function to send SSE updates to the client
  function sendSSE(data) {
    res.write(`event: profile-update\ndata: ${JSON.stringify(data)}\n\n`);
    // res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Send an initial event to establish the connection
  sendSSE({ message: 'Connection established' });

  // Log a message when an SSE connection is established
  console.log('SSE connection established');

  // Listen for updates and send them to the client
  const updateListener = (data) => {
    sendSSE(data);
  };

  sseEmitter.on('update', updateListener);

  // Handle client disconnect
  req.on('close', () => {
    sseEmitter.off('update', updateListener);
  });
});

// Example route for updating and broadcasting profile changes
app.post('/update-profile', (req, res) => {
  // Handle profile update logic here...

  // Simulate a profile update
  const updatedUserData = { firstName: 'UpdatedName' };

  // Send SSE update when the profile is updated
  sendSSEUpdate(updatedUserData);

  res.json({ message: 'Profile updated successfully' });
});

// Log out route
app.post('/logout', (req, res) => {
  // Assuming you store the token in localStorage
  localStorage.removeItem('authToken');
  res.status(200).json({ message: 'Logged out successfully' });
});


// Use the PORT environment variable for hosting on Render
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
