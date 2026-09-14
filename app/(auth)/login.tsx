import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { APP_ENV } from '@/api/config';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Card, Field, Heading, Input, Muted } from '@/components/ui';
import { colors, font, space, weight } from '@/theme';

export default function Login() {
  const { signIn, user, isAdmin, loading, error, configured, signOutNow } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && isAdmin) return <Redirect href="/machines" />;

  if (!configured) {
    return (
      <View style={s.page}>
        <Card style={{ maxWidth: 460 }}>
          <Heading level={2}>Falta configurar Firebase</Heading>
          <Muted>
            Registrá una app Web en el proyecto full-wash y completá las variables
            EXPO_PUBLIC_FIREBASE_* (ver .env.example). Hoy sólo están registradas las
            apps de iOS y Android.
          </Muted>
        </Card>
      </View>
    );
  }

  // Signed in, but the account has no admin claim. This is the single most confusing
  // state in the product, so it says exactly what to do about it.
  if (user && isAdmin === false) {
    return (
      <View style={s.page}>
        <Card style={{ maxWidth: 460 }}>
          <Heading level={2}>Esta cuenta no es de administrador</Heading>
          <Muted>
            {user.email} no tiene el permiso de administrador. Pedí que te lo otorguen
            con scripts/grant_admin.py y volvé a iniciar sesión.
          </Muted>
          <Button title="Cerrar sesión" variant="secondary" onPress={() => void signOutNow()} />
        </Card>
      </View>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // Message is surfaced through the provider's `error`.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Card style={{ maxWidth: 400, width: '100%' }}>
        <View style={{ gap: space.xs }}>
          <Text style={s.brand}>FullWash</Text>
          <Heading level={2}>Backoffice</Heading>
          {APP_ENV !== 'prod' ? <Muted>Entorno: {APP_ENV}</Muted> : null}
        </View>

        <Field label="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="vos@fullwash.uy"
            onSubmitEditing={submit}
          />
        </Field>
        <Field label="Contraseña" error={error}>
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            placeholder="••••••••"
            onSubmitEditing={submit}
          />
        </Field>

        <Button
          title="Ingresar"
          onPress={submit}
          loading={submitting || loading}
          disabled={!email || !password}
        />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  brand: { color: colors.primary, fontWeight: weight.bold, fontSize: font.sm, letterSpacing: 1.2 },
});
