import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  Button,
  Alert,
  AsyncStorage,
} from 'react-native';
import { Constants, Facebook } from 'expo';

export default class SettingsScreen extends React.Component {
  static navigationOptions = {
    title: 'Settings',
  };
  state = {
    fbTokenExpires: '0',
    text: 'userName',
    fbToken: '0',
    userId: '0',
    userName: 'Null',
    signedIn: false,
  };


  componentDidMount() {
    this.handleSignedIn();
  }

  handleSignedIn = async () => {
    try {
      var fbToken = "";
      var exp = "0";
      var uid = "";
      var name = "";


      await AsyncStorage.multiGet(['fbToken', 'fbTokenExpires', 'userId', 'userName'], (err, stores) => {
        stores.map((result, i, store) => {
          // get at each store's key/value so you can work with it
          var value = store[i][1];
          if (i == 0) {
            fbToken = value;
          } else if (i == 1) {
            exp = (parseInt(value) * 1000).toString();
          } else if (i == 2) {
            uid = value;
          } else if (i == 3) {
            name = value;
          }
        });
      });
      var loggedIn = true;
      var today = new Date();
      var now = today.getTime();
      if (now > exp) {
        // console.log(now);
        // console.log(exp);
        // If the current time is after the expiration date of the facbeook
        // token, need to sign in again
        loggedIn = false;
        console.log("NOT SIGNED IN SETTINGS PAGE");
      }

      this.setState({
        text: 'userName',
        fbToken: fbToken,
        fbTokenExpires: exp,
        userId: uid,
        userName: name,
        signedIn: loggedIn,
      });
      // console.log(`THE SIGN IN STATE IS ${loggedIn}`);
      // console.log(`NAME IS ${name}`);
    } catch (error) {
      // Login Outdated. Try to log in to facebook again
      console.log(error);
      console.log("THERE WAS NO FACEBOOK DATA, ADDING IT NOW");
      this.setState ({
        fbTokenExpires: '0',
        text: 'userName',
        fbToken: '0',
        userId: '0',
        userName: 'Null',
        signedIn: false,
      });
    }
  }

  _handleFacebookLogin = async () => {
    try {
      const { type, token, expires } = await Facebook.logInWithReadPermissionsAsync(
        '', // Replace with your own app id in standalone app
        { permissions: ['public_profile'] }
      );

      switch (type) {
        case 'success': {
          // Get the user's name using Facebook's Graph API
          const response = await fetch(`https://graph.facebook.com/me?access_token=${token}`);
          const profile = await response.json();
          // console.log("TOKEN");
          // console.log(token);
          // console.log(expires);
          try {
            //await AsyncStorage.setItem('@MySuperStore:key', 'I like to save it.');
            var exp = (parseInt(expires) * 1000).toString();
            await AsyncStorage.multiSet([['fbToken', token.toString()], ['fbTokenExpires', exp], ['userId', profile.id.toString()], ['userName', profile.name.toString()]]);
            this.setState({
              signedIn: true,
              fbToken: token.toString(),
              fbTokenExpires: exp,
              userId: profile.id.toString(),
              userName: profile.name.toString(),
            });
          } catch (error) {
            console.log(error)
            console.log("ERROR SAVING DATA")
          }
          Alert.alert(
            'Logged in!',
            `Hi ${profile.name}!`,
          );
          break;
        }
        case 'cancel': {
          Alert.alert(
            'Cancelled!',
            'Login was cancelled!',
          );
          break;
        }
        default: {
          Alert.alert(
            'Oops!',
            'Login failed!',
          );
        }
      }
    } catch (e) {
      Alert.alert(
        'Oops!',
        'Login failed!',
      );
    }
  };

  handleFacebookSignout = async () => {
    try {
      await AsyncStorage.multiSet([['fbToken', ""], ['fbTokenExpires', "0"], ['userId', ""], ['userName', ""]]);
      this.setState({
        signedIn: false,
        fbToken: "",
        fbTokenExpires: "0",
        userId: "",
        userName: "",
      });
    } catch (error) {
      console.log(error)
      console.log("ERROR SIGNING OUT")
    }
  };

  render() {
    return (
      <ScrollView style={styles.container}>
        {this.state.signedIn ? this.renderFbInfo() : this.renderFbButton()}
      </ScrollView>
    );
  }


  renderFbButton() {
    return (
        <Button
          title="Login with Facebook"
          onPress={this._handleFacebookLogin}
          style={styles.button}
        />
    );
  }



  renderFbInfo() {
    let timestamp = this.state.fbTokenExpires;
    // We have facebook information and the token is not expired
    var expDate = new Date();
    expDate.setTime(timestamp);
    let day = expDate.getDate();
    let month = expDate.getMonth() + 1;
    let name = this.state.userName;
    return (
      <View>
        <View style={styles.nameText}>
          <Text style={styles.text}>Name: {name}</Text>
        </View>
        <View style={styles.inText}>
          <Text style={styles.text}>Signed In Until {month}/{day}</Text>
        </View>

        <Button
          title="Sign Out Of Facebook"
          onPress={this.handleFacebookSignout}
          style={styles.button}
        />
      </View>
    );
  }


}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#ededed',
    height: 40,
    paddingHorizontal: 20,
  },
  button: {
    marginTop: 50,
  },
  nameText: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height:65,
    backgroundColor: '#3498db',
  },
  inText: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height:65,
    backgroundColor: '#8e44ad',
  },
})
