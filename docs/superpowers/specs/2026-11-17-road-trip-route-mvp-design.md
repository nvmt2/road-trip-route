# Road-trip Route MVP — Short Design

## Mục đích
Tool cá nhân của Toi: ngồi trong xe ở thành phố lạ, bấm 1–2 nút là ra tuyến 3–5 điểm (Ăn uống / Tham quan), mở thẳng Google Maps dẫn đường. Mục tiêu MVP: chạy được trong ~30 phút.

## Goals
- Lấy vị trí hiện tại tự động, không phải gõ.
- Chọn chủ đề: Ăn uống | Tham quan. Chọn số điểm: 3 / 4 / 5 (mặc định 4).
- Ưu tiên "quán local đông khách": rating >= 4.3, nhiều review, đang mở cửa.
- Xếp thứ tự thuận đường, 1 nút mở Google Maps chế độ lái xe.

## Non-goals (để bản sau)
- Lọc theo sở thích cá nhân. Tiêu chí chỗ đỗ xe (bỏ hẳn). Tài khoản, lưu lịch sử.

## Anti-goals
- Bắt gõ nhiều / UI chữ nhỏ khó bấm trong xe.
- Gợi ý chỗ đã đóng cửa.

## Approaches
- **A (đã chọn): Web app 1 trang + Google Places API (New).** Tự chọn quán thật, lọc đang mở; cần API key.
- B: Chỉ tạo link tìm kiếm Google Maps — không cần key nhưng không tự chọn được, mất ý nghĩa tool.
- C: Hỏi Claude mỗi lần — không biết quán đang mở / đông khách, dễ hố.

## Cách làm (Toi chốt: Next.js, key ở server, repo public GitHub)
- Next.js (App Router, TypeScript), 1 trang mobile-first, nút to.
- API route `/api/route` chạy server: nhận lat/lng + chủ đề + số điểm, gọi Google Places API (New) Text Search với key trong env `GOOGLE_MAPS_API_KEY` (không bao giờ gửi key xuống trình duyệt, không commit key).
- Text Search: `openNow: true`, `minRating: 4.3`, `locationBias` bán kính ~5km, `languageCode: vi`.
- Chọn điểm: sắp theo số review giảm dần, lấy top N. Thứ tự: nearest-neighbor theo khoảng cách đường chim bay.
- Output: danh sách điểm + nút mở `https://www.google.com/maps/dir/?api=1&origin=..&destination=..&waypoints=..&travelmode=driving`.
- Repo public trên GitHub (tài khoản nvmt2). Deploy: Vercel (HTTPS, chạy được API route), key đặt trong Environment Variables của Vercel.
