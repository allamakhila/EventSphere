const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

function verifyVendor(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Access denied" });
    
    jwt.verify(token, "secretkey", (err, decoded) => {
        if (err || decoded.role !== 'vendor') return res.status(403).json({ message: "Vendor access required" });
        req.user = decoded;
        next();
    });
}

// ==================== VENDOR SERVICES ====================

// Get vendor services
router.get("/services", verifyVendor, (req, res) => {
    db.query(
        "SELECT * FROM vendor_services WHERE vendor_id = ? ORDER BY created_at DESC",
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Error fetching services" });
            res.json(results);
        }
    );
});

// Add service
router.post("/services", verifyVendor, (req, res) => {
    const { service_name, category, price, description } = req.body;
    db.query(
        "INSERT INTO vendor_services (vendor_id, service_name, category, price, description) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, service_name, category, price, description],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Error adding service" });
            res.json({ success: true, message: "Service added", id: result.insertId });
        }
    );
});

// ==================== VENDOR BOOKINGS ====================

// Get vendor bookings
router.get("/bookings", verifyVendor, (req, res) => {
    db.query(
        `SELECT b.*, u.full_name as customer_name 
         FROM bookings b 
         JOIN users u ON b.user_id = u.id 
         WHERE b.vendor_id = ? 
         ORDER BY b.booking_date DESC`,
        [req.user.id],
        (err, results) => {
            if (err) {
                console.error("Error fetching vendor bookings:", err);
                return res.status(500).json({ message: "Error fetching bookings" });
            }
            res.json(results);
        }
    );
});

// Update booking status (vendor confirms)
router.put("/bookings/:id/status", verifyVendor, (req, res) => {
    const { status } = req.body;
    db.query(
        "UPDATE bookings SET status = ? WHERE id = ? AND vendor_id = ?",
        [status, req.params.id, req.user.id],
        (err, result) => {
            if (err) {
                console.error("Error updating booking status:", err);
                return res.status(500).json({ message: "Error updating status" });
            }
            res.json({ success: true, message: `Booking ${status}` });
        }
    );
});

// ==================== VENDOR EARNINGS ====================

// Get vendor earnings
router.get("/earnings", verifyVendor, (req, res) => {
    db.query(
        `SELECT 
            COALESCE(SUM(amount), 0) as total_earnings,
            COUNT(*) as total_bookings,
            COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as completed_earnings
         FROM bookings 
         WHERE vendor_id = ? AND status = 'confirmed'`,
        [req.user.id],
        (err, results) => {
            if (err) {
                console.error("Error fetching earnings:", err);
                return res.status(500).json({ message: "Error fetching earnings" });
            }
            res.json(results[0] || { total_earnings: 0, total_bookings: 0, completed_earnings: 0 });
        }
    );
});

// Get monthly earnings
router.get("/earnings/monthly", verifyVendor, (req, res) => {
    db.query(
        `SELECT 
            MONTH(booking_date) as month,
            YEAR(booking_date) as year,
            COALESCE(SUM(amount), 0) as earnings
         FROM bookings 
         WHERE vendor_id = ? AND status = 'confirmed'
         GROUP BY YEAR(booking_date), MONTH(booking_date)
         ORDER BY YEAR(booking_date) DESC, MONTH(booking_date) DESC`,
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Error fetching monthly earnings" });
            res.json(results);
        }
    );
});

// ==================== VENDOR REVIEWS ====================

// Get vendor reviews
// Get vendor reviews
router.get("/reviews", verifyVendor, (req, res) => {
    const vendor_id = req.user.id;
    console.log("Fetching reviews for vendor ID:", vendor_id);
    
    db.query(
        `SELECT r.*, u.full_name as customer_name 
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.vendor_id = ?
         ORDER BY r.created_at DESC`,
        [vendor_id],
        (err, results) => {
            if (err) {
                console.error("Error fetching vendor reviews:", err);
                return res.status(500).json({ message: "Error fetching reviews" });
            }
            console.log("Found reviews:", results.length);
            res.json(results);
        }
    );
});

// Get vendor rating summary
router.get("/ratings", verifyVendor, (req, res) => {
    db.query(
        `SELECT 
            COALESCE(AVG(rating), 0) as avg_rating,
            COUNT(*) as total_reviews,
            COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
            COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
            COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
            COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
            COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
         FROM reviews 
         WHERE vendor_id = ? AND status = 'approved'`,
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Error fetching ratings" });
            res.json(results[0] || { avg_rating: 0, total_reviews: 0 });
        }
    );
});

module.exports = router;