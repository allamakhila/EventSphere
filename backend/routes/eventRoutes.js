const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// Middleware to verify token
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }
    
    jwt.verify(token, "secretkey", (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token." });
        }
        req.user = decoded;
        next();
    });
}

// Create event
router.post("/create", verifyToken, (req, res) => {
    const { event_type, event_date, guest_count, city, budget_range } = req.body;
    const user_id = req.user.id;
    
    if (!event_type || !event_date || !guest_count || !city || !budget_range) {
        return res.status(400).json({ message: "All fields are required" });
    }
    
    db.query(
        "INSERT INTO events (user_id, event_type, event_date, guest_count, city, budget_range) VALUES (?, ?, ?, ?, ?, ?)",
        [user_id, event_type, event_date, guest_count, city, budget_range],
        (err, result) => {
            if (err) {
                console.error("Event creation error:", err);
                return res.status(500).json({ message: "Error creating event" });
            }
            res.status(201).json({ 
                message: "Event created successfully", 
                event_id: result.insertId 
            });
        }
    );
});

// Get user's events
router.get("/my-events", verifyToken, (req, res) => {
    db.query(
        "SELECT * FROM events WHERE user_id = ? ORDER BY event_date DESC",
        [req.user.id],
        (err, results) => {
            if (err) {
                console.error("Error fetching events:", err);
                return res.status(500).json({ message: "Error fetching events" });
            }
            res.json(results);
        }
    );
});

module.exports = router;