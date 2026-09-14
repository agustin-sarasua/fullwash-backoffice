import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { adminApi } from '@/api/endpoints';
import type { Recipient } from '@/api/types';
import { CellText, Pagination, Table, type Column } from '@/components/Table';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Heading,
  Loading,
  Muted,
  Row,
} from '@/components/ui';
import { formatDateTime, formatNumber } from '@/format';
import { colors, font, space, weight } from '@/theme';

const RECIPIENT_LABEL: Record<string, string> = {
  SENT: 'Entregada',
  FAILED: 'Falló',
  UNREGISTERED: 'App desinstalada',
};

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaignId = Number(id);
  const router = useRouter();
  const [page, setPage] = useState(1);

  const campaign = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => adminApi.getCampaign(campaignId),
    refetchInterval: (q) =>
      q.state.data?.status === 'QUEUED' || q.state.data?.status === 'SENDING' ? 2000 : false,
  });

  const recipients = useQuery({
    queryKey: ['campaign-recipients', campaignId, page],
    queryFn: () => adminApi.listRecipients(campaignId, { page, page_size: 25 }),
    enabled: campaign.data?.status !== 'QUEUED',
  });

  if (campaign.isLoading) return <Loading />;
  if (campaign.isError) return <ErrorState error={campaign.error} onRetry={() => void campaign.refetch()} />;
  const data = campaign.data;
  if (!data) return null;

  const columns: Column<Recipient>[] = [
    { key: 'user', header: 'Cliente', width: 2, render: (r) => <CellText>{r.user_id}</CellText> },
    {
      key: 'status',
      header: 'Resultado',
      render: (r) => (
        <Badge
          label={RECIPIENT_LABEL[r.status] ?? r.status}
          tone={r.status === 'SENT' ? 'success' : r.status === 'UNREGISTERED' ? 'neutral' : 'danger'}
        />
      ),
    },
    {
      key: 'error',
      header: 'Detalle',
      render: (r) => <CellText muted>{r.error_code ?? '—'}</CellText>,
    },
    {
      key: 'device',
      header: 'Dispositivo',
      align: 'right',
      render: (r) => <CellText muted>…{r.token_suffix ?? ''}</CellText>,
    },
  ];

  return (
    <View style={{ gap: space.lg }}>
      <Button
        title="← Volver a campañas"
        variant="ghost"
        small
        onPress={() => router.push('/notifications/campaigns')}
      />

      <View style={{ gap: space.xs }}>
        <Heading>{data.title}</Heading>
        <Muted>{data.body}</Muted>
        <Row gap={space.sm}>
          <Badge
            label={data.status}
            tone={data.status === 'SENT' ? 'success' : data.status === 'FAILED' ? 'danger' : 'info'}
          />
          {data.dry_run ? <Badge label="Prueba · no se entregó" tone="neutral" /> : null}
        </Row>
      </View>

      <Card>
        <Row gap={space.xl}>
          <Stat label="Entregadas" value={formatNumber(data.success_count)} emphasis />
          <Stat label="Fallaron" value={formatNumber(data.failure_count)} />
          <Stat
            label="App desinstalada"
            value={formatNumber(data.invalidated_token_count)}
            hint="Dispositivos dados de baja"
          />
          <Stat label="Dispositivos" value={formatNumber(data.target_device_count)} />
          <Stat label="Clientes" value={formatNumber(data.audience_user_count)} />
        </Row>
        <Muted>
          Creada {formatDateTime(data.created_at)} por {data.created_by_email ?? data.created_by_uid}
          {data.finished_at ? ` · finalizada ${formatDateTime(data.finished_at)}` : ''}
        </Muted>
        {data.error ? <Text style={s.error}>{data.error}</Text> : null}
      </Card>

      {data.segment ? (
        <Card>
          <Heading level={3}>Segmento</Heading>
          {describeSegment(data.segment).map((line) => (
            <Muted key={line}>• {line}</Muted>
          ))}
        </Card>
      ) : null}

      {data.status === 'QUEUED' ? (
        <Muted>En cola. Actualizando…</Muted>
      ) : recipients.isLoading ? (
        <Loading />
      ) : recipients.data && recipients.data.items.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Heading level={3}>Destinatarios</Heading>
          <Table
            columns={columns}
            rows={recipients.data.items}
            keyExtractor={(r) => String(r.id)}
            minWidth={680}
          />
          <Pagination
            page={recipients.data.page}
            totalPages={recipients.data.total_pages}
            total={recipients.data.total}
            onChange={setPage}
          />
        </View>
      ) : null}
    </View>
  );
}

function describeSegment(segment: NonNullable<import('@/api/types').CampaignDetail['segment']>): string[] {
  const lines: string[] = [];
  if (segment.match_all) lines.push('Todos los clientes con la app instalada');
  if (segment.site_ids?.length) lines.push(`Local habitual: ${segment.site_ids.join(', ')}`);
  if (segment.inactive_days) lines.push(`Sin lavar hace más de ${segment.inactive_days} días`);
  if (segment.max_balance_tokens !== null && segment.max_balance_tokens !== undefined) {
    lines.push(`Saldo de ${segment.max_balance_tokens} fichas o menos`);
  }
  if (segment.min_total_spent_uyu) lines.push(`Gastó más de $${segment.min_total_spent_uyu}`);
  if (segment.user_ids?.length) lines.push(`${segment.user_ids.length} cliente(s) elegidos a mano`);
  return lines.length ? lines : ['Sin filtros'];
}

function Stat({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <View style={{ gap: 2, minWidth: 110 }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, emphasis && { color: colors.primary }]}>{value}</Text>
      {hint ? <Text style={s.statHint}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  statLabel: { fontSize: font.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: font.xl, fontWeight: weight.bold, color: colors.text },
  statHint: { fontSize: font.xs, color: colors.textSubtle },
  error: { color: colors.danger, fontSize: font.sm },
});
