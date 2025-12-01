## Coonect satabase since pgadmin

1. run pgadmin
2. create tunner from DB

```
    QA_DROPLET_IP=64.225.11.130 bash scripts/db-tunnel-qa.sh start
```
3. check tunnel
```
    scripts/db-tunnel-qa.sh status
```
4. Config connection on PGadmin
```
    Host name/address: localhost
    Port: 5433
    Maintenance database: financieramente_qa
    Username: financieramente_user
    Password: [TU_PASSWORD_DE_POSTGRESQL]
```
5. Click save, pgAdmin connect automatically