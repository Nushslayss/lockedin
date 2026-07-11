import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const SECRET = "your-secret-key-123";

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = new User({ email, password });
    const savedUser = await user.save();
    const token = jwt.sign({ userId: savedUser._id }, SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && user.password === password) {
      const token = jwt.sign({ userId: user._id }, SECRET);
      res.json({ token });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;