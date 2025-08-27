# QuestFlow Development Environment

> **Simple, lightweight development setup that's easy to maintain**

## 🐳 **Docker Development**

### **Quick Start**

```bash
# Start development environment
./docker-dev.sh start          # Linux/Mac
.\docker-dev.ps1 start         # Windows PowerShell

# Stop development environment
./docker-dev.sh stop           # Linux/Mac
.\docker-dev.ps1 stop          # Windows PowerShell
```

### **Available Commands**

| Command | Description |
|---------|-------------|
| `start` | Start development environment |
| `stop` | Stop development environment |
| `restart` | Restart development environment |
| `logs` | Show container logs |
| `clean` | Clean up containers and images |

### **Manual Docker Commands**

```bash
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f
```

## 🔧 **Environment Configuration**

### **Setup Environment**

1. **Copy environment template:**
   ```bash
   cp env.local .env.local
   ```

2. **Edit `.env.local` with your values:**
   ```bash
   # App Configuration
   NEXT_PUBLIC_APP_NAME=QuestFlow
   NEXT_PUBLIC_APP_VERSION=0.1.0
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # Development
   NODE_ENV=development
   ```

### **Environment Files**

- `env.example` - Template with all possible variables
- `env.local` - Local development template
- `.env.local` - Your local environment (not committed)

## 🚀 **CI/CD Pipeline**

### **GitHub Actions**

The CI pipeline automatically runs on:
- **Push** to `main` or `develop` branches
- **Pull Request** to `main` or `develop` branches

### **What It Does**

1. **Setup** - Node.js 18 with npm caching
2. **Install** - Dependencies with `npm ci`
3. **Test** - Run Jest tests
4. **Lint** - ESLint code quality check
5. **Build** - Next.js production build

### **View CI Status**

- Go to **Actions** tab in GitHub repository
- Check the **CI** workflow status

## 🛠️ **Development Workflow**

### **1. Start Development**
```bash
./docker-dev.sh start
# or
docker-compose up --build
```

### **2. Make Changes**
- Edit files in `src/` directory
- Hot reload will automatically update the app

### **3. Run Tests**
```bash
npm test
```

### **4. Check Code Quality**
```bash
npm run lint
```

### **5. Stop Development**
```bash
./docker-dev.sh stop
# or
docker-compose down
```

## 🔍 **Troubleshooting**

### **Port Already in Use**
```bash
# Check what's using port 3000
netstat -ano | findstr :3000    # Windows
lsof -i :3000                   # Mac/Linux

# Kill the process or change port in docker-compose.yml
```

### **Docker Build Issues**
```bash
# Clean up and rebuild
./docker-dev.sh clean
./docker-dev.sh start
```

### **Permission Issues (Linux/Mac)**
```bash
# Make scripts executable
chmod +x docker-dev.sh
```

## 📁 **File Structure**

```
QuestFlow/
├── Dockerfile              # Lightweight Node.js container
├── docker-compose.yml      # Development environment
├── .dockerignore          # Keep build context clean
├── docker-dev.sh          # Linux/Mac development script
├── docker-dev.ps1         # Windows PowerShell script
├── .github/workflows/     # CI/CD pipeline
│   └── ci.yml            # Automated testing
├── env.local              # Environment template
└── docs/
    └── DEVELOPMENT_ENVIRONMENT.md  # This file
```

## 🎯 **Why This Setup?**

### **Lightweight**
- Minimal Docker layers
- Alpine Linux base image
- Only essential dependencies

### **Easy to Maintain**
- Simple, readable configuration
- Clear script commands
- Minimal complexity

### **Developer Friendly**
- Hot reload support
- Volume mounting for live code changes
- Simple start/stop commands

---

**This setup gives you a professional development environment without the complexity!** 🚀

