const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root123",
    database: "eventsphere"
});

db.connect((err) => {
    if (err) {
        console.log("❌ DATABASE CONNECTION FAILED:");
        console.log(err);
    } else {
        console.log("✅ MySQL Connected Successfully");
    }
});

module.exports = db;