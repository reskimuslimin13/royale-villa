# PRD — Royale Villa Malino

## Problem Statement
Website booking untuk Royale Villa Malino (villa di Malino, Gowa, Sulsel). Fitur: booking otomatis dengan cek ketersediaan tanggal, harga per paket, keterangan fasilitas & kapasitas, upload video suasana, galeri foto interaktif (pengganti 360°), konfirmasi via WhatsApp. Rating 5,0 (86 ulasan). Kontak 0853-9551-2330.

## User Choices
- Panel admin sederhana (rekomendasi diterima)
- Booking → konfirmasi via WhatsApp (wa.me/6285395512330)
- Upload video langsung ke website
- Galeri foto interaktif sebagai pengganti 360°
- Tema: Natural & elegan

## Architecture
- Frontend: React 19, Tailwind, framer-motion, lenis (smooth scroll), react-day-picker, sonner. Pages: `/` (Landing), `/admin`.
- Backend: FastAPI + MongoDB (motor). JWT admin auth (Bearer), Emergent Object Storage for video files.
- Key files: `frontend/src/pages/Landing.jsx`, `frontend/src/pages/Admin.jsx`, `frontend/src/lib/content.js`, `frontend/src/lib/api.js`, `backend/server.py`.

## Personas
- Calon tamu: cek tanggal kosong, lihat harga/fasilitas/galeri/video, kirim booking → WhatsApp.
- Pemilik/Admin: login, kelola status booking (konfirmasi/batal), unggah/hapus video suasana.

## Core Requirements (static)
- Booking otomatis dengan deteksi bentrok tanggal (409 jika tanggal sudah dipesan)
- Harga: Per Lantai (Sen-Kam 1,4jt / Jum-Min 1,6jt, maks 15 org); Full Villa (Sen-Kam 2,7jt / Jum-Min 3jt, kap 50 org)
- Galeri interaktif, section video suasana, ulasan, lokasi, kontak

## Implemented (2026-08-14)
- Landing page award-level: kinetic hero + parallax, marquee amenities, manifesto chapters, tetris gallery + lightbox, video ambiance section, facilities, pricing cards, booking calendar, reviews, footer
- Booking API: create (with availability conflict check), booked-dates, admin list, status update
- Admin: JWT login, dashboard (booking management + video upload/delete)
- Object storage video upload & serving via `/api/media/{path}`
- Real villa photos mapped correctly (hero = frontal exterior)

## Backlog
- P1: Foto panorama 360° asli (saat tersedia dari owner)
- P1: Halaman upload foto galeri via admin (saat ini video saja)
- P2: Pembayaran online / DP (Stripe)
- P2: Notifikasi email booking baru ke owner
- P2: Multi-bahasa (EN)

## Next Tasks
- Owner unggah video suasana asli via panel admin
- Ganti foto unsplash (kamar/dapur) dengan foto asli villa saat tersedia
