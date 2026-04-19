# 🍜 Ứng Dụng Thực Đơn Tuần Thông Minh

Ứng dụng quản lý thực đơn tuần dành cho gia đình Việt Nam, tích hợp AI Gemini để gợi ý món ăn tiết kiệm nhưng đầy đủ dinh dưỡng.

## ✨ Tính Năng Chính

### 🤖 AI Gemini Integration
- **Gợi ý thực đơn tuần**: AI tạo thực đơn 7 ngày với 3 bữa ăn/ngày
- **Tối ưu ngân sách**: Đảm bảo tiết kiệm nhưng vẫn đầy đủ dinh dưỡng
- **Tùy chỉnh sở thích**: Điều chỉnh theo khẩu vị và hạn chế ăn uống
- **Phân tích dinh dưỡng**: Đánh giá cân bằng dinh dưỡng toàn diện

### 🍽️ Quản Lý Món Ăn
- **Công thức chi tiết**: Hướng dẫn nấu ăn từng bước từ chuyên gia
- **Tạo hình ảnh**: Mô tả và gợi ý trình bày món ăn
- **Điều chỉnh khẩu phần**: Thay đổi số lượng người ăn tự động
- **Thay thế nguyên liệu**: Gợi ý thay thế khi không có nguyên liệu

### 💝 Lưu Trữ & Lịch Sử
- **Món ăn yêu thích**: Lưu các món ăn ưa thích
- **Lịch sử thực đơn**: Xem lại các thực đơn đã tạo
- **Danh sách mua sắm**: Tự động tạo danh sách nguyên liệu cần mua

### 🎨 Giao Diện Hiện Đại
- **Light/Dark Mode**: Chuyển đổi chế độ sáng/tối
- **Responsive Design**: Tương thích mọi thiết bị (PC, tablet, mobile)
- **Hiệu ứng mượt mà**: Animation và transition chuyên nghiệp
- **Tiếng Việt**: Giao diện và nội dung 100% tiếng Việt

## 🚀 Cài Đặt

### Yêu Cầu Hệ Thống
- Node.js 16.x trở lên
- NPM hoặc Yarn
- Google Gemini API Key

### Bước 1: Clone Repository
```bash
git clone <repository-url>
cd weekly-menu-app
```

### Bước 2: Cài Đặt Dependencies
```bash
npm install
```

### Bước 3: Cấu Hình API Key

1. Lấy API key từ Google AI Studio: https://makersuite.google.com/app/apikey
2. Mở file `.env` và thay thế:
```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3000
NODE_ENV=development
```

### Bước 4: Chạy Ứng Dụng

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### Bước 5: Truy Cập Ứng Dụng
Mở trình duyệt và truy cập: `http://localhost:3000`

## 📖 Hướng Dẫn Sử Dụng

### 1️⃣ Tạo Thực Đơn Tuần
1. Nhập số người trong gia đình
2. Chọn mức ngân sách (tiết kiệm/trung bình/thoải mái)
3. Ghi sở thích món ăn (tùy chọn)
4. Ghi hạn chế ăn uống nếu có (tùy chọn)
5. Nhấn **"Tạo Thực Đơn Tuần"**

### 2️⃣ Xem Chi Tiết Món Ăn
- Nhấn vào món ăn để xem thông tin chi tiết
- Nhấn 📖 để xem công thức nấu ăn đầy đủ
- Nhấn 🖼️ để tạo hình ảnh món ăn
- Nhấn ❤️ để lưu vào danh sách yêu thích
- Nhấn ⚖️ để điều chỉnh khẩu phần

### 3️⃣ Phân Tích Dinh Dưỡng
- Nhấn **"📊 Phân tích dinh dưỡng"** ở đầu thực đơn
- Xem đánh giá cân bằng dinh dưỡng
- Nhận khuyến nghị cải thiện

### 4️⃣ Danh Sách Mua Sắm
- Nhấn **"🛒 Danh sách mua sắm"**
- Xem danh sách nguyên liệu cần mua cho cả tuần
- Tick chọn khi đã mua
- In danh sách nếu cần

### 5️⃣ Quản Lý Yêu Thích & Lịch Sử
- Chuyển sang tab **"❤️ Yêu thích"** để xem món đã lưu
- Chuyển sang tab **"📜 Lịch sử"** để xem thực đơn cũ
- Nhấn vào lịch sử để tải lại thực đơn

## 🏗️ Cấu Trúc Dự Án

```
weekly-menu-app/
├── server.js              # Node.js server với Express
├── package.json           # Dependencies
├── .env                   # Cấu hình (API keys)
├── public/
│   ├── index.html        # Giao diện chính
│   ├── styles.css        # CSS styling (Light/Dark mode)
│   └── app.js            # JavaScript frontend logic
└── data/
    ├── favorites.json    # Lưu món yêu thích
    └── menu_history.json # Lưu lịch sử thực đơn
```

## 🔧 API Endpoints

### POST /api/generate-weekly-menu
Tạo thực đơn tuần mới
```json
{
  "familySize": 4,
  "budget": "tiết kiệm",
  "preferences": "Món miền Nam",
  "dietaryRestrictions": "Không ăn hải sản"
}
```

### POST /api/generate-recipe
Tạo công thức nấu ăn chi tiết
```json
{
  "dishName": "Cá kho tộ",
  "servings": 4
}
```

### POST /api/generate-dish-image
Tạo mô tả hình ảnh món ăn
```json
{
  "dishName": "Phở bò",
  "description": "Món phở truyền thống",
  "ingredients": ["Bánh phở", "Thịt bò"]
}
```

### POST /api/favorites
Lưu món ăn yêu thích

### GET /api/favorites
Lấy danh sách yêu thích

### DELETE /api/favorites/:id
Xóa món yêu thích

### POST /api/adjust-servings
Điều chỉnh khẩu phần món ăn

### POST /api/nutrition-analysis
Phân tích dinh dưỡng thực đơn

### GET /api/menu-history
Lấy lịch sử thực đơn

## 🎨 Tùy Chỉnh

### Thay Đổi Theme Colors
Chỉnh sửa CSS variables trong `public/styles.css`:
```css
:root {
    --accent-primary: #3b82f6;  /* Màu chủ đạo */
    --accent-secondary: #8b5cf6; /* Màu phụ */
    /* ... */
}
```

### Thêm Tính Năng Mới
1. Thêm endpoint mới trong `server.js`
2. Tạo UI trong `index.html`
3. Thêm logic trong `app.js`

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi: "Cannot connect to API"
- Kiểm tra API key trong file `.env`
- Đảm bảo đã lấy API key từ Google AI Studio
- Kiểm tra kết nối internet

### Lỗi: "Port already in use"
- Thay đổi PORT trong file `.env`
- Hoặc kill process đang dùng port 3000

### Lỗi: "Module not found"
- Chạy lại `npm install`
- Xóa thư mục `node_modules` và chạy lại

## 📱 Responsive Breakpoints

- **Desktop**: > 768px
- **Tablet**: 481px - 768px
- **Mobile**: < 480px

## 🔒 Bảo Mật

- API key không được commit vào Git
- File `.env` đã được thêm vào `.gitignore`
- Validation input từ người dùng
- Rate limiting cho API calls (khuyến nghị production)

## 📊 Performance

- Lazy loading images
- Debounce API calls
- Caching responses (có thể thêm Redis)
- Minify CSS/JS cho production

## 🤝 Đóng Góp

Mọi đóng góp đều được chào đón! Hãy:
1. Fork repository
2. Tạo branch mới (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa

## 👨‍💻 Tác Giả

**Phan Tấn Tài**
- Chức vụ: Bí thư Chi bộ 25 - Phường Long Trường
- Chuyên môn: Google Apps Script, AI Integration, Full-stack Development

## 🙏 Cảm Ơn

- Google Gemini AI
- Cộng đồng ẩm thực Việt Nam
- Người dùng ứng dụng

## 📞 Liên Hệ & Hỗ Trợ

Nếu gặp vấn đề hoặc có câu hỏi, vui lòng:
- Tạo Issue trên GitHub
- Liên hệ trực tiếp qua email

---

**Phát triển với ❤️ cho cộng đồng Việt Nam**