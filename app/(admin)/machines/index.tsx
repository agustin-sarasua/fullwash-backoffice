import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { adminApi } from '@/api/endpoints';
import type { Machine, SortDir } from '@/api/types';
import { CellText, Pagination, Table, type Column } from '@/components/Table';
import { Badge, Card, EmptyState, ErrorState, Field, Heading, Input, Loading, Muted, Row } from '@/components/ui';
import { currentPeriod, formatCurrency, formatNumber, formatRelative, periodLabel, recentPeriods } from '@/format';
import { toggleSort } from '@/hooks/useAdminQuery';
import { colors, font, radius, space, weight } from '@/theme';

export default function MachinesScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [onlyNeedsSetup, setOnlyNeedsSetup] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ sortBy: string; sortDir: SortDir }>({
    sortBy: 'tokens_consumed',
    sortDir: 'desc',
  });

  const query = useQuery({
    queryKey: ['machines', { q, period, onlyNeedsSetup, page, ...sort }],
    queryFn: () =>
      adminApi.listMachines({
        q: q || undefined,
        period,
        provisioned: onlyNeedsSetup ? false : undefined,
        page,
        page_size: 25,
        sort_by: sort.sortBy,
        sort_dir: sort.sortDir,
      }),
  });

  const columns: Column<Machine>[] = [
    {
      key: 'name',
      header: 'Máquina',
      width: 2,
      sortKey: 'name',
      render: (m) => (
        <View style={{ gap: 2 }}>
          <CellText strong>{m.name}</CellText>
          <CellText muted>#{m.id}</CellText>
        </View>
      ),
    },
    {
      key: 'site',
      header: 'Local',
      width: 1.5,
      render: (m) =>
        m.site ? (
          <CellText>{m.site.name}</CellText>
        ) : (
          <Badge label="Sin asignar" tone="warning" />
        ),
    },
    {
      key: 'washes',
      header: 'Lavados',
      sortKey: 'wash_count',
      align: 'right',
      render: (m) => <CellText strong>{formatNumber(m.metrics.wash_count)}</CellText>,
    },
    {
      key: 'tokens',
      header: 'Fichas',
      sortKey: 'tokens_consumed',
      align: 'right',
      render: (m) => <CellText>{formatNumber(m.metrics.tokens_consumed)}</CellText>,
    },
    {
      key: 'users',
      header: 'Clientes',
      sortKey: 'unique_users',
      align: 'right',
      render: (m) => <CellText>{formatNumber(m.metrics.unique_users)}</CellText>,
    },
    {
      key: 'revenue',
      header: 'Ingreso est.',
      align: 'right',
      render: (m) => <CellText>{formatCurrency(m.metrics.estimated_revenue_uyu)}</CellText>,
    },
    {
      key: 'last',
      header: 'Último lavado',
      sortKey: 'last_wash_at',
      align: 'right',
      render: (m) => <CellText muted>{formatRelative(m.metrics.last_wash_at)}</CellText>,
    },
  ];

  const data = query.data;

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.xs }}>
        <Heading>Máquinas</Heading>
        <Muted>Actividad de {periodLabel(period)}</Muted>
      </View>

      <Card>
        <Row gap={space.md} align="flex-end">
          <Field label="Buscar">
            <Input
              value={q}
              onChangeText={(value) => {
                setQ(value);
                setPage(1);
              }}
              placeholder="Nombre o número"
            />
          </Field>
          <Field label="Mes">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Row gap={space.xs} wrap={false}>
                {recentPeriods(12).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => {
                      setPeriod(p);
                      setPage(1);
                    }}
                    style={[s.chip, period === p && s.chipActive]}
                  >
                    <Text style={[s.chipText, period === p && s.chipTextActive]}>
                      {periodLabel(p)}
                    </Text>
                  </Pressable>
                ))}
              </Row>
            </ScrollView>
          </Field>
        </Row>
        <Pressable
          onPress={() => {
            setOnlyNeedsSetup((v) => !v);
            setPage(1);
          }}
          style={[s.chip, onlyNeedsSetup && s.chipActive, { alignSelf: 'flex-start' }]}
        >
          <Text style={[s.chipText, onlyNeedsSetup && s.chipTextActive]}>
            Sólo pendientes de configurar
          </Text>
        </Pressable>
        {/* Machines auto-register themselves the first time a wash is reported on them,
            so this list contains rows nobody has reviewed yet. */}
        <Muted>
          Las máquinas se registran solas con el primer lavado. Las pendientes necesitan
          nombre y local.
        </Muted>
      </Card>

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No hay máquinas para este filtro"
          hint="Probá con otro mes o limpiá la búsqueda."
        />
      ) : (
        <View>
          <Table
            columns={columns}
            rows={data.items}
            keyExtractor={(m) => m.id}
            onRowPress={(m) => router.push(`/machines/${encodeURIComponent(m.id)}`)}
            sortBy={sort.sortBy}
            sortDir={sort.sortDir}
            onSort={(key) => {
              setSort((current) => toggleSort(key, current));
              setPage(1);
            }}
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

const s = StyleSheet.create({
  chip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySubtle, borderColor: colors.primary },
  chipText: { fontSize: font.sm, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: weight.semibold },
});
