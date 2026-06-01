import { Platform } from 'react-native';

export interface RCPackage {
  identifier: string;
  packageType: string;
  priceString: string;
  _native: unknown;
}

function getPurchases() {
  // react-native-purchases requires a custom dev client / EAS build
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-purchases').default;
}

export function configurePurchases(): void {
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? ''
      : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '';

  if (!apiKey || apiKey === 'REPLACE_WITH_VALUE') return;

  try {
    getPurchases().configure({ apiKey });
  } catch (e) {
    console.warn('[RevenueCat] configure failed:', e);
  }
}

export async function loginPurchases(uid: string): Promise<void> {
  try {
    await getPurchases().logIn(uid);
  } catch (e) {
    console.warn('[RevenueCat] logIn failed:', e);
  }
}

export async function getOfferings(): Promise<RCPackage[]> {
  try {
    const offerings = await getPurchases().getOfferings();
    const available = offerings.current?.availablePackages ?? [];
    return available.map(
      (pkg: { identifier: string; packageType: string; product: { priceString: string } }) => ({
        identifier: pkg.identifier,
        packageType: pkg.packageType,
        priceString: pkg.product.priceString,
        _native: pkg,
      })
    );
  } catch (e) {
    console.warn('[RevenueCat] getOfferings failed:', e);
    return [];
  }
}

export async function purchasePackage(pkg: RCPackage): Promise<boolean> {
  const { customerInfo } = await getPurchases().purchasePackage(pkg._native);
  return Object.keys(customerInfo.entitlements.active).length > 0;
}

export async function restorePurchases(): Promise<boolean> {
  const { customerInfo } = await getPurchases().restorePurchases();
  return Object.keys(customerInfo.entitlements.active).length > 0;
}

export async function checkProEntitlement(): Promise<boolean> {
  try {
    const { customerInfo } = await getPurchases().getCustomerInfo();
    return 'pro' in customerInfo.entitlements.active;
  } catch {
    return false;
  }
}
