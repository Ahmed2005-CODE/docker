require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const habitRoutes = require("./routes/habits");

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("متغير MONGO_URI غير موجود في ملف .env");
}

// السماح للواجهة المحلية المنفصلة بالاتصال أثناء التطوير فقط.
app.use((req, res, next) => {
  const origin = req.get("origin");
  const isLocalFrontend =
    origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  if (isLocalFrontend) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(isLocalFrontend ? 204 : 403);
  }

  return next();
});

app.use(express.json());
app.use("/habits", habitRoutes);
app.use("/habits", (req, res) => {
  res.status(404).json({ error: "مسار API غير موجود" });
});
app.use(express.static(path.join(__dirname, "..", "frontend")));

// إرسال أخطاء JSON واضحة بدلًا من ترك Express يعرض صفحة خطأ افتراضية.
app.use((error, req, res, next) => {
  console.error("حدث خطأ في الخادم:", error);
  const status = error.status === 400 ? 400 : 500;
  const message = status === 400 ? "بيانات JSON المرسلة غير صالحة" : "حدث خطأ داخلي في الخادم";
  res.status(status).json({ error: message });
});

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("تم الاتصال بقاعدة بيانات MongoDB");
    app.listen(port, () => {
      console.log(`التطبيق يعمل على http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("تعذّر الاتصال بقاعدة بيانات MongoDB:", error.message);
    process.exit(1);
  });
