import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { adminApi } from '@/api/endpoints';
import type { Client, ClientProvider, SortDir } from '@/api/types';
import { CellText, Pagination, Table, type Column } from '@/components/Table';
import {
  Badge,
  Button,
  Card,
  ClientTypeBadge,
  EmptyState,
  ErrorState,
  Field,
  Heading,
  Input,
  Loading,
  Muted,
  Row,
} from '@/components/ui';
import { formatCurrency, formatDate, formatNumber, formatRelative, formatTokens } from '@/format';
import { toggleSort, useSites } from '@/hooks/useAdminQuery';
import { space } from '@/theme';

export default function ClientsScreen() {
  const router = useRouter();
  const sites = useSites();
  const [q, setQ] = useState('');
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const [inactiveDays, setInactiveDays] = useState<number | undefined>(undefined);
  const [provider, setProvider] = useState<ClientProvider | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ sortBy: string; sortDir: SortDir }>({
    sortBy: 'last_wash_at',
    sortDir: 'desc',
  });

  const query = useQuery({
    queryKey: ['clients', { q, siteId, inactiveDays, provider, page, ...sort }],
    queryFn: () =>
      adminApi.listClients({
        q: q || undefined,
        site_id: siteId,
        inactive_days: inactiveDays,
        provider,
        page,
        page_size: 25,
        sort_by: sort.sortBy,
        sort_dir: sort.sortDir,
      }),
  });

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Cliente',
      width: 2.2,
      sortKey: 'name',
      render: (c) => (
        <View style={{ gap: 2 }}>
          <Row gap={space.xs} align="center">
            {/* An anonymous guest has no name or email of their own, so the fallbacks
                below show their uid -- the badge is what explains why. */}
            <CellText strong>{c.name || 'Sin nombre'}</CellText>
            <ClientTypeBadge isAnonymous={c.is_anonymous} />
          </Row>
          <CellText muted>{c.email || c.user_id}</CellText>
        </View>
      ),
    },
    {
      key: 'balance',
      header: 'Saldo',
      sortKey: 'balance_tokens',
      width: 1.2,
      align: 'right',
      render: (c) =>
        c.balance_tokens > 0 ? (
          <CellText strong>{formatTokens(c.balance_tokens)}</CellText>
        ) : (
          <Badge label="Sin fichas" tone="warning" />
        ),
    },
    {
      key: 'washes',
      header: 'Lavados',
      sortKey: 'total_washes',
      align: 'right',
      render: (c) => <CellText>{formatNumber(c.total_washes)}</CellText>,
    },
    {
      key: 'spent',
      header: 'Gastado',
      sortKey: 'total_spent_uyu',
      align: 'right',
      render: (c) => <CellText>{formatCurrency(c.total_spent_uyu)}</CellText>,
    },
    {
      key: 'site',
      header: 'Local habitual',
      width: 1.4,
      render: (c) => <CellText muted>{c.home_site?.name ?? '—'}</CellText>,
    },
    {
      key: 'created',
      header: 'Alta',
      sortKey: 'created_at',
      width: 1.2,
      align: 'right',
      // formatDate already renders '—' for null, which is the right thing here: the
      // date is unknown, not absent.
      render: (c) => <CellText muted>{formatDate(c.created_at)}</CellText>,
    },
    {
      key: 'last',
      header: 'Último lavado',
      sortKey: 'last_wash_at',
      width: 1.4,
      align: 'right',
      render: (c) => <CellText muted>{formatRelative(c.last_wash_at)}</CellText>,
    },
  ];

  const data = query.data;
  const resetPage = () => setPage(1);

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.xs }}>
        <Heading>Clientes</Heading>
        <Muted>Buscá por nombre o email para ver el saldo y cargar fichas.</Muted>
      </View>

      <Card>
        <Row gap={space.md} align="flex-end">
          <Field label="Buscar">
            <Input
              value={q}
              onChangeText={(v) => {
                setQ(v);
                resetPage();
              }}
              placeholder="Nombre o email"
              autoCapitalize="none"
            />
          </Field>
          <Field label="Local habitual">
            <Row gap={space.xs}>
              <FilterChip label="Todos" active={siteId === undefined} onPress={() => { setSiteId(undefined); resetPage(); }} />
              {(sites.data?.items ?? []).map((site) => (
                <FilterChip
                  key={site.id}
                  label={site.name}
                  active={siteId === site.id}
                  onPress={() => {
                    setSiteId(siteId === site.id ? undefined : site.id);
                    resetPage();
                  }}
                />
              ))}
            </Row>
          </Field>
          <Field label="Tipo">
            <Row gap={space.xs}>
              <FilterChip
                label="Todos"
                active={provider === undefined}
                onPress={() => { setProvider(undefined); resetPage(); }}
              />
              {(
                [
                  ['registered', 'Registrados'],
                  ['anonymous', 'Anónimos'],
                  // Rows not yet reconciled against Firebase. Surfaced rather than
                  // hidden so an operator can see how much is still unknown.
                  ['unknown', 'Sin dato'],
                ] as [ClientProvider, string][]
              ).map(([value, label]) => (
                <FilterChip
                  key={value}
                  label={label}
                  active={provider === value}
                  onPress={() => {
                    setProvider(provider === value ? undefined : value);
                    resetPage();
                  }}
                />
              ))}
            </Row>
          </Field>
          <Field label="Inactividad">
            <Row gap={space.xs}>
              {[30, 60, 90].map((days) => (
                <FilterChip
                  key={days}
                  label={`+${days} días`}
                  active={inactiveDays === days}
                  onPress={() => {
                    setInactiveDays(inactiveDays === days ? undefined : days);
                    resetPage();
                  }}
                />
              ))}
            </Row>
          </Field>
        </Row>
      </Card>

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Ningún cliente coincide" hint="Probá con otro término o quitá filtros." />
      ) : (
        <View>
          <Table
            columns={columns}
            rows={data.items}
            keyExtractor={(c) => c.user_id}
            onRowPress={(c) => router.push(`/clients/${encodeURIComponent(c.user_id)}`)}
            sortBy={sort.sortBy}
            sortDir={sort.sortDir}
            onSort={(key) => {
              setSort((current) => toggleSort(key, current));
              resetPage();
            }}
            minWidth={1040}
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

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return <Button title={label} variant={active ? 'primary' : 'secondary'} small onPress={onPress} />;
}
