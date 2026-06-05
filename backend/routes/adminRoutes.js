const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// ==========================
// ADMIN VERIFICATION MIDDLEWARE
// ==========================
function verifyAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }
    
    jwt.verify(token, "secretkey", (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token." });
        }
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: "Admin access required." });
        }
        req.user = decoded;
        next();
    });
}

// ==========================
// GET ALL USERS
// ==========================
router.get("/users", verifyAdmin, (req, res) => {
    db.query(
        "SELECT id, full_name, email, phone, role, status, created_at FROM users ORDER BY id DESC",
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error fetching users ❌" });
            }
            res.json(result);
        }
    );
});

// ==========================
// GET USER BY ID
// ==========================
router.get("/users/:id", verifyAdmin, (req, res) => {
    db.query(
        "SELECT id, full_name, email, phone, role, status, created_at FROM users WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching user ❌" });
            }
            if (result.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json(result[0]);
        }
    );
});

// ==========================
// UPDATE USER STATUS
// ==========================
router.put("/users/:id/status", verifyAdmin, (req, res) => {
    const { status } = req.body;
    db.query(
        "UPDATE users SET status = ? WHERE id = ?",
        [status, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error updating user status ❌" });
            }
            res.json({ success: true, message: "User status updated ✅" });
        }
    );
});

// ==========================
// PROMOTE USER TO ADMIN
// ==========================
router.put("/make-admin/:id", verifyAdmin, (req, res) => {
    const userId = req.params.id;
    db.query(
        "UPDATE users SET role='admin' WHERE id=?",
        [userId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error updating role ❌" });
            }
            res.json({ success: true, message: "User promoted to admin successfully ✅" });
        }
    );
});

// ==========================
// DELETE USER
// ==========================
router.delete("/users/:id", verifyAdmin, (req, res) => {
    db.query(
        "DELETE FROM users WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error deleting user ❌" });
            }
            res.json({ success: true, message: "User deleted successfully ✅" });
        }
    );
});

// ==========================
// GET ALL VENUES
// ==========================
router.get("/venues", verifyAdmin, (req, res) => {
    db.query(
        "SELECT * FROM venues ORDER BY id DESC",
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error fetching venues ❌" });
            }
            res.json(result);
        }
    );
});

// ==========================
// ADD NEW VENUE
// ==========================
router.post("/venues", verifyAdmin, (req, res) => {
    const { name, location, capacity, price, amenities, image } = req.body;
    db.query(
        "INSERT INTO venues (name, location, capacity, price, amenities, image) VALUES (?, ?, ?, ?, ?, ?)",
        [name, location, capacity, price, amenities, image || null],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error adding venue ❌" });
            }
            res.json({ success: true, message: "Venue added ✅", id: result.insertId });
        }
    );
});

// ==========================
// UPDATE VENUE
// ==========================
router.put("/venues/:id", verifyAdmin, (req, res) => {
    const { name, location, capacity, price, amenities, image } = req.body;
    db.query(
        "UPDATE venues SET name=?, location=?, capacity=?, price=?, amenities=?, image=? WHERE id=?",
        [name, location, capacity, price, amenities, image || null, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error updating venue ❌" });
            }
            res.json({ success: true, message: "Venue updated ✅" });
        }
    );
});

// ==========================
// DELETE VENUE
// ==========================
router.delete("/venues/:id", verifyAdmin, (req, res) => {
    db.query(
        "DELETE FROM venues WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error deleting venue ❌" });
            }
            res.json({ success: true, message: "Venue deleted ✅" });
        }
    );
});

// ==========================
// GET ALL VENDORS (users with vendor role)
// ==========================
router.get("/vendors", verifyAdmin, (req, res) => {
    db.query(
        "SELECT id, full_name, email, phone, role, status, created_at FROM users WHERE role = 'vendor' ORDER BY id DESC",
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error fetching vendors ❌" });
            }
            res.json(result);
        }
    );
});

// ==========================
// APPROVE VENDOR
// ==========================
router.put("/vendors/:id/approve", verifyAdmin, (req, res) => {
    db.query(
        "UPDATE users SET status = 'approved' WHERE id = ? AND role = 'vendor'",
        [req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error approving vendor ❌" });
            }
            res.json({ success: true, message: "Vendor approved ✅" });
        }
    );
});

// ==========================
// DELETE VENDOR
// ==========================
router.delete("/vendors/:id", verifyAdmin, (req, res) => {
    db.query(
        "DELETE FROM users WHERE id = ? AND role = 'vendor'",
        [req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error deleting vendor ❌" });
            }
            res.json({ success: true, message: "Vendor deleted ✅" });
        }
    );
});

// ==========================
// GET ALL BOOKINGS
// ==========================
router.get("/bookings", verifyAdmin, (req, res) => {
    db.query(
        `SELECT b.*, u.full_name as customer_name 
         FROM bookings b
         LEFT JOIN users u ON b.user_id = u.id
         ORDER BY b.booking_date DESC`,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error fetching bookings ❌" });
            }
            res.json(result);
        }
    );
});

// ==========================
// UPDATE BOOKING STATUS
// ==========================
router.put("/bookings/:id/status", verifyAdmin, (req, res) => {
    const { status } = req.body;
    db.query(
        "UPDATE bookings SET status = ? WHERE id = ?",
        [status, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error updating booking status ❌" });
            }
            res.json({ success: true, message: "Booking status updated ✅" });
        }
    );
});

// ==================== CONFIRM BOOKING (ADMIN) ====================
router.put("/bookings/:id/confirm", verifyAdmin, (req, res) => {
    db.query(
        "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error confirming booking ❌" });
            }
            res.json({ success: true, message: "Booking confirmed ✅" });
        }
    );
});

// ==================== DELETE BOOKING (ADMIN) ====================
router.delete("/bookings/:id", verifyAdmin, (req, res) => {
    db.query(
        "DELETE FROM bookings WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error deleting booking ❌" });
            }
            res.json({ success: true, message: "Booking deleted ✅" });
        }
    );
});

// ==================== GET ALL REVIEWS (ADMIN) ====================
router.get("/reviews", verifyAdmin, (req, res) => {
    db.query(
        `SELECT r.*, 
                u.full_name as user_name,
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

// ==================== UPDATE REVIEW STATUS ====================
router.put("/reviews/:id/status", verifyAdmin, (req, res) => {
    const { status } = req.body;
    db.query(
        "UPDATE reviews SET status = ? WHERE id = ?",
        [status, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Error updating status" });
            res.json({ success: true });
        }
    );
});

// ==================== DELETE REVIEW ====================
router.delete("/reviews/:id", verifyAdmin, (req, res) => {
    db.query(
        "DELETE FROM reviews WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Error deleting review" });
            res.json({ success: true });
        }
    );
});

// ==========================
// GET ADMIN STATS (DASHBOARD)
// ==========================
router.get("/stats", verifyAdmin, (req, res) => {
    const queries = {
        totalUsers: "SELECT COUNT(*) as count FROM users",
        totalVenues: "SELECT COUNT(*) as count FROM venues",
        totalVendors: "SELECT COUNT(*) as count FROM users WHERE role = 'vendor'",
        totalBookings: "SELECT COUNT(*) as count FROM bookings",
        totalRevenue: "SELECT COALESCE(SUM(amount), 0) as total FROM bookings WHERE status = 'confirmed'"
    };
    
    Promise.all([
        new Promise((resolve) => db.query(queries.totalUsers, (err, r) => resolve(r?.[0]?.count || 0))),
        new Promise((resolve) => db.query(queries.totalVenues, (err, r) => resolve(r?.[0]?.count || 0))),
        new Promise((resolve) => db.query(queries.totalVendors, (err, r) => resolve(r?.[0]?.count || 0))),
        new Promise((resolve) => db.query(queries.totalBookings, (err, r) => resolve(r?.[0]?.count || 0))),
        new Promise((resolve) => db.query(queries.totalRevenue, (err, r) => resolve(r?.[0]?.total || 0)))
    ]).then(([totalUsers, totalVenues, totalVendors, totalBookings, totalRevenue]) => {
        res.json({
            totalUsers,
            totalVenues,
            totalVendors,
            totalBookings,
            totalRevenue
        });
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: "Error fetching stats ❌" });
    });
});

module.exports = router;