# Bon-Rewards
Boncredit task - Rewards allocation based on payment stats to user on bill payment.

System Architecture:
<img width="705" height="284" alt="image" src="https://github.com/user-attachments/assets/2387f349-462b-4a9e-abb0-9eb831a41c78" />

┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Payment       │────│    Apache    │────│    Reward       │
│   Service       │    │    Kafka     │    │    Service      │
│  (Node.js 20+)  │    │              │    │  (Node.js 20+)  │
│                 │    │              │    │                 │
│   ┌─────────┐   │    │              │    │  ┌──────────┐   │
│   │ MongoDB │   │    │              │    │  │  Redis   │   │
│   └─────────┘   │    │              │    │  └──────────┘   │
└─────────────────┘    └──────────────┘    └─────────────────┘
