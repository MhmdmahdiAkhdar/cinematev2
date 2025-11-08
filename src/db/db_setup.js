import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';


dotenv.config();


export async function createDatabase() {
    // Connect to MySQL without specifying a database initially
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true,
    });

    // Check if the database exists
    const [rows] = await connection.query(
        `SHOW DATABASES LIKE '${process.env.DB_NAME || "cinemate"}'`
    );

    if (rows.length === 0) {
        console.log(`Database "${process.env.DB_NAME}" does not exist. Creating...`);

        // Create the database
        await connection.query(`CREATE DATABASE ${process.env.DB_NAME}`);
        console.log(`Database "${process.env.DB_NAME}" created successfully.`);

        // Use the newly created database
        await connection.query(`USE ${process.env.DB_NAME}`);

        // Read and execute the schema SQL file
        const schemaPath = path.resolve('db/init_db.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await connection.query(schema);
        console.log("Tables created successfully.");
        // Read and execute the schema SQL file
        schemaPath = path.resolve('db/create_triggers.sql');
        schema = fs.readFileSync(schemaPath, 'utf-8');
        await connection.query(schema);
        console.log("Triggers created successfully.");
    } else {
        console.log(`Database "${process.env.DB_NAME}" already exists. Skipping creation.`);
    }

    await connection.end();
}
