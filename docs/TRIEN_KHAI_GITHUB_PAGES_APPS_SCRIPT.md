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

## 7. Nối frontend với Apps Script

Frontend đã có file client:

```text
src/services/sheetsBackend.ts
```

Hiện tại app vẫn còn màn cài đặt Google Drive cũ. Bước tiếp theo nên thêm ô cài đặt:

```text
Apps Script API URL
Apps Script Token
```

và lưu vào localStorage key:

```text
qd_apps_script_api_url
qd_apps_script_api_token
```

Sau đó frontend sẽ gọi Apps Script thay vì `/api/...`.

## Ghi chú quan trọng

- GitHub Pages không chạy được `server.ts`, Express hoặc Node backend.
- Build hiện đã đổi thành `vite build` để ra frontend tĩnh.
- `vite.config.ts` đã đặt base là `/PM-KTCPTLMT/` để đúng đường dẫn GitHub Pages.
- Không đưa token thật vào GitHub public repo.
- Token nên nhập ở màn hình cài đặt của frontend hoặc lưu riêng trên máy người dùng.
