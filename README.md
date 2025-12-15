# GoodZWork - Hệ Thống Quản Lý Nhân Sự

Hệ thống ERP quản lý nhân sự toàn diện với chấm công khuôn mặt, quản lý dự án, nghỉ phép, lương, và nhiều tính năng khác.

![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248?style=flat-square&logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 📋 Mục Lục

- [Tính Năng](#-tính-năng)
- [Công Nghệ](#-công-nghệ)
- [Cài Đặt](#-cài-đặt)
- [Cấu Hình](#-cấu-hình)
- [Chạy Ứng Dụng](#-chạy-ứng-dụng)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [API Endpoints](#-api-endpoints)
- [Sample Data](#-sample-data-mongodb)

---

## ✨ Tính Năng

### 🔐 Xác Thực & Phân Quyền
- Đăng ký/đăng nhập với JWT
- 5 vai trò: Super Admin, HR Manager, Accountant, Leader, Employee
- Duyệt hồ sơ nhân viên mới

### 👤 Quản Lý Nhân Viên
- Hồ sơ cá nhân đầy đủ
- Quản lý photo, avatar
- Tìm kiếm và lọc

### ⏰ Chấm Công
- Check-in/out với nhận diện khuôn mặt
- Geofencing (kiểm tra vị trí)
- Báo cáo chuyên cần theo tháng

### 🏖️ Nghỉ Phép
- Đăng ký nghỉ phép online
- Quy trình duyệt đơn
- Thống kê ngày phép còn lại

### ⏱️ Quản Lý OT
- Đăng ký làm thêm giờ
- Duyệt OT cho manager
- Thống kê giờ OT

### 📊 KPI & Hiệu Suất
- Thiết lập mục tiêu
- Tự đánh giá và duyệt
- Weighted scoring

### 📝 Hợp Đồng
- Quản lý hợp đồng lao động
- Cảnh báo hết hạn 30 ngày
- Các loại: Thử việc, Có thời hạn, Vô thời hạn

### 📂 Kho Tài Liệu
- Upload/download files
- Phân loại theo danh mục
- Tìm kiếm nhanh

### 📅 Lịch Tổng Hợp
- Hiển thị nghỉ phép, công việc, sinh nhật
- React Big Calendar

### 💬 Chat Realtime
- Tin nhắn 1-1 và nhóm
- Socket.IO realtime
- Gửi file, hình ảnh

### 📁 Quản Lý Dự Án
- Kanban board
- Giao việc với deadline
- Cập nhật tiến độ

### 💰 Bảng Lương
- Tính lương tự động
- Phụ cấp, khấu trừ
- Export báo cáo

### 📈 Báo Cáo & Export
- Dashboard thống kê
- Export Excel (chấm công, nghỉ phép, OT)
- Biểu đồ trực quan

---

## 🛠 Công Nghệ

### Backend
| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|-------|
| FastAPI | 0.109.0 | Web framework |
| Motor | 3.3.2 | Async MongoDB driver |
| PyMongo | 4.6.1 | MongoDB driver |
| Python-Jose | 3.3.0 | JWT tokens |
| Socket.IO | 5.10.0 | Realtime communication |
| DeepFace | 0.0.89 | Face recognition |
| OpenCV | 4.9.0 | Image processing |
| OpenPyXL | - | Excel export |

### Frontend
| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|-------|
| React | 18.2.0 | UI library |
| Vite | 5.0.8 | Build tool |
| React Router | 6.30.2 | Routing |
| Axios | 1.13.2 | HTTP client |
| Socket.IO Client | 4.8.1 | Realtime |
| Lucide React | 0.561.0 | Icons |
| Recharts | 2.15.4 | Charts |
| TailwindCSS | 3.4.0 | Styling |
| React Big Calendar | 1.19.4 | Calendar view |

---

## 📦 Cài Đặt

### Yêu Cầu
- Python 3.10+
- Node.js 18+
- MongoDB 6.0+

### 1. Clone Repository
```bash
git clone https://github.com/your-username/GoodZWork.git
cd GoodZWork
```

### 2. Cài Đặt Backend
```bash
cd Backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
pip install openpyxl  # Cho export Excel
```

### 3. Cài Đặt Frontend
```bash
cd ../Frontend
npm install
```

---

## ⚙️ Cấu Hình

### Backend (.env)
Tạo file `Backend/.env`:
```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=goodzwork

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Geofencing (tọa độ công ty)
COMPANY_LATITUDE=10.7769
COMPANY_LONGITUDE=106.7009
GEOFENCE_RADIUS_METERS=100

# Face Recognition
FACE_MODEL=ArcFace
FACE_DETECTOR=retinaface
FACE_DISTANCE_THRESHOLD=0.4
```

### Frontend (.env)
Tạo file `Frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

---

## 🚀 Chạy Ứng Dụng

### 1. Khởi Động MongoDB
```bash
mongod
```

### 2. Import Sample Data (tùy chọn)
```bash
mongoimport --db goodzwork --collection users --file sample_data/users.json --jsonArray
mongoimport --db goodzwork --collection settings --file sample_data/settings.json --jsonArray
```

### 3. Chạy Backend
```bash
cd Backend
venv\Scripts\activate  # Windows
uvicorn app.main:app --reload --port 8000
```

### 4. Chạy Frontend
```bash
cd Frontend
npm run dev
```

### 5. Truy Cập
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📁 Cấu Trúc Dự Án

```
GoodZWork/
├── Backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # MongoDB connection
│   │   ├── socket_events.py     # Socket.IO events
│   │   ├── models/              # Pydantic models
│   │   │   └── user.py
│   │   └── routers/             # API routers
│   │       ├── auth.py          # Authentication
│   │       ├── users.py         # User management
│   │       ├── attendance.py    # Attendance
│   │       ├── leaves.py        # Leave management
│   │       ├── overtime.py      # OT management
│   │       ├── kpi.py           # KPI/Performance
│   │       ├── contracts.py     # Contracts
│   │       ├── documents.py     # Document center
│   │       ├── calendar.py      # Calendar events
│   │       ├── projects.py      # Projects
│   │       ├── payroll.py       # Payroll
│   │       ├── chat.py          # Messaging
│   │       ├── notifications.py # Notifications
│   │       ├── exports.py       # Excel exports
│   │       └── settings.py      # System settings
│   ├── face_data/               # Face recognition data
│   ├── uploads/                 # Uploaded files
│   └── requirements.txt
│
├── Frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app + routes
│   │   ├── api/index.js         # API client
│   │   ├── context/             # React contexts
│   │   │   └── AuthContext.jsx
│   │   ├── components/          # Shared components
│   │   │   ├── Sidebar.jsx
│   │   │   └── NotificationBell.jsx
│   │   └── pages/               # Page components (23 pages)
│   │       ├── DashboardPage.jsx
│   │       ├── AttendancePage.jsx
│   │       ├── LeavesPage.jsx
│   │       ├── OvertimePage.jsx
│   │       ├── KPIPage.jsx
│   │       ├── ContractsPage.jsx
│   │       ├── CalendarPage.jsx
│   │       ├── ProjectsPage.jsx
│   │       ├── ChatPage.jsx
│   │       ├── PayrollPage.jsx
│   │       ├── ReportsPage.jsx
│   │       └── ... (more)
│   ├── package.json
│   └── vite.config.js
│
└── sample_data/                 # MongoDB sample data
    ├── users.json
    └── settings.json
```

---

## 🔌 API Endpoints

| Module | Prefix | Methods |
|--------|--------|---------|
| Auth | `/api/auth` | login, register, me |
| Users | `/api/users` | CRUD, profile, avatar |
| Attendance | `/api/attendance` | checkin, checkout, report |
| Leaves | `/api/leaves` | CRUD, approve, stats |
| Overtime | `/api/overtime` | CRUD, approve, stats |
| KPI | `/api/kpi` | CRUD, submit, review |
| Contracts | `/api/contracts` | CRUD, expiring, terminate |
| Documents | `/api/documents` | upload, download, delete |
| Calendar | `/api/calendar` | events |
| Projects | `/api/projects` | CRUD, tasks, kanban |
| Payroll | `/api/payroll` | calculate, history |
| Chat | `/api/chat` | conversations, messages |
| Notifications | `/api/notifications` | list, mark read |
| Export | `/api/export` | attendance, leaves, OT |
| Settings | `/api/settings` | get, update |

Chi tiết: http://localhost:8000/docs

---

## 📊 Sample Data (MongoDB)

### Tạo thư mục sample_data
```bash
mkdir sample_data
```

### users.json
```json
[
  {
    "email": "admin@goodzwork.com",
    "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4LG3z7yK8gC1Q0Hy",
    "full_name": "Admin System",
    "role": "SUPER_ADMIN",
    "status": "ACTIVE",
    "department": "IT",
    "position": "System Administrator",
    "employee_id": "EMP001",
    "phone": "0901234567",
    "date_of_birth": "1990-01-15",
    "address": "123 Nguyen Hue, Q1, HCM",
    "annual_leave_days": 12,
    "remaining_leave_days": 12,
    "created_at": { "$date": "2024-01-01T00:00:00Z" }
  },
  {
    "email": "hr@goodzwork.com",
    "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4LG3z7yK8gC1Q0Hy",
    "full_name": "Nguyen HR Manager",
    "role": "HR_MANAGER",
    "status": "ACTIVE",
    "department": "Human Resources",
    "position": "HR Manager",
    "employee_id": "EMP002",
    "phone": "0902345678",
    "date_of_birth": "1988-05-20",
    "annual_leave_days": 12,
    "remaining_leave_days": 10,
    "created_at": { "$date": "2024-01-01T00:00:00Z" }
  },
  {
    "email": "leader@goodzwork.com",
    "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4LG3z7yK8gC1Q0Hy",
    "full_name": "Tran Team Leader",
    "role": "LEADER",
    "status": "ACTIVE",
    "department": "Development",
    "position": "Tech Lead",
    "employee_id": "EMP003",
    "phone": "0903456789",
    "date_of_birth": "1992-08-10",
    "annual_leave_days": 12,
    "remaining_leave_days": 8,
    "created_at": { "$date": "2024-01-01T00:00:00Z" }
  },
  {
    "email": "employee@goodzwork.com",
    "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4LG3z7yK8gC1Q0Hy",
    "full_name": "Le Van Employee",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "department": "Development",
    "position": "Software Developer",
    "employee_id": "EMP004",
    "phone": "0904567890",
    "date_of_birth": "1995-12-25",
    "annual_leave_days": 12,
    "remaining_leave_days": 12,
    "created_at": { "$date": "2024-01-01T00:00:00Z" }
  },
  {
    "email": "accountant@goodzwork.com",
    "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4LG3z7yK8gC1Q0Hy",
    "full_name": "Pham Ke Toan",
    "role": "ACCOUNTANT",
    "status": "ACTIVE",
    "department": "Finance",
    "position": "Accountant",
    "employee_id": "EMP005",
    "phone": "0905678901",
    "date_of_birth": "1991-03-14",
    "annual_leave_days": 12,
    "remaining_leave_days": 11,
    "created_at": { "$date": "2024-01-01T00:00:00Z" }
  }
]
```

> **Mật khẩu mặc định cho tất cả user:** `password123`

### settings.json
```json
[
  {
    "key": "company_info",
    "value": {
      "name": "GoodZ Company",
      "address": "123 Nguyen Hue, Quan 1, TP.HCM",
      "phone": "028 1234 5678",
      "email": "contact@goodzwork.com"
    }
  },
  {
    "key": "working_hours",
    "value": {
      "start_time": "08:00",
      "end_time": "17:30",
      "late_threshold_minutes": 15,
      "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    }
  },
  {
    "key": "leave_policy",
    "value": {
      "annual_leave_days": 12,
      "sick_leave_days": 30,
      "maternity_leave_days": 180,
      "paternity_leave_days": 5
    }
  },
  {
    "key": "payroll",
    "value": {
      "base_currency": "VND",
      "payment_date": 5,
      "social_insurance_rate": 0.08,
      "health_insurance_rate": 0.015,
      "unemployment_insurance_rate": 0.01,
      "personal_income_tax_threshold": 11000000
    }
  }
]
```

### Import Commands
```bash
# Từ thư mục GoodZWork
cd sample_data

# Import users
mongoimport --db goodzwork --collection users --file users.json --jsonArray

# Import settings
mongoimport --db goodzwork --collection settings --file settings.json --jsonArray
```

---

## 👥 Tài Khoản Mẫu

| Email | Password | Role |
|-------|----------|------|
| admin@goodzwork.com | password123 | Super Admin |
| hr@goodzwork.com | password123 | HR Manager |
| leader@goodzwork.com | password123 | Leader |
| employee@goodzwork.com | password123 | Employee |
| accountant@goodzwork.com | password123 | Accountant |

---

## 📝 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 🤝 Đóng Góp

1. Fork dự án
2. Tạo branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

**Made with ❤️ by GoodZ Team**
