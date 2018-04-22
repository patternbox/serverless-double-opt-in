#!/bin/sh

#aws ses create-template --region eu-west-1 --cli-input-json file://ses-template.json
aws ses update-template --region eu-west-1 --cli-input-json file://ses-template.json