# A.S.T.R.A 🚀
### AI-Powered Secure Transport Recognition & Access System

A.S.T.R.A is an enterprise-grade, intelligent community access and automated transport security management platform. It seamlessly combines License Plate Recognition (LPR), OCR, vehicle damage inspection, digital twin smart parking visualization, real-time WebSocket feeds, and AI chatbot assistance into a unified ecosystem.

---

## 🌟 Key Features

- **🔐 Authentication & Role-Based Access Control (RBAC)**
  - JWT-based authentication with Argon2 password hashing.
  - Granular access management for Admins, Security Guards, Residents, and Visitors.

- **🚘 Access Pass & Visitor Management**
  - Pre-approved visitor entry requests and instant QR code access pass generation.
  - Seamless gate control and entry/exit verification.

- **📹 License Plate Recognition (LPR) & Vision Modules**
  - Automated LPR processing for entry gate hardware integration.
  - OCR document & badge extraction.
  - Vehicle damage inspection logging and media handling.

- **🏢 Digital Twin & Smart Parking System**
  - Real-time digital twin visualization of residential & commercial parking zones.
  - Dynamic slot allocations, sensor status tracking, and parking node management.

- **🚨 Anomaly Detection & Dispute Resolution**
  - Automatic detection of unauthorized parking, tailgating, or overtime stays.
  - Integrated dispute reporting and workflow management for security personnel.

- **🤖 AI Assistance & Chatbot**
  - Intelligent resident & security assistant integrated with custom document context and LLM services.

- **⚡ Real-Time WebSockets & SMS Notifications**
  - Live WebSocket channels for gate events, security alerts, and sensor changes.
  - Twilio integration for instant SMS notifications to residents.

- **📊 Comprehensive Analytics & Admin Dashboard**
  - Real-time community traffic metrics, parking occupancy rates, and entry/exit logs.

---

## 🛠️ Technology Stack

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database & ORM:** PostgreSQL / SQLite with [SQLAlchemy 2.0 (Async)](https://www.sqlalchemy.org/) & [AsyncPG](https://github.com/MagicStack/asyncpg) / [Aiosqlite](https://github.com/omnilib/aiosqlite)
- **Database Migrations:** [Alembic](https://alembic.sqlalchemy.org/)
- **Security:** PyJWT, Pwdlib (Argon2), Email-Validator
- **Integrations:** Twilio SMS, Pillow (Image Processing), QRCode, WebSockets

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing & Icons:** React Router v7, Lucide Icons
- **HTTP Client:** Axios
- **Linting:** Oxlint

---

## 📁 Repository Structure

```
ASTRA/
├── backend/
│   ├── alembic/                # Database migration scripts
│   ├── app/
│   │   ├── api/                # FastAPI endpoints (Auth, Parking, LPR, Chatbot, etc.)
│   │   ├── database/           # Async engine & session setup
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── repositories/       # Data access layer
│   │   ├── schemas/            # Pydantic data validation schemas
│   │   ├── services/           # Business logic & integrations
│   │   ├── config.py           # Application settings & environment loader
│   │   └── main.py             # FastAPI entrypoint & middleware configuration
│   ├── tests/                  # Unit and integration tests
│   ├── create_tables.py        # Database initializer script
│   ├── seed_roles.py           # Pre-population script for RBAC roles
│   ├── smoke_test.py           # API smoke test suite
│   └── requirements.txt        # Backend dependencies
├── frontend/
│   ├── public/                 # Static assets
│   ├── src/                    # React components, pages, & routes
│   ├── package.json            # Node.js dependencies & scripts
│   └── vite.config.js          # Vite configuration
├── .env.example                # Template for environment variables
├── requirements.txt            # Root backend dependencies
└── README.md                   # System documentation
```

---

## ⚙️ Getting Started

### Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: v18.0 or higher (with `npm`)
- **PostgreSQL**: (Optional for production, SQLite can be used for local testing)

---

### 🐍 Backend Setup

1. **Navigate to the repository root and activate a virtual environment:**

   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**

   Copy `.env.example` to `.env` in the project root:

   ```bash
   cp .env.example .env
   ```

   Update the parameters in `.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/astra_db
   JWT_SECRET_KEY=your_secure_random_jwt_secret_key
   ASTRA_ADMIN_REGISTRATION_CODE=your_community_admin_code
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

4. **Initialize Database & Seed Default Roles:**

   ```bash
   cd backend
   python seed_roles.py
   ```

5. **Run the Backend Server:**

   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   - **API Documentation (Swagger UI):** `http://localhost:8000/docs`
   - **Alternative Docs (ReDoc):** `http://localhost:8000/redoc`

---

### ⚛️ Frontend Setup

1. **Navigate to the `frontend` folder:**

   ```bash
   cd frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the Development Server:**

   ```bash
   npm run dev
   ```

   The frontend dashboard will be available at `http://localhost:5173`.

---

## 🧪 Testing

Run backend tests using `pytest`:

```bash
cd backend
pytest
```

Run the backend smoke test suite:

```bash
cd backend
python smoke_test.py
```

---

## 📤 Pushing to Git

To stage, commit, and push your latest code to your remote repository:

1. **Check working tree status:**
   ```bash
   git status
   ```

2. **Stage modified and newly created files:**
   ```bash
   git add .
   ```

3. **Commit changes with a descriptive message:**
   ```bash
   git commit -m "feat: add root requirements.txt, backend requirements, and comprehensive README documentation"
   ```

4. **Push to the remote repository:**
   ```bash
   git push origin main
   ```

---

## 🤖 Pretrained Vehicle Damage Detection Model Details & Setup

A.S.T.R.A. uses an open-source pretrained YOLOv8 deep learning model fine-tuned specifically for vehicle damage detection during 4-view baseline and retrieval inspections.

### Model Metadata & License Evidence
- **Exact Model Name**: `shawnmichael/yolo-car-damage-detection`
- **Source Repository URL**: [https://huggingface.co/shawnmichael/yolo-car-damage-detection](https://huggingface.co/shawnmichael/yolo-car-damage-detection)
- **Checkpoint Filename**: `best_dts.pt` (saved locally to `backend/models_weights/vehicle_damage_yolov8.pt`)
- **Model Architecture**: PyTorch YOLOv8 Object Detector
- **License**: Apache-2.0 (`license:apache-2.0` verified from Hugging Face model metadata)
- **Training Dataset**: Fine-tuned on Open Vehicle Damage Detection Dataset
- **Supported Detection Classes**:
  - Class 0: `none` *(Filtered out by application logic; not saved as damage)*
  - Class 1: `dent`
  - Class 2: `scratch`
  - Class 3: `crack`
  - Class 4: `glass shatter`
  - Class 5: `lamp broken`
  - Class 6: `tire flat`

### Model Download & Setup Procedure
Model weights are strictly excluded from source control via `.gitignore`. To set up the checkpoint locally:

1. **Automatic Download Script**:
   Run the following Python command from `D:\ASTRA\backend`:
   ```bash
   python -c "
   from pathlib import Path
   from huggingface_hub import hf_hub_download
   import shutil

   weights_dir = Path('models_weights')
   weights_dir.mkdir(exist_ok=True)
   target = weights_dir / 'vehicle_damage_yolov8.pt'

   if not target.exists():
       downloaded = hf_hub_download(repo_id='shawnmichael/yolo-car-damage-detection', filename='best_dts.pt')
       shutil.copy(downloaded, target)
       print('Successfully downloaded and configured vehicle damage model weights!')
   "
   ```

2. **Manual Download**:
   Alternatively, download `best_dts.pt` from [https://huggingface.co/shawnmichael/yolo-car-damage-detection](https://huggingface.co/shawnmichael/yolo-car-damage-detection) and place it at:
   `backend/models_weights/vehicle_damage_yolov8.pt`

---

## 📄 License

This project is proprietary software under the A.S.T.R.A ecosystem.

