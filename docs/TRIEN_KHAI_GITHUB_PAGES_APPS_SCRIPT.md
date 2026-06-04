# Triển khai PM-KTCPTLMT: GitHub Pages + Google Sheets backend

## Kiến trúc

```text
GitHub Pages = frontend React/Vite
Google Apps Script = backend API
Google Sheets = database JSON tập trung
Google Drive = nơi lưu file chứng từ nếu bổ sung upload sau
```

## 1. Bật GitHub Pages

Vào repo `DVBCLUB/PM-KTCPTLMT` → `Settings` → `Pages`.

Chọn:

```text
Source: GitHub Actions
```

Sau đó vào tab `Actions`, chạy workflow `Deploy to GitHub Pages` hoặc push code lên nhánh `main`.

Link dự kiến:

```text
https://dvbclub.github.io/PM-KTCPTLMT/
```

## 2. Tạo Google Sheet database

Tạo một Google Sheet mới, ví dụ:

```text
DATABASE_PM_KTCPTLMT
```

Mở Google Sheet → `Extensions` → `Apps Script`.

Copy toàn bộ nội dung file:

```text
apps-script/Code.gs
```

vào Apps Script.

## 3. Đổi token riêng

Trong Apps Script, đổi dòng:

```js
const SECRET_TOKEN = 'DOI_TOKEN_NAY_THANH_MA_RIENG_CUA_BAN';
```

thành mã riêng, ví dụ:

```js
const SECRET_TOKEN = 'bao-kt-2026-xxxxx';
```

Không đưa token thật lên GitHub public repo.

## 4. Khởi tạo sheet

Trong Apps Script, chọn hàm:

```text
setupDatabase
```

Bấm `Run`.

Lần đầu Google sẽ hỏi cấp quyền, chọn tài khoản của bạn và cho phép.

Sau khi chạy xong, Google Sheet sẽ có 2 sheet:

```text
DATABASE_JSON
SYNC_LOG
```

## 5. Deploy Apps Script thành Web App

Trong Apps Script bấm `Deploy` → `New deployment`.

Chọn loại:

```text
Web app
```

Cấu hình:

```text
Execute as: Me
Who has access: Anyone
```

Bấm `Deploy`, copy URL dạng:

```text
https://script.google.com/macros/s/AKfycb.../exec
```

## 6. Test backend

Mở link sau trên trình duyệt, thay URL và token của bạn:

```text
https://script.google.com/macros/s/AKfycb.../exec?action=ping&token=bao-kt-2026-xxxxx
```

Nếu đúng sẽ trả về:

```json
{"ok":true,"message":"Apps Script backend đang hoạt động."}
```

## 7. Nối frontend với Apps Script trong web

Mở web:

```text
https://dvbclub.github.io/PM-KTCPTLMT/
```

Vào tab:

```text
Cài Đặt Backend
```

Dán:

```text
Apps Script Web App URL
Token
```

Bấm:

```text
Lưu cấu hình & tải dữ liệu
```

Từ lúc đó, các thao tác thêm/sửa/xóa trong các tab sau sẽ lưu cả database về Google Sheets:

```text
Sổ Chi Phí & Tạm Ứng
Theo Dõi Quỹ
Tiến Trình Hồ Sơ
Vật Tư Tồn Kho
Báo Cáo Gửi Sếp
```

## 8. Ghi chú kỹ thuật

- GitHub Pages không chạy được `server.ts`, Express hoặc Node backend.
- Build đã đổi thành `vite build` để ra frontend tĩnh.
- `vite.config.ts` đã đặt base là `/PM-KTCPTLMT/` để đúng đường dẫn GitHub Pages.
- Frontend hiện dùng `src/services/sheetsBackend.ts` để đọc/ghi Apps Script.
- Nếu chưa cấu hình Apps Script, app vẫn chạy bằng dữ liệu mẫu/cache trên trình duyệt.
- Đây là bản backend database JSON trong Google Sheet. Giai đoạn sau có thể tách từng bảng `CP`, `HCNS`, `Dau`, `HoSo`, `VatTu` nếu cần báo cáo bằng công thức Google Sheets.
