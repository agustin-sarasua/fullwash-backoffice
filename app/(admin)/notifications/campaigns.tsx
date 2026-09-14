import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { adminApi } from '@/api/endpoints';
import type { Campaign } from '@/api/types';
import { CellText, Pagination, Table, type Column } from '@/components/Table';
import { Badge, Button, EmptyState, ErrorState, Heading, Loading, Muted, Row } from '@/components/ui';
import { formatDateTime, formatNumber } from '@/format';
import { space } from '@/theme';

const STATUS_TONE = {
  SENT: 'success',
  PARTIAL: 'warning',
  FAILED: 'danger',
  SENDING: 'info',
  QUEUED: 'neutral',
} as const;

const STATUS_LABEL = {
  SENT: 'Enviada',
  PARTIAL: 'Parcial',
  FAILED: 'Falló',
  SENDING: 'Enviando',
  QUEUED: 'En cola',
} as const;

export default function CampaignsScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['campaigns', page],
    queryFn: () => adminApi.listCampaigns({ page, page_size: 25 }),
    // A queued campaign moves to SENT within seconds; without this the list looks stuck.
    refetchInterval: (q) =>
      q.state.data?.items.some((c) => c.status === 'QUEUED' || c.status === 'SENDING')
        ? 3000
        : false,
  });

  const columns: Column<Campaign>[] = [
    {
      key: 'title',
      header: 'Campaña',
      width: 2.4,
      render: (c) => (
        <View style={{ gap: 2 }}>
          <CellText strong>{c.title}</CellText>
          <CellText muted>{c.body}</CellText>
        </View>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => (
        <Row gap={4} wrap={false}>
          <Badge label={STATUS_LABEL[c.status] ?? c.status} tone={STATUS_TONE[c.status] ?? 'neutral'} />
          {c.dry_run ? <Badge label="Prueba" tone="neutral" /> : null}
        </Row>
      ),
    },
    {
      key: 'sent',
      header: 'Entregadas',
      align: 'right',
      render: (c) => <CellText strong>{formatNumber(c.success_count)}</CellText>,
    },
    {
      key: 'devices',
      header: 'Dispositivos',
      align: 'right',
      render: (c) => <CellText muted>{formatNumber(c.target_device_count)}</CellText>,
    },
    {
      key: 'when',
      header: 'Fecha',
      width: 1.3,
      align: 'right',
      render: (c) => <CellText muted>{formatDateTime(c.created_at)}</CellText>,
    },
  ];

  const data = query.data;

  return (
    <View style={{ gap: space.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Heading>Campañas</Heading>
        <Button title="Nueva campaña" onPress={() => router.push('/notifications')} />
      </Row>

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Todavía no enviaste ninguna campaña" hint="Creá una para empezar." />
      ) : (
        <View>
          <Table
            columns={columns}
            rows={data.items}
            keyExtractor={(c) => String(c.id)}
            onRowPress={(c) => router.push(`/notifications/${c.id}`)}
            minWidth={820}
          />
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            total={data.total}
            onChange={setPage}
          />
        </View>
      )}
    </View>
  );
}
