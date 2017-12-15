import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  Button,
  AsyncStorage,
  RefreshControl,
} from 'react-native';
import { FileSystem } from 'expo';
var AWS = require('aws-sdk/dist/aws-sdk-react-native');
var albumBucketName = '';
var my_config = new AWS.Config({
  accessKeyId: '',
  secretAccessKey: '',
  region: '',
});
AWS.config.update(my_config)


var s3 = new AWS.S3({
  apiVersion: '2006-03-01'
});
var dynamodb = new AWS.DynamoDB.DocumentClient();

export default class LinksScreen extends React.Component {
  state = {
    photos: [],
    myPhotos: [],
    refreshing: false,
  };
  static navigationOptions = {
    title: 'Gallery',
  };

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this._onRefresh();
  }

  checkSignedIn = async () => {
    try {
      var exp = "0";
      var userId = "";

      await AsyncStorage.multiGet(['fbTokenExpires', 'userId'], (err, stores) => {
        stores.map((result, i, store) => {
          // get at each store's key/value so you can work with it
          var value = store[i][1];
          // console.log(`VALUE ${i}`);
          // console.log(value);
          if (i == 0) {
            exp = (parseInt(value) * 1000).toString();
          } else if (i == 1) {
            userId = value;
          }
        });
      });
      var today = new Date();
      var now = today.getTime();
      if (now < exp) {
        console.log("SIGNED IN");
        // If the current time is after the expiration date of the facbeook
        // token, need to sign in again
        this.setState({
          signedIn: true,
          userId: userId,
        });
        return true;
      } else {
        console.log("THE TOKEN IS EXPIRED, SIGN IN AGAIN")
        // console.log(now)
        // console.log(exp)
        return false;
      }

    } catch (error) {
      // Error retrieving data
      console.log(error);
      console.log("THERE IS NO SIGN IN DATA AT ALL");
      return false;
    }
  }

  _onRefresh() {
    this.setState({refreshing: true});
    this.checkSignedIn()
    if (this.state.signedIn) {
      var params = {
        Key: {
         "userid": `${this.state.userId}`
        },
        TableName: "userphotos"
      };
      console.log("UPDATING PHOTOS");
      dynamodb.get(params, function(err, data) {
        if (err) {
          console.log(err, err.stack); // an error occurred
          this.setState({refreshing: false});
        } else {
          console.log(data);
          if(data.hasOwnProperty('Item') && data.Item.hasOwnProperty('photos')) {
            if(data.Item.hasOwnProperty('photos')) {
              var photoUrls = [];
              var my_objects = data.Item.photos;
              console.log(my_objects);
              for (i = 0; i < my_objects.length; i++) {
                object = my_objects[i];
                photoUrls.push(object)
              }
              console.log("PHOTO URLS");
              console.log(photoUrls);
              this.setState({
                photos: photoUrls,
              });
            }
            if (data.Item.hasOwnProperty('myphotos')) {
              var photoUrls = [];
              var my_objects = data.Item.myphotos;
              console.log(my_objects);
              for (i = 0; i < my_objects.length; i++) {
                object = my_objects[i];
                photoUrls.push(object)
              }
              console.log("MY PHOTO URLS");
              console.log(photoUrls);
              this.setState({
                myPhotos: photoUrls,
              });
            }
            this.setState({refreshing: false});
          } else {
            console.log("Database has no data yet for user")
            this.setState({refreshing: false});
          }
        }
      }.bind(this));
    } else {
      this.setState({refreshing: false});
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <ScrollView contentComponentStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._onRefresh.bind(this)}
            />
          }>
          <View style={styles.header}>
            <Text style={styles.photoText}>Photos Of Me</Text>
          </View>
          <View style={styles.pictures}>
            {this.state.myPhotos.map(photoUri =>
              <View key={photoUri}>
                <Image
                  style={styles.picture}
                  source={{uri: `https://s3.amazonaws.com/${albumBucketName}/${photoUri}`}}
                  key={photoUri}
                />
              </View>
            )}
          </View>
          <View style={styles.header}>
            <Text style={styles.photoText}>Photos I've Taken</Text>
          </View>
          <View style={styles.pictures}>
            {this.state.photos.map(photoUri =>
              <View key={photoUri}>
                <Image
                  style={styles.picture}
                  source={{uri: `https://s3.amazonaws.com/${albumBucketName}/${photoUri}`}}
                  key={photoUri}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  pictures: {
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  picture: {
    width: 160,
    height: 160,
    margin: 5,
    resizeMode: 'contain',
  },
  backButton: {
    padding: 20,
    marginBottom: 4,
    backgroundColor: 'indianred',
  },
  photoText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: 'bold',
  },
  header: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height:65,
    backgroundColor: '#3498db',
  },
  button: {
    backgroundColor: '#3498db',
    flex: 1,
    color: 'white',
  }
});
