import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

const Index = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.homeScreen}>
        <StatusBar hidden={true} />
        <View style={styles.bg}>
          <Text>Hello world!</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default Index;

const styles = StyleSheet.create({
  homeScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
});
