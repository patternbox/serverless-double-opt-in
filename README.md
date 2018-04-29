# Serverless double opt-in

A Serverless double opt-in prototype that uses AWS Lambda and Amazon SES to send emails.

### Requirements

- [Install the Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/installation/)
- [Configure your AWS Credentials](https://serverless.com/framework/docs/providers/aws/guide/credentials/)
- [Setting up Email with Amazon SES](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/setting-up-email.html)

### Configuration

Configure your domain name (used for S3 bucket creation)

```yaml
custom:
  domain: <yourdomain.com>
```

### Installation

To create a new Serverless project.

``` bash
$ serverless install --url https://github.com/patternbox/serverless-double-opt-in --name double-opt-in
```

Enter the new directory

``` bash
$ cd double-opt-in
```

Install the Node.js packages

``` bash
$ npm install
```

### Usage

Deploy your project

``` bash
$ serverless deploy
```


To trigger a function on your AWS account

``` bash
$ serverless invoke -l -f initiate -p ./test-events/initiate.json
$ serverless invoke -l -f initiate -p ./test-events/confirm.json
```

Deploy a single function (optional)

``` bash
$ serverless deploy function --function initiate
$ serverless deploy function --function confirm
$ serverless deploy function --function revoke
```

