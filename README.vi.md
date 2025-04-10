# Secure Chat app

[![Language English](https://img.shields.io/badge/Read%20in-English-blue?style=flat-square)](./README.md)

## Tổng quan
Ứng dụng nhắn tin thời gian thực này cho phép người dùng kết nối liền mạch với bạn bè, gia đình và đồng nghiệp thông qua tin nhắn văn bản tức thì, trò chuyện nhóm, cuộc gọi thoại và cuộc gọi video. Được thiết kế để giao tiếp nhanh chóng và an toàn, ứng dụng đảm bảo mang lại trải nghiệm người dùng mượt mà và trực quan.

## Công nghệ
- Front End: React, HTML, CSS, Tailwindcss, JavaScript
- Back End: NodeJS, Express
- Cơ sở dữ liệu: PostgreSQL, Redis, Sequelize
- Giao tiếp thời gian thực: Socket.io, WebRTC

## Tính năng
- **Xác thực người dùng:** Người dùng có thể đăng ký, đăng nhập và đăng xuất an toàn bằng email và mật khẩu hoặc tài khoản mạng xã hội.
- **Nhắn tin thời gian thực:** Người dùng có thể gửi tin nhắn trong các cuộc trò chuyện riêng tư và nhóm.
- **Cuộc gọi thoại & video:** Hỗ trợ giao tiếp âm thanh và video thời gian thực.
- **Quản lý token:** Tự động làm mới token truy cập khi hết hạn để nâng cao trải nghiệm người dùng.

## Bảo mật
- **Mã hóa đầu cuối:** Tin nhắn được mã hóa hoàn toàn dựa trên Giao thức Signal để đảm bảo mức độ bảo mật cao nhất, chỉ cho phép người nhận dự định đọc chúng.
- **Xác thực an toàn:** Mật khẩu được băm và thêm muối để ngăn chặn truy cập trái phép.
- **Ủy quyền mạnh mẽ:** Token làm mới và truy cập được lưu trữ trong cookie với các cờ HttpOnly, Secure và SameSite để giảm thiểu các cuộc tấn công XSS, MITM và CSRF.
- **Cưỡng chế HTTPS:** Tất cả dữ liệu truyền tải được bảo mật bằng HTTPS.

## Tác giả
Xin chào, tôi là người tạo và duy trì dự án này. Tôi đam mê phát triển phần mềm và luôn sẵn sàng cải thiện. Nếu bạn thấy dự án này hữu ích, hãy cân nhắc tặng một ngôi sao ⭐ – sự ủng hộ của bạn rất có ý nghĩa!  

Nếu bạn gặp bất kỳ lỗi hoặc vấn đề nào, hãy thoải mái báo cáo qua email. Tôi rất trân trọng phản hồi của bạn!  

📧 **Email:** naruto3285@gmail.com