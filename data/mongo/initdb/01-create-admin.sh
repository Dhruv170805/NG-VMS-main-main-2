#!/bin/bash
mongosh --eval "
db.getSiblingDB('admin').createUser({
  user: '${MONGO_INITDB_ROOT_USERNAME}',
  pwd: '${MONGO_INITDB_ROOT_PASSWORD}',
  roles: [{ role: 'root', db: 'admin' }]
});
"
