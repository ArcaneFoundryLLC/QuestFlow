# QuestFlow Docker Development Script (PowerShell)
# Simple commands for development

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "logs", "clean")]
    [string]$Command
)

Write-Host "🐳 QuestFlow Docker Development" -ForegroundColor Cyan

switch ($Command) {
    "start" {
        Write-Host "Starting QuestFlow development environment..." -ForegroundColor Green
        docker-compose up --build
    }
    "stop" {
        Write-Host "Stopping QuestFlow development environment..." -ForegroundColor Yellow
        docker-compose down
    }
    "restart" {
        Write-Host "Restarting QuestFlow development environment..." -ForegroundColor Blue
        docker-compose restart
    }
    "logs" {
        Write-Host "Showing QuestFlow logs..." -ForegroundColor Magenta
        docker-compose logs -f
    }
    "clean" {
        Write-Host "Cleaning up Docker containers and images..." -ForegroundColor Red
        docker-compose down --rmi all --volumes --remove-orphans
    }
    default {
        Write-Host "Usage: .\docker-dev.ps1 {start|stop|restart|logs|clean}" -ForegroundColor White
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor White
        Write-Host "  start   - Start development environment" -ForegroundColor Green
        Write-Host "  stop    - Stop development environment" -ForegroundColor Yellow
        Write-Host "  restart - Restart development environment" -ForegroundColor Blue
        Write-Host "  logs    - Show logs" -ForegroundColor Magenta
        Write-Host "  clean   - Clean up containers and images" -ForegroundColor Red
        exit 1
    }
}

