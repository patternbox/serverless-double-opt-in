# Installation

Edit package JSON and add your S3 Bucket and path for Lambda function .zip files:

```
    "copytoS3-lambda-functions": "npm run predeploy && zip -r functions.zip . -i \\*.js -i git-commit.json -i node_modules/\\* -x test/\\* -x node_modules/aws-sdk/\\* -x node_modules/mocha/\\* && echo Copying to S3... && aws s3 cp functions.zip s3://YOURBUCKETHERE/YOURPATHHERE/functions-doi-`git log -1 --pretty=format:'%H'`-`date -u \"+%Y%m%dT%H%M%S\"`.zip"
```

Run

```
npm run copytoS3-lambda-functions
```
The output looks like this:

````
Copying to S3...
upload: ./functions.zip to s3://YOURBUCKETHERE/YOURPATHHERE/functions-doi-ff98a153772284cd19e987626987f91b6dc196f1-20180504T084843.zip
````

Take not of the number part, in this case "ff98a153772284cd19e987626987f91b6dc196f1-20180504T084843".

Create the cloudformation stacks role.json, ses.json and lambda.json in that order.


