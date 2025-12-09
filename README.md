# GoodZWork - HR Management System

Hệ thống quản lý nhân sự thông minh với AI nhận diện khuôn mặt, chấm công GPS, chat thời gian thực và quản lý dự án.

## 🚀 Tính năng

### AI Face Recognition
- **DeepFace + ArcFace** - Độ chính xác 99.53%
- **RetinaFace Detector** - Phát hiện khuôn mặt nhạy
- Đăng ký 150 ảnh với 5 góc nhìn
- Kiểm tra độ mờ (Laplacian variance)

### Chấm công thông minh
- **GPS Geofencing** - Kiểm tra vị trí trong bán kính 50m
- Nhận diện khuôn mặt khi check-in/out
- Tự động đánh dấu đi muộn, về sớm, vắng mặt

### Chat thời gian thực
- Socket.IO cho tin nhắn instant
- Chat 1-1 và chat nhóm
- Trạng thái tin nhắn: Sending → Sent → Delivered → Seen
- Typing indicator, thu hồi tin nhắn

### Quản lý dự án & công việc
- CRUD dự án, phân công task
- Accept/Reject task với lý do
- Cập nhật tiến độ, thống kê hiệu suất

### Tính lương tự động
- Tính toán dựa trên chấm công
- Khấu trừ muộn/sớm/vắng
- Quy trình duyệt: DRAFT → APPROVED → PAID
- Tạo QR code thanh toán

---

## 📁 Cấu trúc dự án

```
GoodZWork/
├── Backend/
│   ├── app/
│   │   ├── models/          # Pydantic models
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── main.py          # FastAPI entry
│   │   ├── config.py        # Environment settings
│   │   ├── database.py      # MongoDB connection
│   │   └── socket_events.py # Socket.IO handlers
│   ├── face_data/           # Face encodings
│   ├── uploads/             # Uploaded files
│   ├── requirements.txt
│   └── .env
│
└── Frontend/
    ├── src/
    │   ├── api/             # Axios API client
    │   ├── components/      # Reusable components
    │   ├── context/         # Auth, Socket providers
    │   ├── pages/           # Route pages
    │   └── styles/          # Tailwind CSS
    ├── package.json
    └── vite.config.js
```

---

## 🛠️ Cài đặt

### Yêu cầu
- Python 3.10+
- Node.js 18+
- MongoDB 6+

### Backend

```bash
cd Backend

# Tạo virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Cài đặt dependencies
pip install -r requirements.txt

# Cấu hình .env
# Sửa MONGODB_URL, JWT_SECRET_KEY, tọa độ công ty

# Chạy server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd Frontend

# Cài đặt dependencies
npm install

# Chạy dev server
npm run dev
```

---

## 🔐 Roles & Permissions

| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Full access |
| HR_MANAGER | Quản lý NV, duyệt hồ sơ, duyệt lương |
| ACCOUNTANT | Thanh toán lương |
| LEADER | Quản lý dự án, giao việc |
| EMPLOYEE | Chấm công, chat, xem công việc |

---

## 👤 Tài khoản mẫu

Import file `Backend/seed_users.json` vào MongoDB collection `users`:

```bash
mongoimport --db goodzwork --collection users --file Backend/seed_users.json --jsonArray
```

| Role | Email | Password |
|------|-------|----------|
| **SUPER_ADMIN** | admin@goodzwork.com | 123456 |
| **HR_MANAGER** | hr@goodzwork.com | 123456 |
| **ACCOUNTANT** | accountant@goodzwork.com | 123456 |
| **LEADER** | leader@goodzwork.com | 123456 |
| **EMPLOYEE** | employee@goodzwork.com | 123456 |

---

## 📱 Luồng người dùng

```
1. HR tạo tài khoản → Status: INIT
2. NV đăng nhập → Cập nhật hồ sơ
3. NV đăng ký khuôn mặt (150 ảnh)
4. Status: PENDING → Chờ HR duyệt
5. HR duyệt → Status: ACTIVE
6. NV có thể chấm công, chat, làm việc
```

---

## 🧪 API Endpoints

| Module | Prefix | Description |
|--------|--------|-------------|
| Auth | `/api/auth` | Login, register, me |
| Users | `/api/users` | Profile, face enrollment |
| Attendance | `/api/attendance` | Check-in/out, logs |
| Chat | `/api/chat` | Conversations, messages |
| Projects | `/api/projects` | CRUD, tasks |
| Payroll | `/api/payroll` | Calculate, approve, pay |

API Docs: http://localhost:8000/docs

---

## 🔧 Environment Variables

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=goodzwork

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Geofencing
COMPANY_LATITUDE=10.762622
COMPANY_LONGITUDE=106.660172
GEOFENCE_RADIUS_METERS=50

# AI Face Recognition
FACE_MODEL=ArcFace
FACE_DETECTOR=retinaface
FACE_DISTANCE_THRESHOLD=0.4
```

---

## 📄 License

MIT License - GoodZWork Team 2024
