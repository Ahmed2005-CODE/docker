const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "اسم العادة مطلوب"],
    trim: true,
    maxlength: [80, "اسم العادة يجب ألا يتجاوز 80 حرفًا"],
  },
  checkins: {
    type: [String],
    default: [],
    validate: {
      validator: (dates) =>
        dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
      message: "يجب أن تكون تواريخ الإنجاز بصيغة YYYY-MM-DD",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Habit", habitSchema);
