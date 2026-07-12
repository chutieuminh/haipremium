# Database Hải Premium

- `schema.sql`: cấu trúc MySQL tham khảo gồm 21 bảng, khóa ngoại và index.
- `inventory-template.csv`: mẫu dữ liệu để nhập kho từ trang quản trị/API.
- Cách khuyến nghị để tạo bảng là chạy `npm run db:migrate`, vì Sequelize sẽ đồng bộ model hiện tại với MySQL.
- Để tạo lại dữ liệu phát triển: `npm run db:reset` rồi `npm run db:seed`.

Không chạy `db:reset` trên môi trường production.
