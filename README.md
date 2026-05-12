# Sadji Solo Accounting

Sistem akuntansi UMKM berbasis web.

## Struktur Project

```
tekad-accounting/
├── backend/    # Laravel 13 — REST API
└── frontend/   # React + Vite — PWA Frontend
```

## Menjalankan Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Backend berjalan di: http://localhost:8000

## Menjalankan Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend berjalan di: http://localhost:5173
