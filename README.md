# متتبّع العادات

تطبيق بسيط لتسجيل العادات اليومية ومتابعة الإنجازات والسلسلة المتتالية، باستخدام HTML وCSS وJavaScript وExpress وMongoDB مع Mongoose.

## هيكل المشروع

- `backend/`: خادم Express، المسارات، نموذج Mongoose، وإعدادات البيئة.
- `frontend/`: ملفات HTML وCSS وJavaScript العادية.

## المتطلبات

- Node.js 18 أو أحدث
- MongoDB محليًا أو رابط اتصال MongoDB Atlas

## التشغيل

### التشغيل باستخدام Docker

يتطلب Docker مع Docker Compose. من مجلد المشروع شغّل:

لشرح إعدادات Docker سطرًا بسطر وبأسلوب مبسط، راجع [شرح Docker في المشروع](DOCKER_EXPLAINED_AR.md).

```bash
docker compose up --build
```

ثم افتح [http://localhost:8080](http://localhost:8080). يتكوّن التشغيل من حاوية Nginx للواجهة، وحاوية Express للباك، وحاوية MongoDB. تُحفظ بيانات قاعدة البيانات في volume باسم `mongo-data`.

لإيقاف الحاويات مع الاحتفاظ بالبيانات:

```bash
docker compose down
```

لحذف البيانات المحفوظة أيضًا:

```bash
docker compose down --volumes
```

يمكن تغيير منفذ الواجهة بإنشاء ملف `.env` في جذر المشروع يحتوي مثلًا على `FRONTEND_PORT=8081`.

### التشغيل المحلي

1. انسخ `backend/.env.example` إلى `backend/.env`، ثم اضبط قيمة `MONGO_URI` على رابط قاعدة بياناتك. ملف البيئة الافتراضي يستخدم MongoDB المحلي.
2. انتقل إلى مجلد الباك وثبّت الحزم:

   ```bash
   cd backend
   npm install
   ```

3. شغّل MongoDB، ثم ابدأ التطبيق من داخل `backend`:

   ```bash
   npm start
   ```

   للتطوير مع إعادة تشغيل الخادم تلقائيًا:

   ```bash
   npm run dev
   ```

4. افتح [http://localhost:3000](http://localhost:3000). يقدّم الباك ملفات الواجهة من مجلد `frontend`.

يمكن أيضًا فتح `frontend/index.html` عبر إضافة مثل Live Server؛ ستتصل الواجهة تلقائيًا بالباك على المنفذ `3000`. يجب أن يكون الباك شغالًا، ويسمح أثناء التطوير باتصالات الواجهة المحلية.

## واجهة API

| الطريقة | المسار | الوظيفة |
| --- | --- | --- |
| `POST` | `/habits` | إنشاء عادة؛ جسم الطلب `{ "name": "أشرب مياه" }` |
| `GET` | `/habits` | عرض العادات مع قيمة `streak` المحسوبة |
| `PATCH` | `/habits/:id` | تعديل اسم عادة؛ جسم الطلب `{ "name": "أقرأ كتابًا" }` |
| `POST` | `/habits/:id/check` | تسجيل إنجاز اليوم؛ يعيد `409` عند التكرار |
| `DELETE` | `/habits/:id/check` | التراجع عن إنجاز اليوم |
| `DELETE` | `/habits/:id` | حذف عادة |
| `GET` | `/health` | التحقق من جاهزية الخادم واتصاله بقاعدة البيانات |

تُخزّن الإنجازات كتاريخ UTC بصيغة `YYYY-MM-DD`، ويُحسب الـ streak في الخادم. يبدأ الـ streak من اليوم، أو من الأمس إذا لم يُسجّل إنجاز اليوم بعد.
