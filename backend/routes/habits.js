const express = require("express");
const mongoose = require("mongoose");
const Habit = require("../models/Habit");

const router = express.Router();

// تاريخ اليوم بتوقيت UTC، موحّد بين الخادم والمتصفح.
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// يحسب السلسلة الحالية، ويُبقيها قائمة إذا كان آخر إنجاز بالأمس.
function calculateStreak(checkins) {
  const completedDays = new Set(checkins);
  let cursor = new Date(`${getToday()}T00:00:00.000Z`);
  const yesterday = new Date(cursor);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  if (!completedDays.has(cursor.toISOString().slice(0, 10))) {
    cursor = yesterday;
  }

  let streak = 0;
  while (completedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function isValidHabitId(id) {
  return mongoose.isValidObjectId(id);
}

// إنشاء عادة جديدة.
router.post("/", async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      return res.status(400).json({ error: "اكتب اسم العادة أولًا" });
    }
    if (name.length > 80) {
      return res.status(400).json({ error: "اسم العادة يجب ألا يتجاوز 80 حرفًا" });
    }

    const habit = await Habit.create({ name });
    return res.status(201).json({ ...habit.toObject(), streak: 0 });
  } catch (error) {
    return next(error);
  }
});

// عرض العادات مع السلسلة المحسوبة على الخادم.
router.get("/", async (req, res, next) => {
  try {
    const habits = await Habit.find().sort({ createdAt: -1 }).lean();
    return res.json(
      habits.map((habit) => ({
        ...habit,
        streak: calculateStreak(habit.checkins),
      })),
    );
  } catch (error) {
    return next(error);
  }
});

// تسجيل إنجاز اليوم مرة واحدة فقط لكل عادة.
router.post("/:id/check", async (req, res, next) => {
  try {
    if (!isValidHabitId(req.params.id)) {
      return res.status(400).json({ error: "معرّف العادة غير صالح" });
    }

    const today = getToday();
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, checkins: { $ne: today } },
      { $push: { checkins: today } },
      { new: true, runValidators: true },
    );
    if (!habit) {
      const exists = await Habit.exists({ _id: req.params.id });
      if (!exists) {
        return res.status(404).json({ error: "العادة غير موجودة" });
      }
      return res.status(409).json({ error: "تم تسجيل إنجاز هذه العادة اليوم بالفعل" });
    }

    return res.json({ ...habit.toObject(), streak: calculateStreak(habit.checkins) });
  } catch (error) {
    return next(error);
  }
});

// حذف عادة.
router.delete("/:id", async (req, res, next) => {
  try {
    if (!isValidHabitId(req.params.id)) {
      return res.status(400).json({ error: "معرّف العادة غير صالح" });
    }

    const habit = await Habit.findByIdAndDelete(req.params.id);
    if (!habit) {
      return res.status(404).json({ error: "العادة غير موجودة" });
    }

    return res.json({ message: "تم حذف العادة بنجاح" });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
