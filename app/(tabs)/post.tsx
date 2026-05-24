import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '../../constants/theme';

export default function PostScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/post/new');
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: colors.parchment }} />;
}
