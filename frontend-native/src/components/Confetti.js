import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

export const Confetti = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      <ConfettiCannon
        count={200}
        origin={{ x: width / 2, y: -30 }} // Shoots from top center
        autoStart={true}
        fadeOut={true}
        fallSpeed={3000}
        explosionSpeed={350}
        colors={['#FCD34D', '#F87171', '#60A5FA', '#34D399', '#818CF8']} // Aesthetic palette
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999, // Ensures it sits on top of all other content
    elevation: 999, // Android support
  },
});