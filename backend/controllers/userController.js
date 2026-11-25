exports.getUserProfile = (req, res) => {
    res.json({
        success: true,
        user: {
            name: "Harish",
            email: "harish@example.com",
            role: "User"
        }
    });
};