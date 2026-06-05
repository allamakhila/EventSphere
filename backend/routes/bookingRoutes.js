const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// Verify token middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log("TOKEN RECEIVED:", token);

    if (!token) {
        return res.status(401).json({ message: "Access denied" });
    }

    jwt.verify(token, "secretkey", (err, decoded) => {

        if (err) {
            console.log("JWT ERROR:", err);
            return res.status(403).json({ message: "Invalid token" });
        }

        console.log("DECODED:", decoded);

        req.user = decoded;
        next();
    });
}

// ==================== CREATE VENUE BOOKING ====================
router.post("/create", verifyToken, (req, res) => {
    const { venue_id, venue_name, booking_date, amount, payment_method, special_requests } = req.body;
    const user_id = req.user.id;
    
    if (!booking_date) {
        return res.status(400).json({ message: "Booking date is required" });
    }
    
    db.query(
        `INSERT INTO bookings (user_id, venue_id, venue_name, booking_date, amount, payment_method, special_requests, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [user_id, venue_id || null, venue_name, booking_date, amount, payment_method, special_requests || null],
        (err, result) => {
            if (err) {
                console.error("Booking error:", err);
                return res.status(500).json({ message: "Booking failed", error: err.message });
            }
            res.json({ 
                success: true, 
                message: "Booking successful! Waiting for admin confirmation.",
                booking_id: result.insertId 
            });
        }
    );
});

// ==================== CREATE VENDOR BOOKING ====================
router.post("/create-vendor", verifyToken, (req, res) => {
    const { vendor_id, vendor_name, service_type, booking_date, amount, payment_method, special_requests } = req.body;
    const user_id = req.user.id;
    
    if (!booking_date) {
        return res.status(400).json({ message: "Booking date is required" });
    }
    
    db.query(
        `INSERT INTO bookings (user_id, vendor_id, vendor_name, service_type, booking_date, amount, payment_method, special_requests, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [user_id, vendor_id, vendor_name, service_type, booking_date, amount, payment_method, special_requests || null],
        (err, result) => {
            if (err) {
                console.error("Vendor booking error:", err);
                return res.status(500).json({ message: "Booking failed", error: err.message });
            }
            res.json({ 
                success: true, 
                message: "Vendor booking successful! Waiting for confirmation.",
                booking_id: result.insertId 
            });
        }
    );
});

// ==================== GET MY BOOKINGS (CUSTOMER) ====================
router.get("/my-bookings", verifyToken, (req, res) => {
    db.query(
        `SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date DESC`,
        [req.user.id],
        (err, results) => {
            if (err) {
                console.error("Fetch error:", err);
                return res.status(500).json({ message: "Error fetching bookings" });
            }
            res.json(results);
        }
    );
});

// ==================== CANCEL BOOKING (CUSTOMER) ====================
router.put("/cancel/:id", verifyToken, (req, res) => {
    db.query(
        "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Error cancelling booking" });
            res.json({ success: true, message: "Booking cancelled" });
        }
    );
});

module.exports = router;