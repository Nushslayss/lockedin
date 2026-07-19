import mongoose from "mongoose";

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    dueDate: { type: Date, default: null },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    completed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "done", "failed", "deleted"],
      default: "pending",
    },
    deletedAt: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    subtasks: [subtaskSchema],
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);
export default Task;