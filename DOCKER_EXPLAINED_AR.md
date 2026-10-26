# شرح Docker في المشروع بطريقة بسيطة

تخيّل أن المشروع لعبة تحتاج ثلاثة أشياء لتعمل:

1. **الواجهة الأمامية (Frontend):** الشاشة والأزرار التي يستخدمها الشخص.
2. **الخادم (Backend):** المساعد الذي يستقبل الطلبات ويعالجها.
3. **قاعدة البيانات (Database):** الدفتر الذي يحفظ العادات والإنجازات.

Docker يضع كل جزء في **حاوية** خاصة به. الحاوية مثل صندوق مجهّز بكل ما يحتاجه الجزء ليعمل، وتستطيع الصناديق التواصل مع بعضها عبر شبكة Docker.

## خريطة الملفات

```text
المشروع/
├── compose.yaml              # يصف الحاويات الثلاث وكيف تعمل معًا
├── compose.dev.yaml          # إعداد التطوير مع ربط ملفات المشروع
├── .env.example              # مثال لمتغيرات Compose غير السرية
├── DOCKER_EXPLAINED_AR.md    # هذا الشرح
├── frontend/
│   ├── Dockerfile            # طريقة تجهيز حاوية الواجهة
│   └── nginx.conf            # كيف يقدّم Nginx الملفات ويمرر طلبات API
└── backend/
    ├── Dockerfile            # طريقة تجهيز حاوية الخادم
    └── .dockerignore         # ملفات لا نحتاج لنسخها إلى الحاوية
```

## لماذا الإعدادات في ملفات منفصلة؟

- **`compose.yaml`** هو مدير الفريق: يعرف أن هناك واجهة وخادمًا وقاعدة بيانات، ويربطها ويشغّلها معًا.
- **`frontend/Dockerfile`** يخص الواجهة فقط، و**`backend/Dockerfile`** يخص الخادم فقط. لكل واحد أدوات وخطوات تجهيز مختلفة، لذلك من الأسهل أن يكون لكل واحد وصفه الخاص.
- **`frontend/nginx.conf`** يحتوي إعدادات Nginx، مثل عنوان الخادم الذي يمرر إليه طلبات العادات. وضع إعدادات Nginx هنا يبقيها واضحة بدل خلطها مع إعدادات بناء الصورة.
- **`backend/.dockerignore`** يخبر Docker ما الذي لا ينسخه من مجلد الخادم. مثلًا لا ننسخ `node_modules` من جهازنا، لأن Docker يثبّت الحزم المناسبة داخل الحاوية بنفسه.
- **`DOCKER_EXPLAINED_AR.md`** ملف للشرح والقراءة فقط؛ Docker لا يحتاجه لتشغيل التطبيق.

هذا الفصل يجعل تعديل كل جزء أسهل: إذا تغيّر إعداد Nginx نراجع ملفه، وإذا تغيّرت حزم الخادم نراجع Dockerfile الخاص به، وإذا أردنا تغيير طريقة تشغيل المجموعة نراجع Compose.

## 1. ملف `compose.yaml`: مدير الحاويات

```yaml
services:
```

هنا نبدأ قائمة الخدمات (الحاويات) التي ستعمل معًا.

### حاوية الواجهة

```yaml
  frontend:
    build:
      context: ./frontend
```

- اسم الخدمة هو `frontend`.
- `context: ./frontend` يعني: استخدم مجلد `frontend` لإعداد وبناء صورة الواجهة. الصورة مثل وصفة جاهزة نصنع منها حاوية.

```yaml
    ports:
      - "${FRONTEND_PORT:-8080}:8080"
```

هذا يفتح بابًا من جهازك إلى الحاوية. الرقم على اليسار هو منفذ جهازك، والرقم `8080` على اليمين هو منفذ Nginx غير المميز الصلاحيات داخل الحاوية. لذلك تفتح الموقع على `http://localhost:8080`.

`FRONTEND_PORT` اختياري. إذا لم تضعه، يستخدم Docker الرقم `8080`. لتغييره، أنشئ ملف `.env` في جذر المشروع واكتب مثلًا `FRONTEND_PORT=8081`، ثم افتح `http://localhost:8081`.

```yaml
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
```

- `depends_on` يجعل Compose ينتظر إلى أن ينجح فحص صحة الخادم قبل تشغيل الواجهة.
- `restart: unless-stopped` يعيد تشغيل الحاوية إذا توقفت بسبب مشكلة، إلا إذا أوقفتها أنت.

### حاوية الخادم

```yaml
  backend:
    build:
      context: ./backend
```

هذه خدمة الخادم، وتُبنى باستخدام الملفات الموجودة في مجلد `backend`.

```yaml
    environment:
      PORT: 3000
      MONGO_URI: ${MONGO_URI:-mongodb://database:27017/habit-tracker}
```

هذه إعدادات تصل إلى الخادم. يمكن وضع `MONGO_URI` في ملف `.env` بجذر المشروع لتغييره محليًا؛ القيمة بعد `:-` هي الافتراضية عندما لا تحدد قيمة.

- `PORT` هو المنفذ الذي يستقبل عليه الخادم الطلبات داخل شبكة Docker.
- `MONGO_URI` هو عنوان قاعدة البيانات. اسم `database` هو اسم خدمة MongoDB في Compose؛ Docker يعرف كيف يجدها من داخل الشبكة. `27017` هو منفذ MongoDB، و`habit-tracker` اسم قاعدة البيانات.

```yaml
    depends_on:
      database:
        condition: service_healthy
```

الخادم يحتاج قاعدة البيانات. هذا الإعداد يجعله ينتظر إلى أن تصبح قاعدة البيانات جاهزة للاتصال، بدل أن يبدأ قبلها مباشرة.

```yaml
    expose:
      - "3000"
```

يُظهر منفذ الخادم للخدمات الأخرى داخل شبكة Docker، مثل Nginx. لا يفتح هذا المنفذ مباشرة للناس على جهازك.

```yaml
    restart: unless-stopped
```

يعيد تشغيل الخادم تلقائيًا إذا توقف بشكل غير متوقع.

### حاوية قاعدة البيانات

```yaml
  database:
    image: mongo:8
```

نشغّل MongoDB باستخدام صورة جاهزة اسمها `mongo` وإصدارها الرئيسي `8`. لا نحتاج إلى كتابة Dockerfile لقاعدة البيانات لأن الصورة الرسمية تجهزها لنا.

```yaml
    volumes:
      - mongo-data:/data/db
```

الـ **volume** مثل دفتر دائم خارج الحاوية. MongoDB تكتب بياناتها داخل `/data/db`، وDocker يحفظها في `mongo-data`. لو حذفنا الحاوية ثم شغلناها من جديد، تبقى البيانات موجودة.

```yaml
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 5s
      timeout: 3s
      retries: 10
```

هذا فحص يسأل MongoDB: «هل أنت جاهزة؟» كل خمس ثوانٍ. إذا لم ترد خلال ثلاث ثوانٍ، يعيد الفحص، وحتى عشر محاولات. يستخدم Compose نتيجة الفحص ليعرف متى تصبح قاعدة البيانات جاهزة.

```yaml
    restart: unless-stopped
```

يعيد تشغيل قاعدة البيانات إذا توقفت بسبب مشكلة.

```yaml
volumes:
  mongo-data:
```

هنا نطلب من Docker إنشاء مكان التخزين الدائم المسمى `mongo-data`.

## 2. ملف `backend/Dockerfile`: تجهيز الخادم للإنتاج والتطوير

```dockerfile
FROM node:22-alpine AS development
```

ابدأ مرحلة التطوير من صورة جاهزة فيها Node.js إصدار 22 ونظام Alpine صغير الحجم. المرحلة اسمها `development` كي يختارها إعداد Compose الخاص بالتطوير.

```dockerfile
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

يثبّت `npm ci` الحزم حسب `package-lock.json`. ثم يشغّل `npm run dev` الذي يستخدم `node --watch` لإعادة تشغيل الخادم عند حفظ تعديل على ملفاته. يعمل التطبيق بمستخدم `node` بدل المستخدم الإداري.

```dockerfile
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["npm", "start"]
```

هذه مرحلة الإنتاج. تثبّت حزم التشغيل فقط من ملف القفل، وتنسخ الملفات بملكية المستخدم `node`، ثم تشغّل `npm start`. يستخدم Compose هذه المرحلة افتراضيًا.

## 3. ملف `backend/.dockerignore`: أشياء لا نضعها في الصندوق

```text
node_modules
.env*
npm-debug.log*
.git
coverage
```

- `node_modules`: لا ننسخ الحزم المثبتة على جهازك؛ Docker يثبتها داخل الصورة.
- `.env*`: لا ننسخ إعداداتك المحلية أو أسرارك إلى الصورة. Compose يقرأ ملف `.env` منفصلًا لتمرير قيم التشغيل.
- `npm-debug.log*`: ملفات أخطاء مؤقتة لا يحتاجها التطبيق.
- `.git` و`coverage`: ملفات Git والتغطية ليست مطلوبة لتشغيل الخادم.

## 4. ملف `frontend/Dockerfile`: تجهيز الواجهة

```dockerfile
FROM nginxinc/nginx-unprivileged:1.27-alpine
```

ابدأ بصورة جاهزة فيها Nginx. Nginx هنا مثل موظف استقبال يرسل ملفات الموقع إلى المتصفح.

```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

ضع إعداداتنا في المكان الذي يقرأ منه Nginx إعداداته.

```dockerfile
COPY . /usr/share/nginx/html
```

انسخ ملفات الواجهة، مثل HTML وCSS وJavaScript، إلى المجلد الذي يقدّم منه Nginx صفحات الموقع.

```dockerfile
EXPOSE 8080
```

استخدم صورة Nginx تعمل بمستخدم غير مميز، وتوضح أن Nginx يستقبل الطلبات على المنفذ `8080` داخل الحاوية.

## 5. ملف `frontend/nginx.conf`: موظف الاستقبال

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
```

ابدأ إعداد موقع ويب يستمع على المنفذ `8080`، ويقدّم ملفات الواجهة من `/usr/share/nginx/html`. عندما يطلب المتصفح الصفحة الرئيسية، استخدم `index.html`.

```nginx
    location /habits {
        proxy_pass http://backend:3000/habits;
```

إذا وصل طلب يبدأ بـ `/habits`، أرسله إلى خدمة `backend` على المنفذ `3000`. مثلًا طلب عرض العادات يذهب إلى الخادم، والخادم يتولى التحدث مع قاعدة البيانات. يشمل ذلك إنشاء العادة وتعديلها وحذفها وتسجيل إنجاز اليوم والتراجع عنه.

```nginx
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

هذه الإعدادات تمرر معلومات الاتصال مع الطلب، مثل اسم المضيف وعنوان المتصفح والبروتوكول.

```nginx
    location / {
        try_files $uri $uri/ =404;
    }
}
```

لباقي الطلبات، ابحث عن الملف المطلوب في ملفات الموقع. إذا لم تجده، أرسل رد «غير موجود» (`404`).

## كيف تتواصل الأجزاء؟

```text
المتصفح
   │ يفتح localhost:8080
   ▼
Nginx (الواجهة)
   │ يعرض HTML/CSS/JavaScript
   │ ويمرر /habits إلى backend:3000
   ▼
Express (الخادم)
   │ يتصل بعنوان mongodb://database:27017/...
   ▼
MongoDB (قاعدة البيانات)
   │ تحفظ المعلومات في volume اسمه mongo-data
```

اسم `localhost` يعني جهازك أنت. أما `backend` و`database` فهما اسما الخدمتين داخل شبكة Docker، وتستخدمهما الحاويات للتواصل فيما بينها.

## تشغيل المشروع

افتح الطرفية في مجلد المشروع وشغّل:

```bash
docker compose up --build
```

- `docker compose` يستخدم وصف الخدمات الموجود في `compose.yaml`.
- `up` ينشئ الحاويات ويشغّلها.
- `--build` يعيد بناء صور الواجهة والخادم من ملفات Dockerfile قبل التشغيل.

بعد ظهور أن الخدمات بدأت، افتح [http://localhost:8080](http://localhost:8080).

لتشغيل وضع التطوير مع إعادة تشغيل الباك إند عند تعديل ملفاته ومزامنة ملفات الواجهة، استخدم:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

Compose يدمج ملفي الإعداد. ملفات الواجهة ثابتة ولا تستخدم أداة بناء أو HMR، لذلك احفظ التغيير وحدّث الصفحة في المتصفح.

## إيقاف المشروع وحفظ البيانات

```bash
docker compose down
```

يوقف الحاويات ويزيلها، لكنه يترك volume قاعدة البيانات، لذلك تبقى العادات محفوظة عند التشغيل مرة أخرى.

```bash
docker compose down --volumes
```

هذا يوقف الحاويات ويحذف الـ volume أيضًا. استخدمه فقط إذا كنت تريد حذف بيانات قاعدة البيانات والبدء من الصفر.

## أوامر مفيدة

```bash
docker compose ps
```

يعرض حالة الحاويات.

```bash
docker compose logs -f
```

يعرض رسائل الحاويات مباشرة لمساعدتك على معرفة ما يحدث. أوقف متابعة الرسائل باستخدام `Ctrl+C`؛ هذا لا يوقف الحاويات نفسها.

```bash
docker compose restart
```

يعيد تشغيل الخدمات.

## أسئلة بسيطة

**هل الصور والحاويات شيء واحد؟**

لا. الصورة مثل وصفة أو قالب جاهز. الحاوية هي نسخة تعمل فعلًا من تلك الصورة.

**لماذا لا أفتح الباك على منفذ من جهازي؟**

الواجهة تمرر طلبات `/habits` إلى الباك عبر شبكة Docker، لذلك يكفي أن يكون منفذ الباك متاحًا للحاويات. الواجهة هي التي تستقبل اتصال المتصفح على `8080`.

**هل حذف الحاويات يمسح العادات؟**

`docker compose down` وحده لا يمسحها؛ لأنها محفوظة في `mongo-data`. أما `docker compose down --volumes` فيحذف هذا التخزين.
