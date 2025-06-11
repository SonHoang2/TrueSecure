# TrueSecure

[![Language English](https://img.shields.io/badge/Read%20in-English-blue?style=flat-square)](./README.md)

## Tổng quan

Ứng dụng nhắn tin thời gian thực này cho phép người dùng kết nối dễ dàng với bạn bè, gia đình và đồng nghiệp thông qua nhắn tin văn bản tức thời, trò chuyện nhóm, cuộc gọi thoại và video. Được thiết kế để truyền thông nhanh chóng và an toàn, ứng dụng sử dụng Socket.IO cho nhắn tin thời gian thực, WebRTC cho phát trực tiếp media peer-to-peer và mã hóa đầu cuối (E2EE) để bảo vệ quyền riêng tư của người dùng. Hệ thống cũng tích hợp phát hiện deepfake để phân tích luồng video trong thời gian thực, nâng cao bảo mật và sự tin cậy trong quá trình giao tiếp video.

## Công nghệ
- Front End: React, HTML, CSS, Tailwindcss, Typescript
- Back End: NodeJS, NestJS, Typescript, Python, FastAPI
- Deepfake Detection: OpenCV, PyTorch, Facenet-PyTorch, Grad-CAM
- Cơ sở dữ liệu: PortgresSQL, Redis, TypeORM
- Giao tiếp thời gian thực: Socket.io, WebRTC
- Hàng đợi tin nhắn: RabbitMQ

## Tính năng
- **Xác thực người dùng:** Người dùng có thể đăng ký, đăng nhập và đăng xuất an toàn bằng email và mật khẩu hoặc tài khoản mạng xã hội.
- **Nhắn tin thời gian thực:** Người dùng có thể gửi tin nhắn trong các cuộc trò chuyện riêng tư và nhóm.
- **Cuộc gọi thoại & video:** Hỗ trợ giao tiếp âm thanh và video thời gian thực.
- **Quản lý token:** Tự động làm mới token truy cập khi hết hạn để nâng cao trải nghiệm người dùng.
- **Phát hiện deepfake:** Phân tích luồng video trong thời gian thực để phát hiện deepfake bằng mô hình học sâu, giúp ngăn chặn các cuộc gọi lừa đảo.
- **Thông báo:** Thông báo thời gian thực cho các sự kiện như tin nhắn mới, cuộc gọi và cập nhật trạng thái.
- **Giao diện người dùng thân thiện:** Thiết kế trực quan và dễ sử dụng.
- **Quản lý nhóm:** Tạo và quản lý các cuộc trò chuyện nhóm với các tùy chọn quản trị.
- **Lưu trữ đám mây:** Tải lên và chia sẻ tệp với khả năng lưu trữ đám mây an toàn sử dụng Cloudinary.
- **Hỗ trợ OAuth:** Đăng nhập bằng tài khoản Google, Facebook và GitHub.
- **Hỗ trợ WebRTC:** Giao tiếp thời gian thực với khả năng phát trực tiếp video và âm thanh.
- **Hỗ trợ WebSocket:** Kết nối thời gian thực với máy chủ để nhận thông báo và cập nhật ngay lập tức.

## Bảo mật
- **Mã hóa đầu cuối:** Tin nhắn được mã hóa hoàn toàn dựa trên Giao thức Signal để đảm bảo mức độ bảo mật cao nhất, chỉ cho phép người nhận dự định đọc chúng.
- **Xác thực an toàn:** Mật khẩu được băm và thêm muối để ngăn chặn truy cập trái phép.
- **Ủy quyền mạnh mẽ:** Token làm mới và truy cập được lưu trữ trong cookie với các cờ HttpOnly, Secure và SameSite để giảm thiểu các cuộc tấn công XSS, MITM và CSRF.
- **Cưỡng chế HTTPS:** Tất cả dữ liệu truyền tải được bảo mật bằng HTTPS.

## Tác giả

Xin chào, tôi là người tạo và duy trì dự án này. Tôi đam mê phát triển phần mềm và luôn sẵn sàng cải thiện. Nếu bạn thấy dự án này hữu ích, hãy cân nhắc tặng một ngôi sao ⭐ – sự ủng hộ của bạn rất có ý nghĩa!

Nếu bạn gặp bất kỳ lỗi hoặc vấn đề nào, hãy thoải mái báo cáo qua email. Tôi rất trân trọng phản hồi của bạn!

📧 **Email:** naruto3285@gmail.com
