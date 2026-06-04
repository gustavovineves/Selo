import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: verificar token salvo e redirecionar para (app) ou (auth)
  return <Redirect href="/(auth)/login" />;
}
