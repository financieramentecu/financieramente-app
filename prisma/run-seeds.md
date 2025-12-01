1. use ssh to connect droplet
2. cd /opt/financieramente/docker   
3. run command
```
    docker-compose -f docker-compose.qa.yml exec nextjs sh -c "cd /app && npx tsx prisma/seed.ts"
```