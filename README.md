
# ⚔️ CFClash

A real-time competitive battle platform built with **React + TypeScript + Vite + Supabase**, where users can challenge each other using Codeforces problems.

CFClash enables:
- Duel-style battles
- Difficulty-based problem selection
- Real-time syncing of submissions
- Automated Codeforces data synchronization
- Scalable backend powered by Supabase

---

## ✨ Features

- 🔐 Authentication via Supabase Auth
- ⚔️ Create and join battle rooms
- 🎯 Dynamic problem selection by difficulty
- 📡 Real-time updates using Supabase Realtime
- 🤖 Codeforces API integration
- ⏱️ Automated contest/problem syncing
- 🧠 Battle tracking and result evaluation

---

## 📦 Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **External API:** Codeforces API
- **Deployment:** Vercel
- **Cron Jobs:** Vercel Cron

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mhdnazrul/cfclash.git
cd cfclash
````

#### 2. Install dependencies

```bash
npm install
```

#### 3. Setup environment variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CF_API_BASE=https://codeforces.com/api
```

### 4. Run the development server

```bash
npm run dev
```

---

## 📘 Documentation

* 📌 Setup Guide → [`docs/setup.md`](./docs/setup.md)
* 🔄 Workflow Overview → [`docs/workflow.md`](./docs/workflow.md)

---

## ⚙️ Available Scripts

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start development server             |
| `npm run build`         | Build production bundle              |
| `npm run lint`          | Run ESLint checks                    |
| `npm test`              | Run tests with Vitest                |
| `npm run sync:problems` | Sync Codeforces problems to Supabase |

---

## 🌍 Environment Variables

### Frontend (Client-side)



| Variable                 | Description                        |
| ------------------------ | ---------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL               |
| `VITE_SUPABASE_ANON_KEY` | Public anon key                    |
| `VITE_CF_API_BASE`       | Codeforces API base URL (optional) |

> ⚠️ Never expose the service role key to the public

### Server-side (Vercel / scripts only)

| Variable                    | Description                             |
| --------------------------- | --------------------------------------- |
| `SUPABASE_URL`              | Supabase project URL                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin/service role key                  |
| `CRON_SECRET`               | Secret token for securing cron endpoint |

---


## 🧩 Project Architecture

* Frontend communicates with Supabase directly using anon key
* Supabase handles:

  * Auth
  * Database
  * Realtime subscriptions
* Server-side:

  * Cron jobs sync Codeforces data
  * Scripts populate problems table
* Codeforces API used for:

  * Problem metadata
  * Contest data
  * Submission polling

---

## 🤝 Contributing

1. Please read the [`/docs/SETUP.md`](./docs/SETUP.md) file, which has a proper setup guide.
2. Fork the repo
3. Create a feature branch
4. Follow existing code style
5. Test changes locally
6. Submit a pull request


---
## 👨‍💻 About the Developer

**Nazrul Islam** *B.Sc. in Computer Science and Engineering | Premier University, Chittagong*

Passionate about software development, competitive programming, and exploring new technologies like IoT and AI. I love building open-source projects and sharing tech knowledge.

- 🔭 Currently working on:  ***[AI Hex Game](https://github.com/mhdnazrul/11-11-Hex-board-game) / [shopfinity](https://github.com/mhdnazrul/Shopfinity)***
- 🌱 Learning & exploring: Mobile App Development and UI/UX Design
- ⚡ Fun fact: I run a YouTube channel called ***[Tech 2 Hi-Tek - Technology for You](#)***
- 📫 How to reach me: ***nazrul.puc.cse@gmail.com***

### 🌐 Connect with me:
<p align="left">
  <a href="https://linkedin.com/in/nazrulislam7" target="blank"><img align="center" src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" alt="LinkedIn" height="30" width="40" /></a>
  <a href="https://github.com/mhdnazrul" target="blank"><img align="center" src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/github.svg" alt="GitHub" height="30" width="40" /></a>
  <a href="https://codeforces.com/profile/nazrulislam_7" target="blank"><img align="center" src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/codeforces.svg" alt="Codeforces" height="30" width="40" /></a>
</p>

---
