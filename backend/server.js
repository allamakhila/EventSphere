require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// ==========================
// MIDDLEWARE (MUST BE FIRST)
// ==========================
app.use(cors());
app.use(express.json());

// ==========================
// ROUTES
// ==========================
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const eventRoutes = require("./routes/eventRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const vendorRoutes = require("./routes/vendorRoutes"); 
const reviewRoutes = require("./routes/reviewRoutes"); // ADD THIS

// mount routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/vendor", vendorRoutes); 
app.use("/api/reviews", reviewRoutes); // ADD THIS

// ==========================
// TEST ROUTE
// ==========================
app.get("/test", (req, res) => {
    res.send("Backend working ✅");
});

// ==========================
// DB TEST ROUTE
// ==========================
app.get("/db-test", (req, res) => {
    const db = require("./config/db");

    db.query("SELECT 1", (err, result) => {
        if (err) {
            return res.json({ error: err });
        }
        res.json({ success: true, result });
    });
});

// ==========================
// HOME ROUTE
// ==========================
app.get("/", (req, res) => {
    res.json({ message: "Server running 🚀" });
});

// ==========================
// AUTHENTICATE TOKEN MIDDLEWARE
// ==========================
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ message: "Access denied. No token provided." });
    }

    const jwt = require("jsonwebtoken");

    jwt.verify(token, "secretkey", (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token." });
        }

        req.user = decoded;
        next();
    });
}

// ==========================
// MY EVENTS ROUTE
// ==========================
app.get("/api/events/my-events", authenticateToken, (req, res) => {
    const db = require("./config/db");

    db.query(
        "SELECT * FROM events WHERE user_id = ? ORDER BY event_date DESC",
        [req.user.id],
        (err, results) => {
            if (err) {
                if (err.code === "ER_NO_SUCH_TABLE") {
                    return res.json([]);
                }

                return res
                    .status(500)
                    .json({ message: "Error fetching events" });
            }

            res.json(results);
        }
    );
});

// ==========================
// START SERVER
// ==========================
const PORT = 5000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
    console.log("✅ Auth routes loaded");
    console.log("✅ Booking routes loaded");
    console.log("✅ Admin routes loaded");
    console.log("✅ Event routes loaded");
    console.log("✅ Payment routes loaded");
});