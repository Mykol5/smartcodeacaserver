const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://pcwoilsb:qMpcr-sqtP7xy1HIgNBF2dPSxHPi8R2o@peanut.db.elephantsql.com/pcwoilsb',
});


// // Create a new PostgreSQL pool
// const pool = new Pool({
//   user: 'pcwoilsb',
//   password: 'qMpcr-sqtP7xy1HIgNBF2dPSxHPi8R2o',
//   host: 'postgres://pcwoilsb:qMpcr-sqtP7xy1HIgNBF2dPSxHPi8R2o@peanut.db.elephantsql.com/pcwoilsb',
//   port: 5432, // default PostgreSQL port is 5432
//   database: 'pcwoilsb',
// });
// // Create a new PostgreSQL pool
// const pool = new Pool({
//   //user: 'postgres',
//   //password: 'Mykol~5555',
//   //host: 'localhost',
//   //port: 5433, // default PostgreSQL port is 5432
//   //database: 'smarttest',
// });

async function initializeDatabase() {
  try {
    // SQL query to create the users, lectures, and assignments tables if they don't exist
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id UUID DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        verification_code VARCHAR(50),
        student_code VARCHAR(20),
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        profile_picture BYTEA,
        bio TEXT
      );

      CREATE TABLE IF NOT EXISTS lectures (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        lecture_name VARCHAR(255) NOT NULL, /* Changed column name to lecture_name */
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        assignment_name VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE, -- Add the due_date column
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );    

      CREATE TABLE IF NOT EXISTS user_lectures (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        lecture_name VARCHAR(255) NOT NULL, /* Changed column name to lecture_name */
        completed BOOLEAN NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (lecture_name) REFERENCES lectures(title) /* Changed reference to lecture_name */
      );

      CREATE TABLE IF NOT EXISTS user_assignments (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        assignment_name VARCHAR(255) NOT NULL, /* Changed column name to assignment_name */
        due_date DATE, -- Add the due_date column
        completed BOOLEAN NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (assignment_name) REFERENCES assignments(title) /* Changed reference to assignment_name */
      );

      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        assignment_name VARCHAR(255) NOT NULL,
        grade TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    
    `;

    await pool.query(createTablesQuery);
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = {
  pool,
  initializeDatabase,
};








// const { Pool } = require('pg');

// // Create a new PostgreSQL pool
// const pool = new Pool({
//   user: 'postgres',
//   password: 'Mykol~5555',
//   host: 'localhost',
//   port: 5433, // default PostgreSQL port is 5432
//   database: 'smarttest',
// });

// async function initializeDatabase() {
//   try {
//     // SQL query to create the users, lectures, and assignments tables if they don't exist
//     const createTablesQuery = `
//       CREATE TABLE IF NOT EXISTS users (
//         id SERIAL PRIMARY KEY,
//         user_id UUID DEFAULT uuid_generate_v4(),
//         email VARCHAR(255) UNIQUE NOT NULL,
//         first_name VARCHAR(50) NOT NULL,
//         last_name VARCHAR(50) NOT NULL,
//         phone_number VARCHAR(15) NOT NULL,
//         verification_code VARCHAR(50),
//         student_code VARCHAR(20),
//         is_verified BOOLEAN DEFAULT false,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         profile_picture BYTEA,
//         bio TEXT
//       );

//       CREATE TABLE IF NOT EXISTS lectures (
//         id SERIAL PRIMARY KEY,
//         title VARCHAR(255) NOT NULL,
//         description TEXT,
//         created_at TIMESTAMPTZ DEFAULT NOW(),
//         updated_at TIMESTAMPTZ DEFAULT NOW()
//       );

//       CREATE TABLE IF NOT EXISTS assignments (
//         id SERIAL PRIMARY KEY,
//         title VARCHAR(255) NOT NULL,
//         description TEXT,
//         created_at TIMESTAMPTZ DEFAULT NOW(),
//         updated_at TIMESTAMPTZ DEFAULT NOW()
//       );

//       CREATE TABLE IF NOT EXISTS user_lectures (
//         id SERIAL PRIMARY KEY,
//         user_id INT NOT NULL,
//         lecture_id INT NOT NULL,
//         completed BOOLEAN NOT NULL,
//         FOREIGN KEY (user_id) REFERENCES users(id),
//         FOREIGN KEY (lecture_id) REFERENCES lectures(id)
//       );

//       CREATE TABLE IF NOT EXISTS user_assignments (
//         id SERIAL PRIMARY KEY,
//         user_id INT NOT NULL,
//         assignment_id INT NOT NULL,
//         completed BOOLEAN NOT NULL,
//         FOREIGN KEY (user_id) REFERENCES users(id),
//         FOREIGN KEY (assignment_id) REFERENCES assignments(id)
//       );
//     `;

//     // Execute the SQL query
//     await pool.query(createTablesQuery);
//   } catch (error) {
//     console.error('Error initializing database:', error);
//   }
// }

// module.exports = {
//   pool,
//   initializeDatabase,
// };

