import { Redirect } from 'expo-router';

export default function LegacyTenantRightsRedirect() {
  return <Redirect href="/(tabs)/" />;
}
