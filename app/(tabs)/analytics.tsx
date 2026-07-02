import { Redirect } from 'expo-router';

export default function LegacyAnalyticsRedirect() {
  return <Redirect href="/(tabs)/streak" />;
}
