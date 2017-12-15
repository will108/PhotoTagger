import {
  Camera,
  Video,
  FileSystem,
  Permissions,
} from 'expo';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Slider,
  Image,
  Picker,
  Button,
  ScrollView,
  Vibration,
  AsyncStorage,
  Modal,
} from 'react-native';

var AWS = require('aws-sdk/dist/aws-sdk-react-native');
var albumBucketName = '';
// AWS.config.update({region: 'us-east-1'});
// var IdentityPoolId = 'IDENTITY_POOL_ID';
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


const flashModeOrder = {
  off: 'on',
  on: 'auto',
  auto: 'torch',
  torch: 'off',
};

const wbOrder = {
  auto: 'sunny',
  sunny: 'cloudy',
  cloudy: 'shadow',
  shadow: 'fluorescent',
  fluorescent: 'incandescent',
  incandescent: 'auto',
};

export default class CameraScreen extends React.Component {
  static navigationOptions = {
    title: 'Camera',
  };
  state = {
    flash: 'off',
    zoom: 0,
    autoFocus: 'on',
    depth: 0,
    type: 'back',
    whiteBalance: 'auto',
    ratio: '16:9',
    ratios: [],
    photoId: 1,
    showGallery: false,
    photos: [],
    signedIn: false,
    userId: '',
    visibleModal: false,
  };

  componentDidMount() {
    this.checkSignedIn()
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

  getRatios = async function() {
    const ratios = await this.camera.getSupportedRatios();
    return ratios;
  };

  toggleView() {
    this.setState({
      showGallery: !this.state.showGallery,
    });
  }

  toggleFacing() {
    this.setState({
      type: this.state.type === 'back' ? 'front' : 'back',
    });
  }

  toggleFlash() {
    this.setState({
      flash: flashModeOrder[this.state.flash],
    });
  }

  setRatio(ratio) {
    this.setState({
      ratio,
    });
  }

  toggleWB() {
    this.setState({
      whiteBalance: wbOrder[this.state.whiteBalance],
    });
  }

  toggleFocus() {
    this.setState({
      autoFocus: this.state.autoFocus === 'on' ? 'off' : 'on',
    });
  }


  setFocusDepth(depth) {
    this.setState({
      depth,
    });
  }

  takePicture = async function() {
    if (this.camera && (this.state.signedIn || this.checkSignedIn())) {
      this.camera.takePictureAsync({base64: true}).then(data => {
        var today = new Date();
        var timestamp = today.getTime();
        var key = `${this.state.userId}id${timestamp}.jpeg`;
        var Buffer = require('buffer/').Buffer;
        var buf = new Buffer(data.base64, 'base64');
        var params = {
          Body: buf,
          Bucket: albumBucketName,
          Key: key,
          ContentEncoding: 'base64',
          ContentType: 'image/jpeg',
          ACL: 'public-read'
        }
        s3.putObject(params, function(err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else     console.log(data);           // successful response
        });
        this.updateDb(key);
      });
    }
  };

  takeSelfie = async function() {
    this.closeModal();
    if (this.camera && (this.state.signedIn || this.checkSignedIn())) {
      this.camera.takePictureAsync({base64: true}).then(data => {
        var today = new Date();
        var timestamp = today.getTime();
        var key = `self${this.state.userId}id${timestamp}.jpeg`;
        var Buffer = require('buffer/').Buffer;
        var buf = new Buffer(data.base64, 'base64');
        var params = {
          Body: buf,
          Bucket: albumBucketName,
          Key: key,
          ContentEncoding: 'base64',
          ContentType: 'image/jpeg',
          ACL: 'public-read'
        }
        s3.putObject(params, function(err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else     console.log(data);           // successful response
        });
        this.updateDb(key);
      });
    }
  };


  updateDb(keyname) {
    var params = {
      TableName: "userphotos",
      Key: { userid : `${this.state.userId}` },
      UpdateExpression: 'set #p = list_append (if_not_exists (#p, :empty_list), :my_value)',
      ExpressionAttributeNames: {'#p' : 'photos'},
      ExpressionAttributeValues: {
        ':empty_list' : [],
        ':my_value' : [keyname],
      }
    };
    dynamodb.update(params, function(err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        console.log("Updated item:", JSON.stringify(data, null, 2));
      }
    });
  }

  renderGallery() {
    return <GalleryScreen onPress={this.toggleView.bind(this)} />;
  }

  renderFlash() {
    if(this.state.flash == "off") {
      return(
          <Ionicons name="ios-flash-outline" size={32} color="white" />
      )
    } else {
      return(
          <Ionicons name="ios-flash" size={32} color="white" />
      )
    }
  }

  renderFlip() {
    if(this.state.type == "back") {
      return(
          <Ionicons name="ios-reverse-camera" size={32} color="white" />
      )
    } else {
      return(
          <Ionicons name="ios-reverse-camera-outline" size={32} color="white" />
      )
    }
  }

  openModal() {
    this.setState({visibleModal: true});
  }

  closeModal() {
    this.setState({visibleModal: false});
  }

  _renderModalContent = () => (
    <View style={styles.modalContent}>
      <Text style={styles.modalText}>Is this a photo of you? This photo will be used to determine what you look like.</Text>
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={this.takeSelfie.bind(this)}>
          <Text style={styles.modalText}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={this.closeModal.bind(this)}>
          <Text style={styles.modalText}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  renderCamera() {
    return (
      <Camera
        ref={ref => {
          this.camera = ref;
        }}
        style={{
          flex: 1,
        }}
        type={this.state.type}
        flashMode={this.state.flash}
        autoFocus={this.state.autoFocus}
        zoom={this.state.zoom}
        whiteBalance={this.state.whiteBalance}
        ratio={this.state.ratio}
        focusDepth={this.state.depth}>
        <View
          style={{
            backgroundColor: 'transparent',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={this.toggleFacing.bind(this)}>
            {this.renderFlip()}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={this.toggleFlash.bind(this)}>
            {this.renderFlash()}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.selfieButton,
            ]}
            onPress={this.openModal.bind(this)}>
            <Ionicons name="ios-contact" size={32} color="white" />
          </TouchableOpacity>
        </View>
        <View
          style={{
            backgroundColor: 'transparent',
            flexDirection: 'row',
            flex: 1,
          }}>
          <TouchableOpacity
            style={[
              styles.picButton,
            ]}
            onPress={this.takePicture.bind(this)}>
            <Text style={styles.flipText}> SNAP </Text>
          </TouchableOpacity>
          <Modal visible={this.state.visibleModal} style={styles.bottomModal} animationType="slide">
            {this._renderModalContent()}
          </Modal>
        </View>
      </Camera>
    );
  }

  render() {
    return (
      <View style={styles.container}>
        {this.state.showGallery ? this.renderGallery() : this.renderCamera()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'ivory',
  },
  navigation: {
    flex: 1,
  },
  gallery: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  flipButton: {
    height: 60,
    width: 60,
    marginTop: 10,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  item: {
    margin: 4,
    backgroundColor: 'indianred',
    height: 35,
    width: 80,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picButton: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height:65,

    backgroundColor: '#3498db',

    top: 490,
  },
  selfieButton: {
    height:60,
    width:60,
    justifyContent: 'center',
    borderRadius: 60,
    alignItems: 'center',
    marginTop: 10,
  },
  galleryButton: {
    backgroundColor: 'indianred',
  },
  row: {
    flexDirection: 'row',
  },
  modalButtons: {
    flexDirection: 'row',
    flex: 1,
    marginTop: 60,
    justifyContent: 'space-between',
  },
  modalButton: {
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 20,
    marginHorizontal: 30,
    height: 50,
  },
  bottomModal: {
    flex: 1,
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
   padding: 22,
   paddingTop: 100,
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
   backgroundColor: '#9b59b6',
 },
 modalText: {
   color: 'white',
   fontSize: 25,
 },

});
