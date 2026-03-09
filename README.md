# VyapaarAI - Smart Business Automation

**VyapaarAI** is an AI-powered Mini ERP designed specifically for small shop owners in India. It automates inventory management, sales tracking, and profit calculation using advanced OCR and AI technologies.

---

## 🚀 Key Features

### 1. Purchase Bill Scanning (AI-OCR)
- Scan paper invoices from suppliers.
- Automatically extract item names, quantities, and prices.
- Auto-update inventory levels.

### 2. POS-Style Sales Management
- Quick billing interface for customers.
- Real-time stock deduction upon sale.
- Low-stock alerts to prevent out-of-stock situations.

### 3. Automatic Profit & Loss
- Real-time dashboard showing daily and monthly earnings.
- Expense tracking and anomaly detection.

---

## 🛠 Tech Stack

- **Monorepo**: npm Workspaces
- **Frontend**: Next.js 16 (Turbopack), Tailwind CSS, i18next (English & Hindi)
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **AI Engine**: Python, FastAPI (OCR & Forecasting)

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the database:
   - Create a database called `minierp`.
   - Apply the schema from `packages/db/schema.sql`.

4. Configure environment variables:
   - Create `.env` in `apps/api/` with your `DATABASE_URL` and `JWT_SECRET`.

### Running Locally
```bash
npm run dev
```
- **Web App**: http://localhost:3001
- **API**: http://localhost:5000

---

## 📂 Project Structure

- `apps/api`: Express backend handling business logic and transactions.
- `apps/web`: Next.js frontend with multilingual support.
- `apps/ai-service`: Python FastAPI for OCR and AI-driven insights.
- `packages/db`: Database schema and migrations.

---

## 📅 Roadmap
- [x] Phase 1: Authentication & Core Infrastructure
- [x] Phase 2: Inventory & Manual Billing MVP
- [ ] Phase 3: AI OCR Purchase Integration
- [ ] Phase 4: Financial Analytics & Alerts
- [ ] Phase 5: AI Demand Forecasting & Optimization
