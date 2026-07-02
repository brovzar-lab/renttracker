import { Redirect } from 'expo-router';

export default function LegacyDocumentUploadRedirect() {
  return <Redirect href="/(tabs)/payments" />;
}
