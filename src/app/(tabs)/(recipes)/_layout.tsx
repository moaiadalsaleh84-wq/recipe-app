import { Stack } from 'expo-router';
import { useTabStackOptions } from '../../../navigation/screenOptions';

export default function Layout() {
  const options = useTabStackOptions('plain');
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Recipes' }} />
    </Stack>
  );
}
