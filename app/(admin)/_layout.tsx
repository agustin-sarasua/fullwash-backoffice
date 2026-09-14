import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';

import { APP_ENV } from '@/api/config';
import { useAuth } from '@/auth/AuthProvider';
import { Loading, Muted } from '@/components/ui';
import { BREAKPOINT_WIDE, colors, font, radius, space, weight } from '@/theme';

const NAV = [
  { href: '/machines', label: 'Máquinas', match: '/machines' },
  { href: '/sites', label: 'Locales', match: '/sites' },
  { href: '/clients', label: 'Clientes', match: '/clients' },
  { href: '/notifications', label: 'Notificaciones', match: '/notifications' },
] as const;

export default function AdminLayout() {
  const { user, isAdmin, loading, signOutNow } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const wide = width >= BREAKPOINT_WIDE;

  if (loading) return <Loading label="Verificando sesión…" />;
  if (!user || isAdmin !== true) return <Redirect href="/login" />;

  const nav = (
    <View style={[s.nav, wide ? s.navWide : s.navNarrow]}>
      {NAV.map((item) => {
        const active = pathname.startsWith(item.match);
        return (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href)}
            style={[s.navItem, active && s.navItemActive]}
            accessibilityRole="link"
          >
            <Text style={[s.navText, active && s.navTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[s.shell, wide && { flexDirection: 'row' }]}>
      <View style={[s.sidebar, wide ? s.sidebarWide : s.sidebarNarrow]}>
        <View style={wide ? { gap: space.xs } : { gap: 2 }}>
          <Text style={s.brand}>FULLWASH</Text>
          {!wide ? null : <Text style={s.brandSub}>Backoffice</Text>}
          {APP_ENV !== 'prod' ? <Muted>{APP_ENV}</Muted> : null}
        </View>
        {nav}
        {wide ? (
          <View style={s.sidebarFooter}>
            <Muted>{user.email}</Muted>
            <Pressable onPress={() => void signOutNow()}>
              <Text style={s.signOut}>Cerrar sesión</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => void signOutNow()}>
            <Text style={s.signOut}>Salir</Text>
          </Pressable>
        )}
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        <Slot />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  sidebar: { backgroundColor: colors.surface, borderColor: colors.border },
  sidebarWide: {
    width: 220,
    borderRightWidth: 1,
    padding: space.lg,
    gap: space.xl,
    justifyContent: 'flex-start',
  },
  sidebarNarrow: {
    borderBottomWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
  },
  sidebarFooter: { marginTop: 'auto', gap: space.xs },
  brand: { color: colors.primary, fontWeight: weight.bold, fontSize: font.sm, letterSpacing: 1.4 },
  brandSub: { color: colors.text, fontWeight: weight.semibold, fontSize: font.lg },
  nav: { gap: space.xs },
  navWide: { flexDirection: 'column' },
  navNarrow: { flexDirection: 'row', flexWrap: 'wrap' },
  navItem: { paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.md },
  navItemActive: { backgroundColor: colors.primarySubtle },
  navText: { color: colors.textMuted, fontSize: font.md, fontWeight: weight.medium },
  navTextActive: { color: colors.primary, fontWeight: weight.semibold },
  signOut: { color: colors.textMuted, fontSize: font.sm, textDecorationLine: 'underline' },
  content: { flex: 1 },
  contentInner: { padding: space.xl, gap: space.lg, maxWidth: 1280, width: '100%' },
});
