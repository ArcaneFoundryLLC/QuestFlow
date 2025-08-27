#!/bin/bash

# QuestFlow Docker Development Script
# Simple commands for development

echo "🐳 QuestFlow Docker Development"

case "$1" in
  "start")
    echo "Starting QuestFlow development environment..."
    docker-compose up --build
    ;;
  "stop")
    echo "Stopping QuestFlow development environment..."
    docker-compose down
    ;;
  "restart")
    echo "Restarting QuestFlow development environment..."
    docker-compose restart
    ;;
  "logs")
    echo "Showing QuestFlow logs..."
    docker-compose logs -f
    ;;
  "clean")
    echo "Cleaning up Docker containers and images..."
    docker-compose down --rmi all --volumes --remove-orphans
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|clean}"
    echo ""
    echo "Commands:"
    echo "  start   - Start development environment"
    echo "  stop    - Stop development environment"
    echo "  restart - Restart development environment"
    echo "  logs    - Show logs"
    echo "  clean   - Clean up containers and images"
    exit 1
    ;;
esac

