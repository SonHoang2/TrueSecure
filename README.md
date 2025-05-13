# TrueSecure

[![Language Vietnamese](https://img.shields.io/badge/Read%20in-Tiếng%20Việt-blue?style=flat-square)](./README.vi.md)

## Overview

This real-time messaging application enables users to seamlessly connect with friends, family, and colleagues through instant text messaging, group chats, voice calls, and video calls. Designed for fast and secure communication, it leverages Socket.IO for real-time messaging, WebRTC for peer-to-peer media streaming, and end-to-end encryption (E2EE) to protect user privacy. The system also integrates deepfake detection to analyze video streams in real time, enhancing security and trust during video communication.

## Technologies

- Front End: React, HTML, CSS, Tailwindcss, Typescript
- Back End: NodeJS, NestJS, Typescript, Python, Flask
- Deepfake Detection: OpenCV, PyTorch, Facenet-PyTorch, Grad-CAM
- Database: PortgresSQL, Redis, TypeORM
- Real-Time Communication: Socket.io, WebRTC
- Messaging Queue: RabbitMQ

## Features

- **User Authentication:** Users can securely sign up, log in, and log out using either email and password or social accounts.
- **Real-Time Messaging:** Users can send messages in private and group chats.
- **Voice & Video Calls:** Supports real-time audio and video communication.
- **Token Management:** Automatically refreshes access tokens upon expiration to enhance user experience.

## Security

- **End-to-End Encryption**: Messages are fully encrypted based on the Signal Protocol to ensure the highest level of security, allowing only intended recipients to read them.
- **Secure Authentication:** Passwords are securely hashed and salted to prevent unauthorized access.
- **Robust Authorization:** Refresh and access tokens are stored in cookies with HttpOnly, Secure, and SameSite flags to mitigate XSS, MITM, and CSRF attacks.
- **HTTPS Enforcement:** All data transmissions are secured using HTTPS.

## Author

Hi, I'm the creator and maintainer of this project. I'm passionate about software development and always eager to improve. If you find this project helpful, please consider giving it a star ⭐ – your support means a lot!

If you encounter any bugs or issues, feel free to report them via email. I appreciate your feedback!

📧 **Email:** naruto3285@gmail.com
