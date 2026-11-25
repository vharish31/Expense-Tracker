const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function createToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });
}

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (String(password).length < 4) {
            return res.status(400).json({
                message: "Password must be at least 4 characters"
            });
        }

        const existing = await User.findByEmail(email.trim().toLowerCase());

        if (existing) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.createUser({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword
        });

        res.status(201).json({
            message: "Registered successfully",
            token: createToken(user.id),
            user
        });
    } catch (error) {
        console.error("Register error:", error.message);
        res.status(500).json({ message: "Error registering user" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findByEmail(email.trim().toLowerCase());

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({
            message: "Login successful",
            token: createToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Error logging in" });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        console.error("Profile error:", error.message);
        res.status(500).json({ message: "Error fetching profile" });
    }
};
