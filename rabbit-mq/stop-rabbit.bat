REM filepath: c:\Users\olobo\Documents\AI\wasp-ai-bot\stop-rabbit.bat
@echo off
echo Stopping RabbitMQ...
docker stop rabbitmq
docker rm rabbitmq
echo ✅ RabbitMQ stopped