// authRoutes.js
const express = require('express');
const router = express.Router();
const multer = require ('multer');
const { Pool } = require('pg');
const uuid = require('uuid');
const passport = require('passport'); // Import Passport.js

// Import the PostgreSQL connection pool configuration from database.js
const { pool } = require('../database');
const nodemailer = require('nodemailer');
const emailSender = require('../emailSender'); // Require the emailsender.js module
const generateAuthToken = require('../generateAuthToken');
const jwt = require('jsonwebtoken'); // Import the jsonwebtoken library
const secretKey = 'your-secret-key'; // Replace with your secret key

// Middleware to check if a valid token is provided
function verifyToken(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  const cleanedToken = token.split(' ')[1];

  try {
    const decoded = jwt.verify(cleanedToken, secretKey);

    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Token has expired' });
    }

    req.user = decoded; // Attach the user ID to the request object
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}



// Configure Multer for file uploads
const storage = multer.memoryStorage(); // Store the uploaded file in memory
const upload = multer({ storage: storage });

// Define route for user registration
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

        // Check if the email already exists in the database
        const checkEmailQuery = {
          text: 'SELECT * FROM users WHERE email = $1',
          values: [email],
        };
    
        const emailCheckResult = await pool.query(checkEmailQuery);
    
        if (emailCheckResult.rows.length > 0) {
          // Email already exists, send a response to the frontend
          return res.status(400).json({ error: 'Email already exists.' });
        }


    // Generate a unique verification code and UserID using uuid
    const verificationCode = uuid.v4();
    const userID = uuid.v4(); // Generate a unique UserID

    // Send a verification email to the user using the emailSender module
    await emailSender.sendVerificationEmail(email, verificationCode);

    // Insert user data into the PostgreSQL database with verification status set to false and store the UserID
    const query = {
      text: 'INSERT INTO users (first_name, last_name, email, verification_code, is_verified, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      values: [firstName, lastName, email, verificationCode, false, userID],
    };

    await pool.query(query);

    // Redirect the user to the email verification page with the email as a query parameter
    res.redirect(`https://smartcodeacademy.netlify.app/email-verification.html?email=${email}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during registration.' });
  }
});


// Define route for email verification
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    // Check if the provided code matches the one sent to the user
    const query = {
      text: 'SELECT * FROM users WHERE email = $1 AND verification_code = $2',
      values: [email, verificationCode],
    };

    const result = await pool.query(query);

    if (result.rows.length === 1) {
      // If the code is correct, update the user's verification status to true
      const updateQuery = {
        text: 'UPDATE users SET is_verified = true WHERE email = $1',
        values: [email],
      };

      await pool.query(updateQuery);

      // Send the second email containing the UserID to the user
      const user = result.rows[0];
      await emailSender.sendUserIdEmailAndNotifyAdmin(user.email, user.user_id, user.firstName, user.lastName); // Modify this to send the second email

      // Respond with a success message
      res.status(200).json({ message: 'Email verified successfully.' });
    } else {
      // Respond with an error message
      res.status(400).json({ error: 'Invalid verification code or email.' });
    }
  } catch (error) {
    console.error(error);
    // Respond with a server error message
    res.status(500).json({ error: 'An error occurred during email verification.' });
  }
});



// Define route for user login
router.post('/login', async (req, res) => {
  try {
    const { user_id } = req.body;

    console.log('Logging in user:', user_id);

    // Check if the provided user_id exists in the database
    const query = {
      text: 'SELECT * FROM users WHERE user_id = $1',
      values: [user_id],
    };

    const result = await pool.query(query);

    if (result.rows.length === 1) {
      const user = result.rows[0];

      if (user.is_verified) {
        // Generate an authentication token (you should have a function for this)
        const token = generateAuthToken(user.user_id);

        // If both checks pass, allow login and respond with a success message
        console.log('User is verified and authenticated');
        res.status(200).json({ message: 'Login successful.', token, username: user.first_name });
      } else {
        console.log('User is not verified');
        res.status(400).json({ error: 'Email not verified.', token: null, username: null });
      }
    } else {
      console.log('Invalid user ID');
      res.status(400).json({ error: 'Invalid user ID.', token: null, username: null });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred during login.', token: null, username: null });
  }
});




// Update user profile route
router.put('/update-profile', upload.single('profilePicture'), (req, res) => {
  // Check if there's a token in the request headers
  const token = req.header('Authorization'); // Assuming you're sending the token in the 'Authorization' header

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    // Remove 'Bearer ' prefix and verify the token using the secret key
    const cleanedToken = token.split(' ')[1];
    const decoded = jwt.verify(cleanedToken, secretKey);

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    if (decoded.exp < currentTime) {
      return res.status(401).json({ error: 'Token has expired' });
    }

    // Token is valid, proceed with the update
    const { firstName, lastName, bio } = req.body;
    const profilePictureData = req.file ? req.file.path : null; // Get the uploaded profile picture path

    const updateQuery = {
      text: 'UPDATE users SET first_name = $1, last_name = $2, bio = $3, profile_picture = $4 WHERE user_id = $5 RETURNING *',
      values: [firstName, lastName, bio, profilePictureData, decoded.user_id], // Use the user ID from the decoded token
    };

    pool.query(updateQuery, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'An error occurred while updating the profile.' });
      }

      if (result.rows.length === 1) {
        // Profile update was successful; send the updated user information in the response
        const updatedUser = result.rows[0];
        return res.status(200).json({
          message: 'Profile updated successfully.',
          user: updatedUser,
        });
      } else {
        return res.status(500).json({ error: 'Failed to update profile.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});



// Define a route to fetch user progress for lectures
router.get('/user-progress/lectures', async (req, res) => {
  try {
    // Check if there's a token in the request headers
    const token = req.header('Authorization'); // Assuming you're sending the token in the 'Authorization' header

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Remove 'Bearer ' prefix and verify the token using the secret key
    const cleanedToken = token.split(' ')[1];
    const decoded = jwt.verify(cleanedToken, secretKey);

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    if (decoded.exp < currentTime) {
      return res.status(401).json({ error: 'Token has expired' });
    }

    // Token is valid, proceed to fetch user progress for lectures
    // You can query your database to retrieve the user's lecture progress here
    // For example, you can query a "user_lectures" table to get the user's completed lectures
    const userId = decoded.user_id;
    console.log('Extracted User ID:', userId);

    // Query the database to fetch lecture progress for the user
    const query = {
      text: 'SELECT lecture_name, completed FROM user_lectures WHERE user_id = $1',
      values: [userId],
    };

    // Log the SQL query being executed
    console.log('SQL Query:', query.text);

    const result = await pool.query(query);

    // Log the result from the database
    console.log('Database Result:', result.rows);

    // Respond with the user progress data in the response
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Define a route to update user progress for lectures
router.put('/user-progress/lecture', async (req, res) => {
  try {
    // Check if there's a token in the request headers
    const token = req.header('Authorization'); // Assuming you're sending the token in the 'Authorization' header

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Remove 'Bearer ' prefix and verify the token using the secret key
    const cleanedToken = token.split(' ')[1];
    const decoded = jwt.verify(cleanedToken, secretKey);

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    if (decoded.exp < currentTime) {
      return res.status(401).json({ error: 'Token has expired' });
    }

    // Token is valid, proceed to update user progress for lectures
    // You can update the user's lecture progress in your database here
    // For example, you can update a "user_lectures" table with the lecture name and completion status
    const userId = decoded.user_id;
    const { lectureName, completed } = req.body;

    // Update the user's lecture progress in the database
    const updateQuery = {
      text: 'UPDATE user_lectures SET completed = $1 WHERE user_id = $2 AND lecture_name = $3',
      values: [completed, userId, lectureName],
    };

    await pool.query(updateQuery);

    // Respond with a success message
    res.status(200).json({ message: 'Lecture progress updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});



// Define the updateLectureCompletion function
const updateLectureCompletion = async (lectureName, userId) => {
  try {
    // Implement your SQL query to update the completion status
    // Here, we assume you have a 'user_lectures' table with columns 'user_id', 'lecture_name', and 'completed'
    // You can use the 'UPDATE' SQL statement to set 'completed' to 'true' for the specified user and lecture

    const updateQuery = `
        UPDATE user_lectures
        SET completed = true
        WHERE user_id = $1
        AND lecture_name = $2
    `;

    // Execute the update query
    await pool.query(updateQuery, [userId, lectureName]);

    console.log('Lecture completion status updated in the database.');

    // Return a success message
    return { success: true, message: 'Lecture completion status updated successfully' };
  } catch (error) {
    console.error('Error updating lecture completion status:', error);
    // Return an error message if an error occurs
    return { success: false, message: 'Failed to update lecture completion status' };
  }
};


// Server-side route to handle lecture result submission
router.put('/submit-lecture-result', async (req, res) => {
  try {
    const { htmlCode, cssCode, jsCode, lectureName } = req.body; // Extract lectureName and userId from the request body

    // Extract user ID from the authorization token
    const token = req.headers.authorization.split('Bearer ')[1];
    const decodedToken = jwt.verify(token, 'your-secret-key'); // Replace 'your-secret-key' with your actual secret key

    if (!decodedToken || !decodedToken.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = decodedToken.user_id;

// Create a transporter object using your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., 'Gmail', 'Outlook', etc.
  auth: {
    user: 'smarttechhubinc@gmail.com',
    pass: 'ryiqzfanjljtzyam',
  },
});

      const mailOptions = {
          from: 'smarttechhubinc@gmail.com',
          to: 'smarttechhubinc@gmail.com',
          subject: 'Lecture Result Submission',
          text: `HTML Code:\n${htmlCode}\n\nCSS Code:\n${cssCode}\n\nJS Code:\n${jsCode}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error('Error sending email:', error);
              res.status(500).json({ error: 'Internal server error' });
          } else {
              console.log('Email sent:', info.response);

          }})


      // Update the lecture completion status in the database if needed
      const updateResult = await updateLectureCompletion(lectureName, userId);

      if (updateResult.success) {
        // Lecture completion status updated successfully
        console.log('Lecture completion status updated successfully');
      } else {
        // Handle errors if update fails
        console.error('Failed to update lecture completion status');
      }
  
      res.status(200).json({ message: 'Lecture result submitted successfully' });
    } catch (error) {
      console.error('Error submitting lecture result:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });



router.get('/upcoming-assignments', async (req, res) => {
  try {
    // Check if there's a token in the request headers
    const token = req.header('Authorization');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Remove 'Bearer ' prefix and verify the token using the secret key
    const cleanedToken = token.split(' ')[1];
    const decoded = jwt.verify(cleanedToken, secretKey);

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    if (decoded.exp < currentTime) {
      return res.status(401).json({ error: 'Token has expired' });
    }

    // Get the user's ID from the request, adjust this based on your authentication setup
    const userId = decoded.user_id;

    // Log user ID, token, and current time for debugging
    console.log('User ID:', userId);
    console.log('Token:', cleanedToken);
    console.log('Current Time:', currentTime);

    // Get the current date
    const currentDate = new Date();
    
    // Log current date for debugging
    console.log('Current Date:', currentDate);

        // Query the database to fetch lecture progress for the user
    const query = {
      text: 'SELECT lecture_name, completed FROM user_lectures WHERE user_id = $1',
      values: [userId],
    };

    // Log the SQL query being executed
    console.log('SQL Query:', query.text);

    // Construct and log the SQL query for debugging
    const yourSQLQuery = `
        SELECT assignment_name, due_date, completed
        FROM user_assignments
        WHERE user_id = $1
        AND due_date > $2
        ORDER BY due_date ASC
    `;

    console.log('SQL Query:', yourSQLQuery);

    // Fetch upcoming assignments for the user
    const upcomingAssignments = await pool.query(yourSQLQuery, [userId, currentDate]);

    // Log the upcoming assignments for debugging
    console.log('Upcoming Assignments:', upcomingAssignments.rows);

    res.status(200).json(upcomingAssignments.rows);
  } catch (error) {
    console.error('Error fetching upcoming assignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// Define the updateAssignmentCompletion function
const updateAssignmentCompletion = async (assignmentName, userId) => {
  try {
    // Implement your SQL query to update the completion status for assignments
    // Here, we assume you have a 'user_assignments' table with columns 'user_id', 'assignment_name', and 'completed'
    // You can use the 'UPDATE' SQL statement to set 'completed' to 'true' for the specified user and assignment

    const updateQuery = `
        UPDATE user_assignments
        SET completed = true
        WHERE user_id = $1
        AND assignment_name = $2
    `;

    // Execute the update query
    await pool.query(updateQuery, [userId, assignmentName]);

    console.log('Assignment completion status updated in the database.');

    // Return a success message
    return { success: true, message: 'Assignment completion status updated successfully' };
  } catch (error) {
    console.error('Error updating assignment completion status:', error);
    // Return an error message if an error occurs
    return { success: false, message: 'Failed to update assignment completion status' };
  }
};

// Server-side route to handle assignment result submission
router.put('/submit-assignment-result', async (req, res) => {
  try {
    const { htmlCode, cssCode, jsCode, assignmentName } = req.body; // Extract assignmentName and userId from the request body

    // Extract user ID from the authorization token
    const token = req.headers.authorization.split('Bearer ')[1];
    const decodedToken = jwt.verify(token, 'your-secret-key'); // Replace 'your-secret-key' with your actual secret key

    if (!decodedToken || !decodedToken.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = decodedToken.user_id;

    // Create a transporter object using your email service credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail', // e.g., 'Gmail', 'Outlook', etc.
      auth: {
        user: 'smarttechhubinc@gmail.com',
        pass: 'ryiqzfanjljtzyam',
      },
    });

    const mailOptions = {
      from: 'smarttechhubinc@gmail.com',
      to: 'smarttechhubinc@gmail.com',
      subject: 'Assignment Result Submission',
      text: `HTML Code:\n${htmlCode}\n\nCSS Code:\n${cssCode}\n\nJS Code:\n${jsCode}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        console.log('Email sent:', info.response);
      }
    });

    // Update the assignment completion status in the database if needed
    const updateResult = await updateAssignmentCompletion(assignmentName, userId);

    if (updateResult.success) {
      // Assignment completion status updated successfully
      console.log('Assignment completion status updated successfully');
    } else {
      // Handle errors if update fails
      console.error('Failed to update assignment completion status');
    }

    res.status(200).json({ message: 'Assignment result submitted successfully' });
  } catch (error) {
    console.error('Error submitting assignment result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});










// Server-side route to fetch grades for the user
router.get('/grades', async (req, res) => {
  try {
    // Check if there's a token in the request headers
    const token = req.header('Authorization');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Remove 'Bearer ' prefix and verify the token using the secret key
    const cleanedToken = token.split(' ')[1];
    const decoded = jwt.verify(cleanedToken, secretKey);

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    if (decoded.exp < currentTime) {
      return res.status(401).json({ error: 'Token has expired' });
    }

    // Get the user's ID from the decoded token
    const userId = decoded.user_id;

    // Query your PostgreSQL database to fetch grades for the specified user
    const query = {
      text: 'SELECT * FROM grades WHERE user_id = $1',
      values: [userId],
    };

    const { rows } = await pool.query(query);

    res.status(200).json({ grades: rows });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// Server-side route to fetch notifications for a user
router.get('/notifications', async (req, res) => {
  try {
    // Check if there's a token in the request headers
    const token = req.header('Authorization');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Remove 'Bearer ' prefix and verify the token using the secret key
    const cleanedToken = token.split(' ')[1];
    const decoded = jwt.verify(cleanedToken, secretKey);

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    if (decoded.exp < currentTime) {
      return res.status(401).json({ error: 'Token has expired' });
    }

    // Get the user's ID from the decoded token
    const userId = decoded.user_id;

    // Query your PostgreSQL database to fetch notifications for the specified user
    const query = {
      text: 'SELECT * FROM notifications WHERE user_id = $1',
      values: [userId],
    };

    const { rows } = await pool.query(query);

    res.status(200).json({ notifications: rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;




// // Define route for user login
// router.post('/login', async (req, res) => {
//   try {
//     const { user_id } = req.body;

//     // Check if the provided user_id exists in the database
//     const query = {
//       text: 'SELECT * FROM users WHERE user_id = $1',
//       values: [user_id],
//     };

//     const result = await pool.query(query);

//     if (result.rows.length === 1) {
//       const user = result.rows[0];

//       if (user.is_verified) {
//         // If both checks pass, allow login and respond with a success message
//         res.status(200).json({ message: 'Login successful.', username: user.first_name });
//       } else {
//           res.status(400).json({ error: 'Email not verified.' });
//       }
//     } else {
//       res.status(400).json({ error: 'Invalid user ID.' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'An error occurred during login.' });
//   }
// });


// // Update user profile route
// router.put('/update-profile', async (req, res) => {
//   try {
//     const { firstName, lastName, bio } = req.body;
//     const userId = req.user.user_id; // Assuming you have authenticated users

//     // Update user profile in the database
//     const updateQuery = {
//       text: 'UPDATE users SET first_name = $1, last_name = $2, bio = $3 WHERE user_id = $4 RETURNING *',
//       values: [firstName, lastName, bio, userId],
//     };

//     const result = await pool.query(updateQuery);

//     // Check if the update was successful
//     if (result.rowCount === 1) {
//       return res.status(200).json({ message: 'Profile updated successfully.' });
//     } else {
//       return res.status(500).json({ error: 'Failed to update profile.' });
//     }
//   } catch (error) {
//     console.error('Error updating profile:', error);
//     return res.status(500).json({ error: 'An error occurred while updating the profile.' });
//   }
// });







// // Update the lecture completion status in the database if needed
// // Implement database update logic here
// // For example, assuming you have a database connection pool named 'pool'

// const updateLectureCompletion = async (lectureName, userId) => {
//   try {
//       // Implement your SQL query to update the completion status
//       // Here, we assume you have a 'user_lectures' table with columns 'user_id', 'lecture_name', and 'completed'
//       // You can use the 'UPDATE' SQL statement to set 'completed' to 'true' for the specified user and lecture

//       const updateQuery = `
//           UPDATE user_lectures
//           SET completed = true
//           WHERE user_id = $1
//           AND lecture_name = $2
//       `;

//       // Execute the update query
//       await pool.query(updateQuery, [userId, lectureName]);

//       console.log('Lecture completion status updated in the database.');

//       // Return a success message
//       return { success: true, message: 'Lecture completion status updated successfully' };
//   } catch (error) {
//       console.error('Error updating lecture completion status:', error);
//       // Return an error message if an error occurs
//       return { success: false, message: 'Failed to update lecture completion status' };
//   }
// };
//       res.status(200).json({ message: 'Lecture result submitted successfully' });
//   } catch (error) {
//       console.error('Error submitting lecture result:', error);
//       res.status(500).json({ error: 'Internal server error' });
//   }
// });



// // Upload profile picture route
// router.post('/upload-profile-picture', upload.single('profilePicture'), (req, res) => {
//   const userId = req.user.user_id; // Assuming you have authenticated users
//   const profilePictureData = req.file.buffer; // The uploaded file data in memory

//   // Store the profile picture data in your database
//   const insertQuery = {
//     text: 'UPDATE users SET profile_picture = $1 WHERE user_id = $2 RETURNING *',
//     values: [profilePictureData, userId],
//   };

//   pool.query(insertQuery, (err, result) => {
//     if (err) {
//       return res.status(500).json({ error: 'An error occurred while uploading the profile picture.' });
//     }
//     return res.status(200).json({ message: 'Profile picture uploaded successfully.' });
//   });
// });

// // Define route to check user authentication
// router.get('/check-auth', (req, res) => {
//   try {
//     console.log('Request received at /check-auth');

//     // Check if the user is authenticated using Passport.js
//     if (req.isAuthenticated()) {
//       console.log('User is authenticated:', req.user); // Log user details
//       const username = req.user.first_name; // Replace with your user object property
//       res.status(200).json({ isAuthenticated: true, username });
//     } else {
//       console.log('User is not authenticated');
//       // If not authenticated, send an error status
//       res.status(401).json({ isAuthenticated: false, error: 'Not authenticated' });
//     }
//   } catch (error) {
//     console.error('Error checking authentication:', error);
//     res.status(500).json({ error: 'An error occurred' });
//   }
// });






// // Define a route to fetch user progress for assignments
// router.get('/user-progress/assignments', async (req, res) => {
//   try {
//     // Check if there's a token in the request headers
//     const token = req.header('Authorization');

//     // ... Verify and decode the token, similar to the lecture progress route

//     // Token is valid, proceed to fetch user progress for assignments
//     const userId = decoded.user_id;

//     // Query the database to fetch assignment progress for the user
//     const query = {
//       text: 'SELECT assignment_name, completed FROM user_assignments WHERE user_id = $1',
//       values: [userId],
//     };

//     const result = await pool.query(query);

//     // Respond with the user progress data in the response
//     res.status(200).json(result.rows);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(401).json({ error: 'Invalid token' });
//   }
// });


// // Define a route to update user progress for assignments
// router.put('/user-progress/assignments', async (req, res) => {
//   try {
//     // Check if there's a token in the request headers
//     const token = req.header('Authorization');

//     // ... Verify and decode the token, similar to the lecture progress route

//     // Token is valid, proceed to update user progress for assignments
//     const userId = decoded.user_id;
//     const { assignmentName, completed } = req.body;

//     // Update the user's assignment progress in the database
//     const updateQuery = {
//       text: 'UPDATE user_assignments SET completed = $1 WHERE user_id = $2 AND assignment_name = $3',
//       values: [completed, userId, assignmentName],
//     };

//     await pool.query(updateQuery);

//     // Respond with a success message
//     res.status(200).json({ message: 'Assignment progress updated successfully' });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(401).json({ error: 'Invalid token' });
//   }
// });



// // Server-side route to fetch assignment status for a user
// router.get('/assignment-status/:userId', async (req, res) => {
//   try {
//     const userId = req.params.userId;

//     // Query your database to fetch assignment status for the specified user
//     const query = {
//       text: 'SELECT * FROM user_assignments WHERE user_id = $1',
//       values: [userId],
//     };

//     const { rows } = await pool.query(query);

//     res.status(200).json({ assignmentStatus: rows });
//   } catch (error) {
//     console.error('Error fetching assignment status:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });