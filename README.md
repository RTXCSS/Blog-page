Absolutely 👍
Here’s a **clean, professional `README.md`** you can directly use for your **Blog-page / Blog project**.
It explains setup clearly, handles `.env` properly, and avoids MongoDB confusion.

You can **copy–paste this as-is** into `README.md`.

---

# Blog-Page (Node.js + Express + MongoDB)

A secure Blog backend application built using Node.js, Express, and MongoDB, featuring JWT-based authentication, password hashing, and cookie-based session handling.
---

## Features

User authentication (Register / Login / Logout)

JWT (JSON Web Token) authentication

Password hashing using bcrypt

Secure cookies for auth tokens

Blog CRUD operations

MongoDB with Mongoose

Environment-based configuration using .env

Clean MVC folder structure

---

## Tech Stack

Node.js

Express.js

MongoDB

Mongoose

bcrypt

jsonwebtoken

cookie-parser

dotenv

---

## Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/RTXCSS/Blog-page.git
cd Blog-page
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Create `.env`

```bash
cp .env.example .env
```

Fill in the required values.

### 4️⃣ Start the server

```bash
npm start
```

---

## ▶️ Running the App

Once started, the server runs on:

```
http://localhost:9231
```

You should see:

```
Server has been started on Port 9231
MongoDB connected successfully
```

---

## 📌 Scripts

```bash
npm start
```

