# PhotoTagger
The most annoying part of taking photos with friends is the point when everyone asks to be sent the same photo of the group. PhotoTagger solves this problem by automatically sharing photos with those who appear in them the moment they are taken. This is done with facial recognition so that everyone who appears in the photo receives it without the need to go through the effort of sharing each one.

![Photos](/screenshots/ss1.png)
![Camera](/screenshots/ss2.png)

## Use
To run the app, download the Expo Client app on iOS and scan the QR code.

![QR Code](/screenshots/qr.png)

Begin by signing in through facebook on the settings page. Once you have done that, go to the main camera, make sure the front camera is there, and click the person icon at the top right to take a picture of yourself (make sure only you are in the shot). This will allow the app to recognize you in the future.
From there, you can take photos of your friends, and (assuming they have also downloaded the app and made an account) have the app automatically send them pictures they appear in.

## How I built it
![Diagram](/screenshots/diagram.png)
- DynamoDB : Stores user data including keys to photos they have taken and appear in
- AWS S3 : Stores user photos
- AWS Rekognition : Recognizes users in photos through a collection of users who have signed up for an account on the app
- AWS Lambda : Python function which is triggered upon photo uploaded to S3 which tags users in photos with AWS Rekognition and updates user in DynamoDB
- Expo.io : To build the app with React Native
- Facebook Application : To handle Sign In


## Setup (To Build On Your Own)
- Set up bucket on AWS S3 to store user photos
- Set up lambda trigger on the bucket to run python code in lambdaFunctions
- Set up table on DynamoDB to hold user data
- Set up a facebook application to handle user login
- Download [Expo](https://expo.io/learn)
- Update HomeScreen.js, LinksScreen.js, and SettingsScreen.js in the screens folder with relevant AWS credentials, bucket names, and dynamoDB table name.
- Update SettingsScreen.js with your App ID in _handleFacebookLogin()
