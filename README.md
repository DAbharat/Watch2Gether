# Watch2Gether: Distributed Real-Time Synchronized Video Streaming Platform

Watch2Gether is a distributed, low-latency watch party platform designed for synchronized video playback, real-time interactive communication, video request moderation, and room state management across concurrent users.

The system is architected as a decoupled, multi-tier system composed of a client-side interface built with Next.js and React, a persistent stateful WebSocket server powered by Node.js and Socket.IO, and a low-latency persistent key-value cache powered by Redis.

> **Backend Architecture & Socket Engine**: For in-depth socket protocol specifications, mathematical timeline anchor models, connection grace period lifecycle diagrams, and standalone WebSocket benchmarks, see the [watch2gether-sockets Documentation](https://github.com/DAbharat/watch2gether-socket/blob/main/README.md).

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Architectural Diagrams](#architectural-diagrams)
3. [Technology Stack & Technical Justifications](#technology-stack--technical-justifications)
4. [Deployment Topology: Vercel vs. Render](#deployment-topology-vercel-vs-render)
5. [Core Engineering Mechanisms](#core-engineering-mechanisms)
   - [Network Time Protocol (NTP) Clock Synchronization](#network-time-protocol-ntp-clock-synchronization)
   - [Timeline Anchor Playback Synchronization](#timeline-anchor-playback-synchronization)
   - [Role-Based Access Control (RBAC) & Action Requests](#role-based-access-control-rbac--action-requests)
   - [Participant Resiliency & Reconnection Grace Period](#participant-resiliency--reconnection-grace-period)
   - [O(1) Delta Join Broadcast Optimization](#o1-delta-join-broadcast-optimization)
   - [Asynchronous Non-Blocking Persistence](#asynchronous-non-blocking-persistence)
6. [System Tradeoffs and Failure Modes](#system-tradeoffs-and-failure-modes)
7. [Benchmark & Concurrency Load Test Results](#benchmark--concurrency-load-test-results)
8. [Codebase Structure](#codebase-structure)
   - [Watch2Gether (Frontend)](#watch2gether-frontend)
   - [watch2gether-sockets (Backend)](#watch2gether-sockets-backend)
9. [Configuration & Environment Variables](#configuration--environment-variables)
10. [Local Development Setup](#local-development-setup)

---

## System Architecture Overview

Watch2Gether decouples presentation logic, real-time message routing, and persistent storage into three distinct tiers:

1. **Client Tier (Next.js / React)**: Handles UI rendering, audio/video playback via the YouTube IFrame API, local drift correction, debounced typing indicators, floating visual reactions, and user state.
2. **Stateful Coordination Tier (Node.js / Socket.IO)**: Houses an in-memory `RoomManager` that maintains real-time participant registries, socket-to-room mappings, video timeline anchors, active action request queues, and sub-millisecond broadcast routing.
3. **Ephemeral Persistence Tier (Redis / Upstash)**: Serves as a high-throughput, self-pruning in-memory store with automated TTL expiry for transient room state (bounded chat logs, active roles, host records, video queues, and session tokens), avoiding relational database write amplification for short-lived sessions.

```
+-------------------------------------------------------------------------+
|                              Client Tier                                |
|   Next.js 16 (App Router) + React 19 + Tailwind CSS + YouTube IFrame    |
|   Hosted on Vercel Global Edge Network                                  |
+------------------------------------+------------------------------------+
                                     |
                         WebSocket Connection
                      (JSON / Engine.IO Transport)
                                     |
                                     v
+------------------------------------+------------------------------------+
|                       Real-Time Coordination Tier                       |
|   Node.js + Express + Socket.IO Server                                  |
|   Hosted on Render (Persistent Web Service Container)                   |
|   - In-Memory RoomManager (Active timeline, sockets, instant routing)   |
|   - NTP Clock Offset Engine                                             |
|   - RBAC Permission Enforcement                                         |
+------------------------------------+------------------------------------+
                                     |
                           TCP / TLS Protocol
                             (Multi-Exec Pipeline)
                                     |
                                     v
+------------------------------------+------------------------------------+
|                            Persistence Tier                             |
|   Redis (Upstash In-Memory Data Store)                                  |
|   - Room Host & Participant Roles (`room:{id}:roles`)                   |
|   - Bounded Chat Message Logs (`room:{id}:messages`)                    |
|   - Video Request Queues (`room:{id}:requests`)                         |
|   - Cryptographic Participant Tokens (`room:{id}:tokens`)               |
+-------------------------------------------------------------------------+
```

---

## Architectural Diagrams

### Component & Data Flow Architecture

```mermaid
graph TD
    subgraph Clients["Client Tier (Edge CDN)"]
        UserA["Host Client (Browser)"]
        UserB["Moderator Client (Browser)"]
        UserC["Viewer Client (Browser)"]
    end

    subgraph Server["Coordination Tier (Render Linux Container)"]
        SocketServer["Socket.IO Server (Engine.IO)"]
        RoomMgr["RoomManager (In-Memory State)"]
        SyncEngine["Timeline Synchronization Engine"]
        RBAC["RBAC Permission Gate"]
        GracePeriod["Pending Disconnect Grace Queue"]
    end

    subgraph Storage["Persistence Tier (Redis Cloud)"]
        RedisRoles["Roles & Host Map"]
        RedisChat["Capped Chat Logs"]
        RedisRequests["Video Queue & Requests"]
    end

    UserA <-->|WebSocket| SocketServer
    UserB <-->|WebSocket| SocketServer
    UserC <-->|WebSocket| SocketServer

    SocketServer --> RoomMgr
    RoomMgr --> SyncEngine
    RoomMgr --> RBAC
    SocketServer --> GracePeriod

    RoomMgr -.->|Async Non-Blocking Write| RedisChat
    RoomMgr -.->|Async Non-Blocking Write| RedisRoles
    RoomMgr -.->|Async Non-Blocking Write| RedisRequests
```

### Playback Synchronization & NTP Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Client as Viewer Client
    participant Server as Socket.IO Server
    participant Redis as Redis Storage

    Note over Client,Server: Phase 1: NTP Clock Skew Calculation
    Client->>Server: ntp_ping { clientSendTime: T0 }
    Server-->>Client: ntp_pong { clientSendTime: T0, serverTime: T_server }
    Note over Client: Calculate RTT = T1 - T0<br/>Calculate Offset = T_server + (RTT / 2) - T1

    Note over Client,Server: Phase 2: Host Initiates Playback
    Client->>Server: play { roomId, currentTime: 45.2 }
    Server->>Server: Verify RBAC Role (Host / Mod)
    Server->>Server: Update Timeline Anchor<br/>anchorPosition = 45.2<br/>anchorServerTime = Date.now()
    Server-->>Client: play { currentTime, anchorPosition, anchorServerTime, sentAt }

    Note over Client: Phase 3: Client Local Drift Correction
    Note over Client: Local Target = anchorPosition + (getServerNow() - anchorServerTime)<br/>if |Current - Target| > 1.5s -> seekTo(Target)<br/>if 0.25s < |Current - Target| <= 1.5s -> adjust playbackRate (0.95x / 1.05x)
```

### Moderated Video Request Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Viewer as Viewer (Participant)
    participant Server as Socket.IO Server
    participant Host as Host / Moderator
    participant Redis as Redis Storage

    Viewer->>Server: request_action { type: "change_video", payload: { videoId } }
    Server->>Server: Verify Requester Membership
    Server->>Server: Create ActionRequest Object
    Server-->>Host: action_requested { requestId, requesterName, type, payload }
    Server-->>Viewer: action_request_sent { requestId }

    Host->>Server: approve_action { roomId, requestId }
    Server->>Server: Verify Host/Mod Permission
    Server->>Server: Apply Playback State Mutation
    Server-->>Viewer: action_approved { requestId, type }
    Server-->>Host: action_resolved { requestId }
    Server-->>Viewer: change_video { videoId }
    Server-.->Redis: Save queue mutation asynchronously
```

---

## Technology Stack & Technical Justifications

### Frontend Tier

- **Next.js 16 (App Router)**: Provides modern React Server Component architecture, file-system routing, automatic code splitting, optimized script loading, and asset bundling.
- **React 19**: Leverages the latest concurrent features, optimized hooks, and strict hydration controls.
- **TypeScript 5**: Enforces compile-time type safety across data contracts, socket payloads, and component props, preventing runtime property mismatch errors.
- **Tailwind CSS**: Utility-first CSS framework enabling a responsive glassmorphism UI design system without CSS runtime overhead.
- **Radix UI Primitives**: Headless, accessible UI building blocks (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-avatar`, `@radix-ui/react-alert-dialog`) ensuring WCAG-compliant keyboard navigation and focus management.
- **YouTube IFrame API**: Embedded video playback engine allowing programmatic control over play, pause, seek, playback rate, and state change listeners.

### Backend Tier

- **Node.js (LTS)**: Asynchronous, event-driven runtime ideal for I/O-intensive WebSocket multiplexing.
- **Socket.IO 4.8**: Real-time bidirectional communication engine configured with WebSocket transport priority, automated heartbeat detection, and room abstraction.
- **Express 4**: Minimal HTTP wrapper used for CORS preflight handling, health endpoints, and static routing.
- **ioredis**: Robust, high-performance Redis client with built-in support for pipelining, transactions (`multi/exec`), TLS connections, and connection pooling.

### Why This Stack?

1. **Why Socket.IO over raw WebSockets?**
   Raw `ws` requires manual implementation of rooms, reconnection backoff, heartbeat health checks, connection fallbacks, and connection state recovery. Socket.IO abstracts room multiplexing natively, allowing clean isolation between different watch parties (`socket.join(roomId)` / `socket.to(roomId)`).

2. **Why Redis over a Traditional Database (PostgreSQL / MySQL / MongoDB)?**
   - **Ephemeral Lifecycle of Watch Parties**: A watch party is fundamentally a temporary, real-time event. Users assemble, watch a video together for 30 to 120 minutes, exchange high-frequency reactions and messages, and disband. Writing thousands of transient chat messages, temporary socket IDs, and ephemeral participant rosters to a persistent relational database creates massive disk write amplification, index churn, database bloat, and costly table vacuuming/cleanup jobs for data that has zero value after the room closes.
   - **Automatic Self-Pruning with Zero Maintenance**: Redis provides native Time-to-Live (`CHAT_TTL = 86400`) and atomic bounded collections (`LTRIM 0 MAX_MESSAGES - 1`). Ephemeral watch party data lives in-memory with sub-millisecond read/write speeds, and automatically expires when the party ends, eliminating database garbage collection completely.
   - **Clear Boundary Between Ephemeral Rooms and Persistent Analytics**:
     - _Redis Responsibility_: High-throughput real-time room coordination, transient chat backlogs, active roles, and live request queues.
     - _Relational/Document DB Responsibility (Platform Layer)_: A traditional database (e.g., PostgreSQL) is reserved for persistent, long-term domain entities: user authentication accounts, persistent user profiles, saved video playlists, friend graphs, and global platform telemetry (e.g., total watch parties hosted, historical participant counts, cumulative watch hours, video engagement statistics).
       Decoupling the high-frequency ephemeral room runtime from persistent user storage prevents real-time spikes from degrading core platform database performance.

3. **Why YouTube IFrame API?**
   YouTube provides universal content availability, automated video transcoding, adaptive bitrate streaming (HLS/DASH), and global CDN distribution. Watch2Gether acts as a coordination layer over YouTube without incurring video hosting, transcoding, or egress bandwidth costs.

---

## Deployment Topology: Vercel vs. Render

A central design decision of this system is separating the frontend and backend deployments across two different cloud platforms:

| Layer                 | Hosting Provider | Deployment Model               | Runtime Characteristics                    |
| :-------------------- | :--------------- | :----------------------------- | :----------------------------------------- |
| **Frontend**          | Vercel           | Jamstack / Global Edge CDN     | Serverless, Stateless, Instant Scaling     |
| **Real-Time Sockets** | Render           | Managed Docker/Linux Container | Persistent Process, Long-Lived TCP Sockets |
| **Database Cache**    | Upstash          | Managed Cloud Redis            | Serverless, Sub-millisecond Memory Store   |

### Why Frontend is on Vercel

Vercel is optimized for Next.js applications:

- Static assets and JavaScript bundles are distributed across hundreds of global edge locations, ensuring minimal Time to First Byte (TTFB).
- Continuous deployment pipelines automatically build previews and production deployments from Git branches.
- Zero server maintenance overhead for the presentation tier.

### Why Sockets Cannot Run on Vercel (The Technical Reason)

Vercel's compute model is **serverless functions** (AWS Lambda-based):

1. **Stateless Execution**: Serverless functions spin up to handle an incoming HTTP request and terminate immediately after sending the response (maximum execution duration of 10 to 30 seconds).
2. **No Persistent Connections**: WebSockets require an uninterrupted, persistent bidirectional TCP connection. A serverless platform terminates connections as soon as the function times out.
3. **No Shared In-Memory State**: If User A connects to Serverless Instance 1 and User B connects to Serverless Instance 2, neither instance knows about the other's connected sockets without complex external pub/sub infrastructure.

### Why Sockets are on Render

Render provides a **persistent daemon container**:

- The Node.js process runs continuously 24/7 without arbitrary execution time limits.
- The `RoomManager` memory heap remains intact between events, allowing instant in-memory routing to all sockets connected to a room.
- Persistent TCP connections are held open continuously, avoiding the repeated connection negotiation overhead of serverless environments.

---

## Core Engineering Mechanisms

### Network Time Protocol (NTP) Clock Synchronization

Physical clocks on client devices can drift significantly (often by several hundred milliseconds or even seconds due to OS sync intervals). Direct playback alignment using client system time results in desynchronization.

Watch2Gether solves this with a lightweight two-way NTP handshake:

1. Client transmits an `ntp_ping` containing its local high-resolution timestamp ($T_0$).
2. The server receives the packet and immediately responds with `ntp_pong`, attaching the server's current epoch timestamp ($T_{server}$) alongside $T_0$.
3. Upon receiving the response at local time $T_1$, the client computes:
   $$\text{Round-Trip Time (RTT)} = T_1 - T_0$$
   $$\text{One-Way Latency} = \frac{\text{RTT}}{2}$$
   $$\text{Clock Skew Offset} = T_{server} + \left(\frac{\text{RTT}}{2}\right) - T_1$$
4. The client computes normalized server time at any given instant via:
   $$\text{getServerNow}() = \text{Date.now}() + \text{Clock Skew Offset}$$

### Timeline Anchor Playback Synchronization

Rather than continuously broadcasting playback positions (which floods the network), the server operates on a mathematical timeline anchor model:

- When a play, pause, or seek occurs, the server records two values:
  - `anchorPosition`: The exact video time (in seconds) where the state changed.
  - `anchorServerTime`: The server epoch timestamp (in milliseconds) when the state changed.
- If the video is playing, the expected playhead position at any future instant $t$ is calculated deterministically by both server and clients:
  $$\text{Target Position} = \text{anchorPosition} + \frac{\text{getServerNow}() - \text{anchorServerTime}}{1000}$$
- If the video is paused, $\text{Target Position} = \text{anchorPosition}$.

#### Local Drift Correction Algorithm

The client runs an alignment check every second:

- **Major Drift ($|\Delta| > 1.5\text{ seconds}$)**: The client performs an explicit `player.seekTo(TargetPosition)`.
- **Minor Drift ($0.25\text{s} < |\Delta| \le 1.5\text{s}$)**: The client dynamically adjusts playback speed (e.g., to $1.05\times$ if behind, or $0.95\times$ if ahead) for smooth synchronization without audio skipping.
- **Negligible Drift ($|\Delta| \le 0.25\text{s}$)**: Playback remains undisturbed at $1.0\times$ speed.

### Role-Based Access Control (RBAC) & Action Requests

The system enforces a strict three-tier hierarchy:

- **Host**: Complete control over playback, video selection, room settings, participant role promotion, member ejection, and host status transfer.
- **Moderator**: Delegated control over play, pause, seek, video selection, and request queue approvals.
- **Participant (Viewer)**: Read-only playback permissions with chat and reaction access.

When a participant attempts a control action (e.g., pauses the video or suggests a new URL), the server intercepts the action:

1. Identifies the participant lacks direct permission.
2. Formats the action into a pending `ActionRequest` object.
3. Broadcasts an `action_requested` notification to all active Hosts and Moderators.
4. When approved by an authorized user, the server executes the mutation and broadcasts the state change to all participants.

### Participant Resiliency & Reconnection Grace Period

In browser environments, users frequently refresh the page or encounter momentary network disconnects. A naive implementation immediately removes the user, revoking their roles or causing a room host vacuum.

Watch2Gether implements a **resilient grace period mechanism**:

1. When a client connects, a stable `participantId` and a cryptographic `participantToken` are persisted in client `localStorage`.
2. Upon disconnection, the server does not immediately destroy participant state. It stages an 8-second eviction timer in `pendingDisconnects`.
3. If the user reconnects within 8 seconds with their valid `participantToken`, the timer is cancelled, their active socket ID is rebound to their persistent participant identity, and their host/moderator permissions are preserved seamlessly without notifying the room.
4. Only if the 8-second window expires is the participant evicted from the room, triggering role reassignment if the departed user was the host.

### O(1) Delta Join Broadcast Optimization

In a room with $N$ active users, when a new participant connects:

- **Naive Implementation**: The server broadcasts the entire participant array ($N$ objects) and the complete room state (all chat logs, timeline info, and queue items) to all $N$ connected clients. Across $N$ joins during a ramp-up, this incurs $O(N^2)$ serialized payloads, choking network buffers and spiking server CPU to 100%.
- **Optimized Implementation**:
  1. The new joiner receives the complete room snapshot via `socket.emit('sync_state', room.getState())` (unicast).
  2. All other existing participants receive an $O(1)$ lightweight delta payload via `socket.to(roomId).emit('user_joined', { participant: { userId, username, role, joinedAt } })`.
  3. No full-state re-broadcast occurs for existing viewers.

This optimization eliminated severe buffer delays during high-concurrency join bursts.

### Asynchronous Non-Blocking Persistence

Real-time chat and reaction broadcasts must never block on disk or network database I/O:

- When a chat message arrives, the server adds the message to its in-memory array and immediately executes `io.to(roomId).emit('chat_message', message)`.
- In the background, the server asynchronously dispatches an atomic multi-exec pipeline to Redis:
  ```typescript
  redis
    .multi()
    .lpush(`room:${roomId}:messages`, JSON.stringify(message))
    .ltrim(`room:${roomId}:messages`, 0, MAX_MESSAGES - 1)
    .expire(`room:${roomId}:messages`, CHAT_TTL)
    .exec()
    .catch((err) => console.error("[Redis] Error saving message:", err));
  ```
- This ensures the broadcast loop operates at sub-millisecond in-memory speeds regardless of Redis network latency.

---

## System Tradeoffs and Failure Modes

1. **Render Free Tier Spin-Down (Cold Start Latency)**
   - _Behavior_: Free instances on Render spin down into a sleep state after 15 minutes of zero traffic.
   - _Impact_: The first user to visit the room after dormancy experiences a 30 to 50 second initial connection delay while the container boots.
   - _Mitigation_: In production, instances should be configured on Render's Starter or Standard tier with health checks enabled to maintain warm containers continuously.

2. **Single-Node In-Memory Scalability vs. Redis Adapter Clustering**
   - _Behavior_: The current `RoomManager` maintains active socket maps directly in the Node.js process memory.
   - _Tradeoff_: This provides ultra-low sub-millisecond routing speeds for a single node, but caps total concurrent connections to the capacity of a single server instance (~10,000 concurrent sockets).
   - _Mitigation Path_: For multi-server horizontal scaling across multiple instances, `@socket.io/redis-adapter` can be enabled to distribute room broadcasts across nodes via Redis Pub/Sub channels.

3. **Geographical Network Distance (Physical Speed-of-Light Latency)**
   - _Behavior_: The persistent socket server is deployed in North America (Oregon/Ohio), while test clients operating from South Asia (India) communicate across trans-oceanic fiber routes.
   - _Impact_: Minimum network round-trip time (RTT) has a physical lower bound of ~250ms to 260ms purely due to geographic transit distance, irrespective of server execution speed.

4. **Single-Threaded Benchmark Event-Loop Queuing**
   - _Behavior_: Running 100 simulated WebSocket clients inside a single local Node.js process causes that single process to ingest and parse thousands of incoming JSON packets per second.
   - _Tradeoff_: Client-side event loop queuing in the benchmark harness can artificially report inflated latency figures that do not occur in production (where 100 users operate on 100 separate physical devices).

---

## Benchmark & Concurrency Load Test Results

The platform was subjected to concurrency load testing using a dedicated multi-client harness ([`scripts/loadtest.mjs`](file:///d:/CodeFiles/Watch2Gether/scripts/loadtest.mjs)). The test established 100 concurrent WebSocket connections to a live room on a deployed cloud instance (`https://your-server.onrender.com`) from a remote client location, evaluating message ingestion, packet broadcast reliability, and latency distribution.

### Scenario A: Realistic Watch Party (100 Viewers, 10 Active Chatters)

This scenario reflects real-world watch party dynamics: 100 concurrent viewers in a single room receiving synchronized video timeline events, reactions, and room notifications, with 10 active chatters continuously generating real-time chat messages.

| Metric                                 | Result                        |
| :------------------------------------- | :---------------------------- |
| **Simulated Room Viewers**             | 100 concurrent users          |
| **Connection Success Rate**            | 100 / 100 (100%)              |
| **Connection Failures**                | 0                             |
| **Messages Ingested by Server**        | 190                           |
| **Broadcast Packets Delivered**        | 19,000 packets                |
| **Sustained Delivered Throughput**     | 950.0 msg/sec                 |
| **Packet Delivery Reliability**        | 100.0% (Zero dropped packets) |
| **Trans-Continental Baseline Latency** | 262 ms                        |
| **Median Latency (p50)**               | 419 ms                        |
| **Average (Mean) Latency**             | 447.8 ms                      |
| **95th Percentile Latency (p95)**      | 696 ms                        |
| **99th Percentile Latency (p99)**      | 860 ms                        |
| **Maximum Recorded Latency**           | 1,052 ms                      |
| **Connection Errors**                  | 0                             |

### Scenario B: Maximum Stress Flood (100 Simultaneous Spammers)

This scenario models an extreme stress condition: all 100 connected room viewers transmitting messages simultaneously every second, driving server broadcast delivery rates into thousands of packets per second.

| Metric                                 | Result               |
| :------------------------------------- | :------------------- |
| **Simulated Room Viewers**             | 100 concurrent users |
| **Connection Success Rate**            | 100 / 100 (100%)     |
| **Connection Failures**                | 0                    |
| **Messages Ingested by Server**        | 1,900                |
| **Broadcast Packets Delivered**        | 67,365+ packets      |
| **Peak Delivered Throughput**          | 3,368.3 msg/sec      |
| **Trans-Continental Baseline Latency** | 291 ms               |
| **Median Latency (p50)**               | 3,443 ms             |
| **Average (Mean) Latency**             | 4,272.1 ms           |
| **Connection Errors**                  | 0                    |

### Latency Optimization Progression

Following the transition from full-state broadcasting to the O(1) delta join architecture and non-blocking asynchronous Redis persistence, the platform demonstrated the following performance improvements:

| Metric                   | Prior Architecture | Optimized Architecture | Net Gain         |
| :----------------------- | :----------------- | :--------------------- | :--------------- |
| **Average Latency**      | 1,754.4 ms         | 447.8 ms               | ~74% Reduction   |
| **p95 Latency**          | 7,535.0 ms         | 696.0 ms               | ~10.8x Faster    |
| **p99 Latency**          | 11,282.0 ms        | 860.0 ms               | ~13.1x Faster    |
| **Max Latency**          | 12,420.0 ms        | 1,052.0 ms             | ~11.8x Faster    |
| **Delivery Reliability** | 97.9%              | 100.0%                 | Zero Packet Loss |

---

## Codebase Structure

### Watch2Gether (Frontend)

```
Watch2Gether/
├── app/
│   ├── favicon.ico
│   ├── globals.css                # Global styles & glassmorphic utility classes
│   ├── layout.tsx                 # Root layout with fonts & meta tags
│   ├── page.tsx                   # Landing page: Create/Join room inputs
│   └── room/
│       └── [roomId]/
│           ├── page.tsx           # Dynamic room routing wrapper
│           └── RoomClient.tsx     # Primary room controller (Sockets, Player, State)
├── benchmark/
│   ├── loadtest.js                # Socket.IO concurrency test harness
│   └── package.json               # Benchmark module configuration
├── components/
│   ├── YouTubePlayer.tsx          # YouTube IFrame API lifecycle manager
│   ├── room/
│   │   ├── ChangeVideoModal.tsx   # Modal for changing active YouTube URL
│   │   ├── ChangeVideoSection.tsx # Video search & change controls
│   │   ├── ChatBox.tsx            # Real-time chat view with typing bubbles
│   │   ├── FloatingReactions.tsx  # Floating animated reaction overlays
│   │   ├── ParticipantsCard.tsx   # Participant roster card
│   │   ├── ParticipantsModal.tsx  # Admin roster modal for role assignments
│   │   ├── RoomHeader.tsx         # Desktop room navigation & actions header
│   │   ├── RoomSidebar.tsx        # Responsive chat, participant & request drawer
│   │   ├── SetUsernameModal.tsx   # Personalized display name prompt for joiners
│   │   ├── VideoPlayerControls.tsx# Custom play, pause, seek, rate & volume controls
│   │   ├── VideoSection.tsx       # Video frame & title bar container
│   │   └── VideoTitleBar.tsx      # Video title & channel information bar
│   └── ui/                        # Radix UI headless accessible components
├── lib/
│   ├── avatars.ts                 # Preset avatar resolver
│   ├── participant.ts             # Stable participant identity generator
│   ├── socket.ts                  # Client-side Socket.IO singleton instance
│   ├── types.ts                   # Frontend TypeScript interfaces
│   └── utils.ts                   # Class name merging & utility helpers
├── public/                        # Static assets, backgrounds & avatars
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### watch2gether-sockets (Backend)

For dedicated backend documentation, architecture diagrams, and socket event references, see the [watch2gether-sockets Repository](https://github.com/DAbharat/watch2gether-socket/blob/main/README.md).

```
watch2gether-sockets/
├── src/
│   ├── config/
│   │   ├── redis.ts               # Upstash Redis ioredis client initialization
│   │   └── storage/
│   │       ├── chat.ts            # Bounded chat persistence (LPUSH / LTRIM)
│   │       ├── requests.ts        # Video request queue storage
│   │       ├── role.ts            # Persistent host & role assignments
│   │       └── participant/
│   │           └── participant.ts # Cryptographic participant token verification
│   ├── models/
│   │   ├── Participant.ts         # In-memory participant entity model
│   │   ├── Room.ts                # In-memory room state & timeline calculations
│   │   └── RoomManager.ts         # Singleton registry managing all active rooms
│   ├── utils/
│   │   └── youtubeValidator.ts    # YouTube URL parsing & canonical ID extraction
│   ├── server.ts                  # Main Express & Socket.IO entry point
│   └── types.ts                   # Shared TypeScript interfaces & socket events
├── package.json
└── tsconfig.json
```

---

## Configuration & Environment Variables

### Frontend (`Watch2Gether/.env.local`)

```env
# URL pointing to the deployed Socket.IO coordination server
NEXT_PUBLIC_SOCKET_URL=https://your-server.onrender.com
```

### Backend (`watch2gether-sockets/.env`)

```env
# Server port
PORT=4000

# Client origin permitted for Cross-Origin Resource Sharing (CORS)
CLIENT_URL=https://watch2-gether-tau.vercel.app

# Upstash / Redis Connection URL (Requires TLS)
REDIS_URL=rediss://default:your-token@your-redis-instance.upstash.io:6379

# Maximum message backlog persisted per room
MAX_MESSAGES=150

# Chat retention Time-To-Live in seconds (Default: 24 Hours)
CHAT_TTL=86400
```

---

## Local Development Setup

### Prerequisites

- Node.js 18.x or later installed
- A Redis instance (Local Redis server or free Upstash Redis instance)
- Git

### 1. Clone the Repositories

```bash
git clone https://github.com/your-username/Watch2Gether.git
git clone https://github.com/your-username/watch2gether-sockets.git
```

### 2. Configure and Run the Backend

```bash
cd watch2gether-sockets
npm install

# Create .env file and populate variables
cp .env.example .env

# Start development server with hot-reload
npm run dev
```

The socket server will bind to `http://localhost:4000`.

### 3. Configure and Run the Frontend

```bash
cd ../Watch2Gether
npm install

# Create .env.local pointing to local socket server
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:4000" > .env.local

# Start Next.js development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### 4. Running the Load Test Benchmark

To execute concurrency benchmarks against a local or deployed server:

```bash
node scripts/loadtest.mjs                      # realistic, against localhost
node scripts/loadtest.mjs --stress             # stress mode
NEXT_PUBLIC_SOCKET_URL=https://your-server.onrender.com
```
