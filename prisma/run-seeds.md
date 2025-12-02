1. use ssh to connect droplet
2. cd /opt/financieramente/docker
3. Instalar y ejecutar en un solo comando (bcryptjs y tsx)
```
docker-compose -f docker-compose.qa.yml exec nextjs sh -c "cd /app && npm install --no-save --verbose bcryptjs@^3.0.3 tsx@^4.20.6"
```
4. run command
```
    docker-compose -f docker-compose.qa.yml exec nextjs sh -c "cd /app && npx tsx prisma/seed.ts"
```