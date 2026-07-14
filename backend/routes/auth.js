import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const SECRET = process.env.JWT_SECRET;
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
    const SECRET = process.env.JWT_SECRET;
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
