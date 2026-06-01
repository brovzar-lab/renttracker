import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function DemoBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Demo Mode</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
  },
  text: { color: Colors.background, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
