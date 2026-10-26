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

يتطلب Docker Desktop أو Docker Engine مع Docker Compose. يتكوّن التشغيل من ثلاث خدمات:

- **frontend:** ملفات HTML/CSS/JavaScript ثابتة يقدمها Nginx غير مميز الصلاحيات على المنفذ `8080` داخل الحاوية.
- **backend:** خادم Express على Node.js، يستقبل الطلبات على المنفذ `3000` داخل شبكة Docker.
- **database:** MongoDB، وتُحفظ بياناتها في volume دائم. لا يُنشر منفذ قاعدة البيانات على جهازك.

تمرّر الواجهة طلبات `/habits` وفحص `/health` إلى الباك إند عبر شبكة Docker. ينتظر Compose جاهزية MongoDB قبل تشغيل الباك إند، ثم ينتظر جاهزية الباك إند قبل تشغيل الواجهة.

لشرح إعدادات Docker سطرًا بسطر، راجع [شرح Docker في المشروع](DOCKER_EXPLAINED_AR.md).

#### تشغيل الإنتاج محليًا

```bash
docker compose up --build
```

ثم افتح [http://localhost:8080](http://localhost:8080). صورة الباك إند الإنتاجية تثبّت حزم التشغيل من `backend/package-lock.json`، ولا تنسخ ملفات `.env` أو `node_modules` إلى الصورة، وتشغّل التطبيق بمستخدم `node` غير المميز.

#### تطوير مع مزامنة الملفات وإعادة تشغيل الباك إند

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

التعديلات على ملفات الباك إند تعيد تشغيله تلقائيًا عبر `node --watch`. ملفات الواجهة مربوطة للقراءة إلى حاوية Nginx؛ احفظ الملف ثم حدّث المتصفح لرؤية التغييرات. لا يستخدم المشروع bundler أو framework للواجهة يحتاج إلى HMR.

#### متغيرات البيئة والأسرار

لا تُضمّن ملفات البيئة في صور Docker. ملف `.dockerignore` الخاص بكل خدمة يستبعدها من سياق البناء، و`.gitignore` يستبعد ملف `.env` المحلي من Git. انسخ `.env.example` إلى `.env` لتغيير منفذ الواجهة أو عنوان MongoDB في Compose. لا تضع أسرارًا حقيقية في `.env.example` أو في ملفات Dockerfile.

#### الإيقاف وإعادة البناء والسجلات

إيقاف الحاويات مع الاحتفاظ ببيانات MongoDB:

```bash
docker compose down
```

حذف بيانات MongoDB أيضًا:

```bash
docker compose down --volumes
```

إعادة بناء الصور دون استخدام ذاكرة البناء ثم تشغيلها:

```bash
docker compose build --no-cache
docker compose up -d
```

عرض الحالة والسجلات:

```bash
docker compose ps
docker compose logs -f
docker compose logs -f backend
```

أوقف متابعة السجلات بـ `Ctrl+C`؛ هذا لا يوقف الحاويات. غيّر منفذ الواجهة عبر `FRONTEND_PORT` في ملف `.env` بجذر المشروع، مثل `FRONTEND_PORT=8081`.

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
