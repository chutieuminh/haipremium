# Hải Premium Frontend

Frontend React + Vite của dự án fullstack. Dữ liệu chính được lấy từ Node.js API; dữ liệu tĩnh trong `src/data` chỉ dùng làm fallback khi backend chưa chạy.

## Chạy riêng frontend

```bash
cp .env.example .env
npm install
npm run dev
```

Mặc định `VITE_API_URL=http://localhost:5050/api/v1`.

## Build

```bash
npm run build
npm run preview
```

Xem hướng dẫn đầy đủ tại `../README.md`.
