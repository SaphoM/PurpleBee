#!/bin/bash

# TaskFlow - Automated Setup Script
# This script sets up the entire development environment

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          TaskFlow - Development Environment Setup              ║"
echo "║                    AI-Powered Productivity Dashboard            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}📋 Checking Prerequisites...${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not installed${NC}"
    echo "   Please install PostgreSQL from https://www.postgresql.org/download/"
    echo "   On Mac: brew install postgresql"
    echo "   On Windows: https://www.postgresql.org/download/windows/"
    echo "   On Linux: sudo apt-get install postgresql"
    exit 1
else
    PSQL_VERSION=$(psql --version)
    echo -e "${GREEN}✓ ${PSQL_VERSION}${NC}"
fi

echo ""
echo -e "${BLUE}🔧 Setting up environment files...${NC}"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
    echo "  ⚠️  Edit .env with your settings if needed"
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

# Create backend/.env if it doesn't exist
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ Created backend/.env${NC}"
    echo "  ⚠️  Edit backend/.env with your database URL:"
    echo "     DATABASE_URL=postgresql://user:password@localhost:5432/taskflow"
else
    echo -e "${GREEN}✓ backend/.env already exists${NC}"
fi

echo ""
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
echo ""

# Install frontend dependencies
npm install

echo ""
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
echo ""

# Install backend dependencies
cd backend
npm install
cd ..

echo ""
echo -e "${BLUE}🗄️  Setting up database...${NC}"
echo ""

# Check if taskflow database exists
if psql -lqt | cut -d \| -f 1 | grep -qw taskflow; then
    echo -e "${YELLOW}⚠️  Database 'taskflow' already exists${NC}"
    read -p "   Reset database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        dropdb taskflow
        createdb taskflow
        echo -e "${GREEN}✓ Database reset${NC}"
    fi
else
    createdb taskflow
    echo -e "${GREEN}✓ Created 'taskflow' database${NC}"
fi

echo ""
echo -e "${BLUE}🔄 Running database migrations...${NC}"
echo ""

# Run Prisma migrations
cd backend
npx prisma migrate dev --name init
cd ..

echo ""
echo -e "${BLUE}✨ Verifying setup...${NC}"
echo ""

# Check if node_modules exist
if [ -d "node_modules" ] && [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Dependencies not installed${NC}"
    exit 1
fi

# Check if database is accessible
if psql -lqt | cut -d \| -f 1 | grep -qw taskflow; then
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${RED}❌ Database not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗"
echo -e "║                  ✅ Setup Complete!                             ║"
echo -e "╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""
echo "1. Start Frontend (Terminal 1):"
echo -e "   ${YELLOW}npm run dev${NC}"
echo ""
echo "2. Start Backend (Terminal 2):"
echo -e "   ${YELLOW}cd backend && npm run dev${NC}"
echo ""
echo "3. Open in Browser:"
echo -e "   ${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Setup Guide: SETUP_GUIDE.md"
echo "   - Architecture: ARCHITECTURE.md"
echo "   - Deployment: DEPLOYMENT.md"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
echo ""
