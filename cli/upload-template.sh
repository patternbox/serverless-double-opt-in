#!/bin/sh

#aws ses create-template --region eu-west-1 --cli-input-json file://ses-template.json
#aws ses update-template --region eu-west-1 --cli-input-json file://ses-template.json
#aws ses delete-template --region eu-west-1 --template-name double-opt-in

aws ses create-template --region eu-central-1 --cli-input-json file://ses-template.json