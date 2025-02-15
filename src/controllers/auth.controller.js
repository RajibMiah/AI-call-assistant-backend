exports.login = async (req, res) => {
    try {
        res.status(200).json({ message: "Login route" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.register = async (req, res) => {
    try {
        res.status(200).json({ message: "Register route" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
