import { Redirect } from 'expo-router';

export default function LegacyPaymentEntryRedirect() {
  return <Redirect href="/(tabs)/payments" />;
}
