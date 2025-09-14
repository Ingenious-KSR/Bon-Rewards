# Bon-Rewards
Boncredit task - Rewards allocation based on payment stats to user on bill payment.

System Architecture:
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Payment       │────│    Apache    │────│    Reward       │
│   Service       │    │    Kafka     │    │    Service      │
│  (Node.js 20+)  │    │              │    │  (Node.js 20+)  │
│                 │    │              │    │                 │
│   ┌─────────┐   │    │              │    │  ┌──────────┐   │
│   │ MongoDB │   │    │              │    │  │  Redis   │   │
│   └─────────┘   │    │              │    │  └──────────┘   │
└─────────────────┘    └──────────────┘    └─────────────────┘
