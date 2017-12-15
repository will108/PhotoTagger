from __future__ import print_function

import boto3
from decimal import Decimal
import json
import urllib

print('Loading function')

rekognition = boto3.client('rekognition')


# --------------- Main handler ------------------


def lambda_handler(event, context):
    '''Demonstrates S3 trigger that uses
    Rekognition APIs to detect faces, labels and index faces in S3 Object.
    '''
    #print("Received event: " + json.dumps(event, indent=2))
    my_collection = None
    collection_data = rekognition.list_collections()
    collections = collection_data['CollectionIds']
    if ('myfaces' not in collections):
        rekognition.create_collection(
            CollectionId= 'myfaces'
        )


    # Get the object from the event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.unquote_plus(event['Records'][0]['s3']['object']['key'].encode('utf8'))
    # EXTRACT THE ID FROM THE KEY AND USE IT AS
    start = 0
    self = False
    if ('self' in key):
        start = 4
        self = True
    j = key.index('.')
    i = key.index('i')
    ts = key[i+2:j]
    user = key[start:i]
    print("Timestamp is {}".format(ts))
    print("Bucket name is {}".format(bucket))
    print("Key Name is {}".format(key))
    print("USER ID is {}".format(user))
    print("SELF IS {}".format(self))

    try:
        # If it is a picture of oneself, it indexes it as such
        response = None
        if (self):
            response = rekognition.index_faces(Image={"S3Object": {"Bucket": bucket, "Name": key}}, CollectionId="myfaces", ExternalImageId=user)
        else:
            table = boto3.resource('dynamodb').Table('userphotos')
            all_faces = list()
            response = rekognition.search_faces_by_image(Image={"S3Object": {"Bucket": bucket, "Name": key}}, CollectionId="myfaces", FaceMatchThreshold=80)
            faceMatches = response["FaceMatches"]
            for face in faceMatches:
                info = face["Face"]
                id = info["ExternalImageId"]
                print("FACE ID IS: {}".format(id))
                if (id not in all_faces):
                    all_faces.append(id)
            for item in all_faces:
                table.update_item(
                    Key={
                        'userid' : user
                    },
                    UpdateExpression = "SET #P = list_append (if_not_exists (#P, :empty_list), :my_value)",
                    ExpressionAttributeNames= {'#P' : 'myphotos'},
                    ExpressionAttributeValues= {
                        ':empty_list' : [],
                        ':my_value' : [key],
                    }
                )

        # Print response to console.
        print(response)

        return response
    except Exception as e:
        print(e)
        print("Error processing object {} from bucket {}. ".format(key, bucket) +
              "Make sure your object and bucket exist and your bucket is in the same region as this function.")
        raise e
