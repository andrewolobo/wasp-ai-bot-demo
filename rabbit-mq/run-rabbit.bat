docker run -d --name rabbitmq ^
  -p 5672:5672 ^
  -p 15672:15672 ^
  -e RABBITMQ_DEFAULT_USER=admin ^
  -e RABBITMQ_DEFAULT_PASS=wasp_rabbit_2024 ^
  -v rabbitmq_data:/var/lib/rabbitmq ^
  -v rabbitmq_logs:/var/log/rabbitmq ^
  --restart unless-stopped ^
  rabbitmq:4-management