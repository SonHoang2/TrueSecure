# TrueSecure

[![Language Vietnamese](https://img.shields.io/badge/Read%20in-Tiếng%20Việt-blue?style=flat-square)](./README.vi.md)

## Overview

This real-time messaging application enables users to seamlessly connect with friends, family, and colleagues through instant text messaging, group chats, voice calls, and video calls. Designed for fast and secure communication, it leverages Socket.IO for real-time messaging, WebRTC for peer-to-peer media streaming, and end-to-end encryption (E2EE) to protect user privacy. The system also integrates deepfake detection to analyze video streams in real time, enhancing security and trust during video communication.

## Architectural Pattern
- **Modular monolith + separate AI service:** The NestJS backend is a single modular application (auth, user, conversation, socket, deepfake, ...). Deepfake detection runs as a separate FastAPI service (`df_server`) called over HTTP, so the heavy PyTorch workload can be deployed and scaled independently.

## Technologies
- Front End: React, HTML, CSS, Tailwindcss, Typescript
- Back End: NodeJS, NestJS, Typescript, Python, FastAPI
- Deepfake Detection: OpenCV, PyTorch, Facenet-PyTorch, Grad-CAM
- Database: PortgresSQL, Redis, TypeORM
- Real-Time Communication: Socket.io, WebRTC
- Messaging Queue: RabbitMQ (per-user durable queues for offline message delivery)

## Features
- **User Authentication:** Users can securely sign up, log in, and log out using either email and password or social accounts.
- **Real-Time Messaging:** Users can send messages in private and group chats.
- **Voice & Video Calls:** Supports real-time audio and video communication.
- **Token Management:** Automatically refreshes access tokens upon expiration to enhance user experience.
- **Deepfake Detection:** Analyzes video streams in real time to detect deepfakes using deep learning models, helping prevent scam calls.
- **Notifications:** Real-time notifications for events like new messages, calls, and status updates.
- **User-friendly Interface:** Intuitive and easy-to-use design.
- **Group Management:** Create and manage group chats with administrative options.
- **Cloud Storage:** Upload and share files with secure cloud storage capabilities using Cloudinary.
- **OAuth Support:** Login with Google, Facebook, and GitHub accounts.
- **WebRTC Support:** Real-time communication with video and audio streaming capabilities.
- **WebSocket Support:** Real-time connection to the server for instant notifications and updates.


## Security

- **End-to-End Encryption**: Messages are encrypted on the client with the Web Crypto API (ECDH P-256 key exchange + AES-GCM-256). Group chats use a shared group key that is encrypted per participant device and rotated via a group epoch. This is a custom scheme, not the Signal Protocol (no X3DH / Double Ratchet).
- **Secure Authentication:** Passwords are securely hashed and salted to prevent unauthorized access.
- **Robust Authorization:** Refresh and access tokens are stored in cookies with HttpOnly, Secure, and SameSite flags to mitigate XSS, MITM, and CSRF attacks.
- **HTTPS Enforcement:** All data transmissions are secured using HTTPS.

## Author

Hi, I'm the creator and maintainer of this project. I'm passionate about software development and always eager to improve. If you find this project helpful, please consider giving it a star ⭐ – your support means a lot!

If you encounter any bugs or issues, feel free to report them via email. I appreciate your feedback!

📧 **Email:** naruto3285@gmail.com
