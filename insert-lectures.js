const { pool } = require('./database');

async function insertLecturesForAllUsers() {
  try {
    // Step 1: Retrieve a list of all user UUIDs
    const userUUIDs = await pool.query('SELECT user_id FROM users');

    // Step 2: Loop through each user UUID
    for (const user of userUUIDs.rows) {
      const userUUID = user.user_id;

      // Step 3: Insert lectures for the user into the user_lectures table
      await pool.query(
        'INSERT INTO user_lectures (user_id, lecture_name, completed) SELECT $1, lecture_name, false FROM lectures',
        [userUUID]
      );
    }

    console.log('Lectures inserted for all users successfully.');
  } catch (error) {
    console.error('Error inserting lectures:', error);
  }
}

insertLecturesForAllUsers();





// const { pool } = require('./database');

// async function insertLecturesForAllUsers() {
//   try {
//     // Step 1: Retrieve a list of all user UUIDs
//     const userUUIDs = await db.any('SELECT user_id FROM users');

//     // Step 2: Loop through each user UUID
//     for (const user of userUUIDs) {
//       const userUUID = user.user_id;

//       // Step 3: Insert lectures for the user into the user_lectures table
//       await db.none(
//         'INSERT INTO user_lectures (user_id, lecture_name, completed) SELECT $1, lecture_name, false FROM lectures',
//         [userUUID]
//       );
//     }

//     console.log('Lectures inserted for all users successfully.');
//   } catch (error) {
//     console.error('Error inserting lectures:', error);
//   }
// }

// insertLecturesForAllUsers();
