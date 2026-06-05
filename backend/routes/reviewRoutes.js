const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// Verify token middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: "Access denied" });
    }
    
    jwt.verify(token, "secretkey", (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = decoded;
        next();
    });
}

// ==================== CREATE REVIEW ====================
router.post("/create", verifyToken, (req, res) => {
    const { booking_id, vendor_id, venue_id, rating, comment } = req.body;
    const user_id = req.user.id;
    
    // Check if user has already reviewed this booking
    db.query(
        "SELECT * FROM reviews WHERE booking_id = ? AND user_id = ?",
        [booking_id, user_id],
        (err, existing) => {
            if (err) return res.status(500).json({ message: "Error checking review" });
            if (existing.length > 0) {
                return res.status(400).json({ message: "You have already reviewed this booking" });
            }
            
            // Insert review
            db.query(
                "INSERT INTO reviews (booking_id, user_id, vendor_id, venue_id, rating, comment, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')",
                [booking_id, user_id, vendor_id || null, venue_id || null, rating, comment],
                (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: "Error saving review" });
                    }
                    
                    // Update venue or vendor rating
                    if (venue_id) {
                        updateVenueRating(venue_id);
                    }
                    if (vendor_id) {
                        updateVendorRating(vendor_id);
                    }
                    
                    res.json({ success: true, message: "Review submitted successfully!" });
                }
            );
        }
    );
});

// Update venue average rating
function updateVenueRating(venue_id) {
    db.query(
        "SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE venue_id = ?",
        [venue_id],
        (err, result) => {
            if (err) return;
            const avgRating = result[0].avg_rating || 0;
            const total = result[0].total || 0;
            db.query(
                "UPDATE venues SET rating = ?, total_ratings = ? WHERE id = ?",
                [avgRating, total, venue_id]
            );
        }
    );
}

// Update vendor rating
function updateVendorRating(vendor_id) {
    db.query(
        "SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE vendor_id = ?",
        [vendor_id],
        (err, result) => {
            if (err) return;
            const avgRating = result[0].avg_rating || 0;
            const total = result[0].total || 0;
            db.query(
                "UPDATE users SET rating = ?, total_ratings = ? WHERE id = ?",
                [avgRating, total, vendor_id]
            );
        }
    );
}

// ==================== GET REVIEWS FOR VENDOR ====================
router.get("/vendor/:vendor_id", (req, res) => {
    const vendorId = req.params.vendor_id;
    
    db.query(
        `SELECT r.*, u.full_name as customer_name 
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.vendor_id = ? AND r.status = 'approved'
         ORDER BY r.created_at DESC`,
        [vendorId],
        (err, results) => {
            if (err) {
                console.error("Error fetching vendor reviews:", err);
                return res.status(500).json({ message: "Error fetching reviews" });
            }
            res.json(results);
        }
    );
});

// ==================== GET REVIEWS FOR VENUE ====================
router.get("/venue/:venue_id", (req, res) => {
    db.query(
        `SELECT r.*, u.full_name as user_name 
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.venue_id = ? AND r.status = 'approved'
         ORDER BY r.created_at DESC`,
        [req.params.venue_id],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Error fetching reviews" });
            res.json(results);
        }
    );
});

// ==================== GET ALL REVIEWS (ADMIN) ====================
router.get("/admin/all", verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
    }
    
    db.query(
        `SELECT r.*, 
                u.full_name as customer_name,
                v.name as venue_name,
                v2.full_name as vendor_name
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN venues v ON r.venue_id = v.id
         LEFT JOIN users v2 ON r.vendor_id = v2.id
         ORDER BY r.created_at DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Error fetching reviews" });
            res.json(results);
        }
    );
});

module.exports = router;