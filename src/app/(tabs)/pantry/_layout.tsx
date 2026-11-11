import { Stack } from 'expo-router';
import { useTabStackOptions } from '../../../navigation/screenOptions';

export default function Layout() {
  const options = useTabStackOptions('grouped');
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Pantry' }} />
    </Stack>
  );
}
