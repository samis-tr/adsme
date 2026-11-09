import { Redirect } from 'expo-router';
import { useBrand } from '../features/brand/BrandProvider';

// "/" is the URL the dev client and cold starts open. Without this route
// Expo Router shows "Unmatched Route". Send users to the right first screen.
export default function Index() {
  const { brand } = useBrand();
  return <Redirect href={brand ? '/camera' : '/onboarding'} />;
}
