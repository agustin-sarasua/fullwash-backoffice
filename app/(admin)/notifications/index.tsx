import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { adminApi } from '@/api/endpoints';
import type { SegmentFilter } from '@/api/types';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Heading,
  Input,
  Loading,
  Muted,
  Row,
} from '@/components/ui';
import { formatNumber, formatRelative } from '@/format';
import { useSites } from '@/hooks/useAdminQuery';
import { colors, font, radius, space, weight } from '@/theme';

const INACTIVITY_OPTIONS = [30, 60, 90] as const;
const BALANCE_OPTIONS = [
  { label: 'Sin fichas', value: 0 },
  { label: '2 o menos', value: 2 },
] as const;
const SPEND_OPTIONS = [
  { label: 'Más de $2.000', value: 2000 },
  { label: 'Más de $5.000', value: 5000 },
] as const;

export default function ComposeScreen() {
  const router = useRouter();
  const sites = useSites();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [siteIds, setSiteIds] = useState<number[]>([]);
  const [inactiveDays, setInactiveDays] = useState<number | null>(null);
  const [maxBalance, setMaxBalance] = useState<number | null>(null);
  const [minSpent, setMinSpent] = useState<number | null>(null);

  const segment = useMemo<SegmentFilter>(() => {
    const filter: SegmentFilter = { has_push_token: true };
    if (siteIds.length) filter.site_ids = siteIds;
    if (inactiveDays !== null) filter.inactive_days = inactiveDays;
    if (maxBalance !== null) filter.max_balance_tokens = maxBalance;
    if (minSpent !== null) filter.min_total_spent_uyu = minSpent;
    // The API refuses a segment with no narrowing filter unless this is explicit, so
    // that "message everybody" is always a decision rather than an empty form.
    if (
      !filter.site_ids &&
      filter.inactive_days === undefined &&
      filter.max_balance_tokens === undefined &&
      filter.min_total_spent_uyu === undefined
    ) {
      filter.match_all = true;
    }
    return filter;
  }, [siteIds, inactiveDays, maxBalance, minSpent]);

  const preview = useQuery({
    queryKey: ['audience', segment],
    queryFn: () => adminApi.previewAudience(segment),
  });

  const send = useMutation({
    mutationFn: (dryRun: boolean) =>
      adminApi.createCampaign({ title: title.trim(), body: body.trim(), segment, dry_run: dryRun }),
    onSuccess: (campaign) => {
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      router.push(`/notifications/${campaign.id}`);
    },
  });

  const isBroadcast = segment.match_all === true;
  const reachable = preview.data?.reachable_users ?? 0;
  const canSend = title.trim().length > 0 && body.trim().length > 0 && reachable > 0;

  const toggleSite = (id: number) =>
    setSiteIds((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );

  return (
    <View style={{ gap: space.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: space.xs }}>
          <Heading>Notificaciones</Heading>
          <Muted>Segmentá y mandá un push para motivar a los clientes a volver.</Muted>
        </View>
        <Button
          title="Ver campañas"
          variant="secondary"
          onPress={() => router.push('/notifications/campaigns')}
        />
      </Row>

      <Card>
        <Heading level={3}>1. A quién</Heading>

        <Field label="Local habitual" hint="Dónde lava el cliente la mayoría de las veces (últimos 90 días).">
          <Row gap={space.xs}>
            {(sites.data?.items ?? []).map((site) => (
              <Button
                key={site.id}
                title={site.name}
                variant={siteIds.includes(site.id) ? 'primary' : 'secondary'}
                small
                onPress={() => toggleSite(site.id)}
              />
            ))}
            {sites.data?.items.length === 0 ? (
              <Muted>Creá locales y asigná máquinas para segmentar por ubicación.</Muted>
            ) : null}
          </Row>
        </Field>

        <Field label="Inactividad" hint="Incluye a quienes nunca lavaron.">
          <Row gap={space.xs}>
            {INACTIVITY_OPTIONS.map((days) => (
              <Button
                key={days}
                title={`Sin lavar +${days} días`}
                variant={inactiveDays === days ? 'primary' : 'secondary'}
                small
                onPress={() => setInactiveDays(inactiveDays === days ? null : days)}
              />
            ))}
          </Row>
        </Field>

        <Field label="Saldo">
          <Row gap={space.xs}>
            {BALANCE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                title={option.label}
                variant={maxBalance === option.value ? 'primary' : 'secondary'}
                small
                onPress={() => setMaxBalance(maxBalance === option.value ? null : option.value)}
              />
            ))}
          </Row>
        </Field>

        <Field label="Gasto histórico">
          <Row gap={space.xs}>
            {SPEND_OPTIONS.map((option) => (
              <Button
                key={option.value}
                title={option.label}
                variant={minSpent === option.value ? 'primary' : 'secondary'}
                small
                onPress={() => setMinSpent(minSpent === option.value ? null : option.value)}
              />
            ))}
          </Row>
        </Field>
      </Card>

      <Card>
        <Heading level={3}>2. Alcance</Heading>
        {preview.isLoading ? (
          <Loading label="Calculando audiencia…" />
        ) : preview.isError ? (
          <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
        ) : preview.data ? (
          <>
            <Row gap={space.xl}>
              <Stat label="Clientes alcanzables" value={formatNumber(preview.data.reachable_users)} emphasis />
              <Stat label="Coinciden con el filtro" value={formatNumber(preview.data.matched_users)} />
              <Stat label="Dispositivos" value={formatNumber(preview.data.target_device_count)} />
            </Row>
            {isBroadcast ? (
              <Badge label="Sin filtros: va a todos los clientes con la app" tone="warning" />
            ) : null}
            {preview.data.matched_users > preview.data.reachable_users ? (
              <Muted>
                {preview.data.matched_users - preview.data.reachable_users} cliente(s)
                coinciden pero no tienen la app instalada, así que no recibirán el mensaje.
              </Muted>
            ) : null}
            {preview.data.sample.length > 0 ? (
              <View style={{ gap: space.xs }}>
                <Muted>Algunos de los que lo van a recibir:</Muted>
                {preview.data.sample.slice(0, 5).map((client) => (
                  <Text key={client.user_id} style={s.sampleRow}>
                    {client.name || client.email || client.user_id}
                    <Text style={s.sampleMeta}>
                      {'  ·  '}
                      {client.home_site?.name ?? 'sin local'} · último lavado{' '}
                      {formatRelative(client.last_wash_at).toLowerCase()}
                    </Text>
                  </Text>
                ))}
              </View>
            ) : null}
            <Muted>
              El alcance es orientativo: la audiencia se vuelve a calcular al enviar.
            </Muted>
          </>
        ) : null}
      </Card>

      <Card>
        <Heading level={3}>3. Mensaje</Heading>
        <Field label="Título" hint={`${title.length}/80`}>
          <Input value={title} onChangeText={setTitle} maxLength={80} placeholder="¡Te extrañamos!" />
        </Field>
        <Field label="Texto" hint={`${body.length}/240`}>
          <Input
            value={body}
            onChangeText={setBody}
            maxLength={240}
            multiline
            placeholder="Volvé esta semana y llevate 20% off en tu próxima carga de fichas."
          />
        </Field>

        {title || body ? (
          <View style={s.phone}>
            <Text style={s.phoneApp}>FullWash · ahora</Text>
            <Text style={s.phoneTitle}>{title || 'Título'}</Text>
            <Text style={s.phoneBody}>{body || 'Texto de la notificación'}</Text>
          </View>
        ) : null}

        {send.isError ? <Text style={s.error}>{(send.error as Error).message}</Text> : null}

        <Row gap={space.sm}>
          <Button
            title={`Enviar a ${formatNumber(reachable)} cliente(s)`}
            loading={send.isPending}
            disabled={!canSend}
            onPress={() => send.mutate(false)}
          />
          <Button
            title="Prueba (no entrega)"
            variant="secondary"
            disabled={!canSend || send.isPending}
            onPress={() => send.mutate(true)}
          />
        </Row>
        {reachable === 0 && !preview.isLoading ? (
          <Muted>Ningún cliente alcanzable con estos filtros.</Muted>
        ) : null}
      </Card>
    </View>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={{ gap: 2, minWidth: 120 }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, emphasis && { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  statLabel: { fontSize: font.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: font.xxl, fontWeight: weight.bold, color: colors.text },
  sampleRow: { fontSize: font.sm, color: colors.text },
  sampleMeta: { color: colors.textSubtle, fontSize: font.xs },
  phone: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 420,
  },
  phoneApp: { fontSize: font.xs, color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.6 },
  phoneTitle: { fontSize: font.md, fontWeight: weight.semibold, color: colors.text },
  phoneBody: { fontSize: font.sm, color: colors.textMuted },
  error: { color: colors.danger, fontSize: font.sm },
});
