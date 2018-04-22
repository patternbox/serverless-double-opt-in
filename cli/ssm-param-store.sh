#!/bin/sh

aws ssm put-parameter --region eu-central-1 --type SecureString --name "double-opt-in-secret" --value "mysecret"