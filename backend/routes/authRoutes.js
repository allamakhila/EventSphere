const express = require("express");
const router = express.Router();

const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

console.log("AUTH ROUTES LOADED ✅");


// ==========================
// REGISTER API
// ==========================
router.post("/register", async (req, res) => {
    const { full_name, email, phone, password, role } = req.body;

    if (!full_name || !email || !phone || !password) {
        return res.status(400).json({ message: "All fields are required ❌" });
    }

    // check if user exists
    db.query(
        "SELECT email FROM users WHERE email = ?",
        [email],
        async (err, result) => {

            if (err) {
                console.log("SELECT ERROR ❌:", err);
                return res.status(500).json({ message: "Database error ❌" });
            }

            if (result.length > 0) {
                return res.status(409).json({ message: "User already exists ❌" });
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                const roleValue = role || "customer";

                db.query(
                    "INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
                    [full_name, email, phone, hashedPassword, roleValue],
                    (err, result) => {

                        if (err) {
                            console.log("INSERT ERROR ❌:", err);
                            return res.status(500).json({ message: "Insert failed ❌" });
                        }

                        return res.status(201).json({
                            message: "User registered successfully ✅"
                        });
                    }
                );

            } catch (error) {
                console.log("HASH ERROR ❌:", error);
                return res.status(500).json({ message: "Server error ❌" });
            }
        }
    );
});


// ==========================
// LOGIN API
// ==========================
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required ❌" });
    }

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, result) => {

            if (err) {
                console.log("LOGIN ERROR ❌:", err);
                return res.status(500).json({ message: "Database error ❌" });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "User not found ❌" });
            }

            const user = result[0];

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ message: "Invalid password ❌" });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role },
                "secretkey",
                { expiresIn: "1h" }
            );

            return res.json({
                message: "Login successful ✅",
                token,
                user: {
                    id: user.id,
                    name: user.full_name,
                    email: user.email,
                    role: user.role
                }
            });
        }
    );
});

module.exports = router;