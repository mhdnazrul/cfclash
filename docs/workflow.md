# 🚀 CFClash — Competitive Programming Battle Platform

## 📌 Overview

CFClash is a real-time Competitive Programming battle platform built on top of Codeforces. It allows users to create battle rooms, compete with others, solve problems live, and earn points based on performance. The platform includes live leaderboards, room-based battles, Codeforces synchronization, and automated scoring.

---

## ✨ Features

* 🔄 **Codeforces Sync** — Real-time contest and problem synchronization
* ⚔️ **Battle Arena** — Create and join live coding battles
* 🎯 **Difficulty-based Problem Selection** — Random problems selected based on rating
* 🧑‍🤝‍🧑 **Room System** — Public and unlisted battle rooms with join requests
* 📩 **Notification System** — Real-time alerts for join requests and events
* 🏆 **Live Leaderboard** — Points updated automatically after battles
* ⚡ **Realtime Updates** — Powered by Supabase Realtime
* 🔐 **Authentication** — Secure user authentication via Supabase

---

## 🛠️ Tech Stack

### Frontend

* React + TypeScript (Vite)
* Tailwind CSS
* Shadcn UI
* React Query

### Backend & Database

* Supabase (PostgreSQL)
* Supabase Auth
* Supabase RPC Functions
* Supabase Realtime

### External APIs

* Codeforces API

### Automation

* Vercel Cron Jobs
* Node.js scripts for syncing problems and contests

---

## 🧱 System Architecture

```mermaid
flowchart TD

%% User Layer
U[User Browser]

%% Frontend
FE[React + TypeScript Frontend]

%% Services Layer
SVC[Service Layer\n(cfclash-service, codeforces, contests)]

%% Supabase Backend
AUTH[Supabase Auth]
DB[(PostgreSQL Database)]
RPC[RPC Functions\n(create_room, join_request, etc.)]
RT[Supabase Realtime]

%% External APIs
CF[Codeforces API]

%% Cron Jobs
CRON[Vercel Cron Jobs]

%% Scripts
SCR[Sync Scripts\n(sync-codeforces-core)]

%% Flow
U --> FE
FE --> SVC

SVC --> AUTH
SVC --> DB
SVC --> RPC
SVC --> CF

CF --> SCR
CRON --> SCR
SCR --> DB

RPC --> DB
DB --> RT
RT --> FE

```

---

## 🧭 Workflow Overview

### 1. User Authentication

* Users sign up/login via Supabase Auth
* Profile is automatically created via DB trigger
* Codeforces handle must be linked to participate in battles

---

### 2. Create Room Flow

1. User creates a room from Battle Arena
2. Frontend calls `createRoomWithDifficulties()`
3. Supabase RPC selects random problems based on difficulty
4. Room + problems are stored in database
5. Room link is generated and shared

---

### 3. Join Room Flow

1. User sends a join request
2. Request stored in `join_requests` table
3. Notification sent to room creator
4. Host accepts/rejects request
5. Accepted users are added to participants

---

### 4. Live Battle Flow

1. Host starts the battle
2. Problems are displayed in the room
3. Users solve problems on Codeforces
4. System checks submission status periodically
5. Points are awarded automatically
6. Leaderboard updates in real time

---

### 5. Contest Sync Flow

* Codeforces contests are fetched via API
* Data is cached in Supabase `contests` table
* Vercel Cron triggers periodic sync
* Reduces redundant API calls

---

## 🗄️ Database Structure

### Key Tables

* `profiles` → User info, Codeforces handle, points
* `rooms` → Battle room details
* `room_problems` → Problems assigned to a room
* `room_participants` → Active users in a room
* `join_requests` → Room join requests
* `notifications` → Real-time notifications
* `problems` → Codeforces problem set
* `contests` → Cached contest data
* `leaderboard` → Global rankings

---

## ⚙️ RPC Functions

* `create_room_with_difficulties` → Creates room with random problems
* `handle_room_request` → Approves/rejects join requests
* `start_battle` → Starts a battle session
* `finalize_battle_points` → Calculates and updates scores

---

## 🔄 Data Flow Summary

```
User Action
   ↓
React UI
   ↓
Service Layer
   ↓
Supabase RPC / Database
   ↓
PostgreSQL Processing
   ↓
Realtime Updates
   ↓
UI Re-render
```

---

## 🧪 Debugging Guide

1. **Console Errors**

   * Check browser console for frontend issues

2. **Network Tab**

   * Inspect API calls (Supabase / Codeforces)

3. **Database Check**

   * Verify data in Supabase dashboard tables

4. **Logs**

   * Check Supabase RPC / Edge Function logs

5. **Dev Server**

   * Monitor terminal running `npm run dev`

---

## ⚠️ Known Considerations

* Requires Codeforces handle for battle participation
* Supabase Realtime depends on stable internet connection
* Vercel cron runs periodically (not exact real-time scheduling)
* Random problem selection uses SQL `ORDER BY RANDOM()`

---

## 🚀 Deployment

* Frontend hosted on **Vercel**
* Backend powered by **Supabase**
* Cron jobs configured via `vercel.json`
* Environment variables managed securely via `.env`

---

## 📦 Environment Variables

Example:

```
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_secret
```

---

## 📌 Future Improvements

* Upgrade Vite for better dependency security
* Improve realtime resilience
* Enhance matchmaking system
* Add AI-based problem recommendations
* Optimize database queries for scalability

---
