import { Redirect } from 'expo-router';
import { useAuth } from '@pocketpilot/services/src/react';
import { BootScreen } from '@/components/boot-screen';

export default function IndexScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return <BootScreen />;
  }

  return <Redirect href={user ? '/(app)/(tabs)/dashboard' : '/(auth)/signin'} />;
}
