# Hai Premium - Fullstack React, Node.js va MySQL

Website ban san pham ky thuat so gom frontend React/Vite, backend Express va database MySQL. Du an nay chay voi MySQL cai tren may, co the quan ly/import bang MySQL Workbench.

## Cong nghe

- Frontend: React 18, Vite, React Router, Context API, Fetch API, Lucide Icons.
- Backend: Node.js, Express, Sequelize ORM, MySQL.
- Bao mat: bcrypt, JWT access token, refresh token HttpOnly cookie, Helmet, CORS whitelist, rate limit, AES-256-GCM cho du lieu kho.

## Yeu cau

- Node.js 20 tro len.
- npm 10 tro len.
- MySQL dang chay tren may.
- MySQL Workbench neu muon import/quan ly database bang giao dien.

## Cai dat

```bash
npm install
npm run install-all
```

Tao file moi truong neu chua co:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Cap nhat `backend/.env` theo MySQL tren may:

```env
NODE_ENV=development
PORT=5050
FRONTEND_URL=http://localhost:5174

DB_HOST=localhost
DB_PORT=3306
DB_NAME=haipremium
DB_USER=root
DB_PASSWORD=mat_khau_mysql_cua_ban
DB_LOGGING=false
```

## Tao database bang MySQL Workbench

Neu ban da co `schema.sql`:

1. Mo MySQL Workbench va ket noi vao MySQL local.
2. Tao database `haipremium` voi charset `utf8mb4` va collation `utf8mb4_unicode_ci`.
3. Mo file `schema.sql`.
4. Chon database `haipremium`.
5. Chay toan bo file SQL.
6. Kiem tra cac bang da duoc tao.

Du an hien khong kem lenh tao/reset/seed database tu Node.js. Database can co san dung cau truc bang truoc khi chay backend.

## Chay du an

```bash
npm run dev
```

- Website: `http://localhost:5174`
- API: `http://localhost:5050/api/v1`
- Health check: `http://localhost:5050/api/v1/health`
- Admin: `http://localhost:5174/admin`

## Lenh quan trong

```bash
npm run dev          # chay backend va frontend cung luc
npm run build        # build frontend production
npm run start        # chay backend production
npm run verify       # build frontend de kiem tra loi build
```

## Ghi chu

- Khong commit `.env`, database dump, bien lai hoac du lieu inventory that.
- Khong doi `INVENTORY_ENCRYPTION_KEY` sau khi da co du lieu inventory that, vi du lieu cu se khong giai ma duoc.
- Neu dung MySQL Workbench va `schema.sql`, hay backup database truoc khi import lai.
