// import mysql from 'mysql2';
import mysql from "mysql2";
import dotenv from 'dotenv';
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "cinemate",
});

db.connect((err)=>{
    if (err) throw err;
    console.log("Connected to the database");
});

export default db;