import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { adminApi } from '@/api/endpoints';
import { Modal } from '@/components/Modal';
import { CellText, Table, type Column } from '@/components/Table';
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
import type { MachineAction } from '@/api/types';
import { formatCurrency, formatDateTime, formatNumber, formatRelative, periodLabel } from '@/format';
import { useSites } from '@/hooks/useAdminQuery';
import { colors, font, radius, space, weight } from '@/theme';

export default function MachineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const machineId = String(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const sites = useSites();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => adminApi.getMachine(machineId),
  });

  const save = useMutation({
    mutationFn: (body: { name?: string; site_id?: number | null; is_provisioned?: boolean }) =>
      adminApi.updateMachine(machineId, body),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['machine', machineId] });
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const machine = query.data;
  if (!machine) return null;

  const openEditor = () => {
    setName(machine.name);
    setSiteId(machine.site ? Number(machine.site.id) : null);
    setEditing(true);
  };

  const peak = Math.max(...machine.monthly_series.map((p) => p.tokens_consumed), 1);

  const actionColumns: Column<MachineAction>[] = [
    { key: 'when', header: 'Cuándo', render: (a) => <CellText>{formatDateTime(a.timestamp)}</CellText> },
    { key: 'action', header: 'Acción', render: (a) => <CellText strong>{a.action}</CellText> },
    {
      key: 'trigger',
      header: 'Origen',
      render: (a) => <CellText muted>{a.trigger_type ?? '—'}</CellText>,
    },
    {
      key: 'tokens',
      header: 'Fichas restantes',
      align: 'right',
      render: (a) => <CellText>{a.tokens_left ?? '—'}</CellText>,
    },
  ];

  return (
    <View style={{ gap: space.lg }}>
      <Button title="← Volver a máquinas" variant="ghost" small onPress={() => router.push('/machines')} />

      <Row align="flex-start" style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: space.xs }}>
          <Heading>{machine.name}</Heading>
          <Row gap={space.sm}>
            <Muted>#{machine.id}</Muted>
            {machine.site ? (
              <Badge label={machine.site.name ?? 'Local'} tone="info" />
            ) : (
              <Badge label="Sin local asignado" tone="warning" />
            )}
            {machine.is_provisioned ? null : <Badge label="Pendiente de configurar" tone="danger" />}
          </Row>
        </View>
        <Button title="Editar" variant="secondary" onPress={openEditor} />
      </Row>

      <Card>
        <Heading level={3}>{periodLabel(machine.period_label)}</Heading>
        <Row gap={space.xl}>
          <Stat label="Lavados" value={formatNumber(machine.metrics.wash_count)} />
          <Stat label="Fichas consumidas" value={formatNumber(machine.metrics.tokens_consumed)} />
          <Stat label="Clientes únicos" value={formatNumber(machine.metrics.unique_users)} />
          <Stat
            label="Ingreso estimado"
            value={formatCurrency(machine.metrics.estimated_revenue_uyu)}
            hint="A precio de lista"
          />
          <Stat label="Último lavado" value={formatRelative(machine.metrics.last_wash_at)} />
        </Row>
        {/* Purchases carry no machine, so revenue here is inferred from consumption. */}
        <Muted>
          El ingreso es estimado: las fichas se compran en la app, no en la máquina, y los
          descuentos por volumen bajan el valor real hasta un 15%.
        </Muted>
      </Card>

      <Card>
        <Heading level={3}>Fichas por mes</Heading>
        <View style={{ gap: space.sm }}>
          {machine.monthly_series.map((point) => (
            <Row key={point.period_label} gap={space.md} wrap={false}>
              <Text style={s.seriesLabel}>{point.period_label}</Text>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    { width: `${Math.round((point.tokens_consumed / peak) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={s.seriesValue}>{formatNumber(point.tokens_consumed)}</Text>
            </Row>
          ))}
        </View>
      </Card>

      {machine.recent_actions.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Heading level={3}>Actividad reciente</Heading>
          <Table
            columns={actionColumns}
            rows={machine.recent_actions}
            keyExtractor={(a) => String(a.id)}
            minWidth={560}
          />
        </View>
      ) : null}

      <Modal visible={editing} title="Editar máquina" onClose={() => setEditing(false)}>
        <Field label="Nombre">
          <Input value={name} onChangeText={setName} placeholder="Máquina 12" />
        </Field>
        <Field label="Local">
          <Row gap={space.xs}>
            <Chip label="Sin asignar" active={siteId === null} onPress={() => setSiteId(null)} />
            {(sites.data?.items ?? []).map((site) => (
              <Chip
                key={site.id}
                label={site.name}
                active={siteId === site.id}
                onPress={() => setSiteId(site.id)}
              />
            ))}
          </Row>
        </Field>
        {save.isError ? <Muted>{(save.error as Error).message}</Muted> : null}
        <Row gap={space.sm}>
          <Button
            title="Guardar"
            loading={save.isPending}
            onPress={() =>
              save.mutate({
                name: name.trim() || undefined,
                // Explicit null unassigns; the API distinguishes it from an absent field.
                site_id: siteId,
                is_provisioned: true,
              })
            }
          />
          <Button title="Cancelar" variant="secondary" onPress={() => setEditing(false)} />
        </Row>
        <Muted>Guardar marca la máquina como configurada.</Muted>
      </Modal>
    </View>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={{ gap: 2, minWidth: 120 }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {hint ? <Text style={s.statHint}>{hint}</Text> : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Button title={label} variant={active ? 'primary' : 'secondary'} small onPress={onPress} />
  );
}

const s = StyleSheet.create({
  statLabel: { fontSize: font.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: font.xl, fontWeight: weight.bold, color: colors.text },
  statHint: { fontSize: font.xs, color: colors.textSubtle },
  seriesLabel: { width: 72, fontSize: font.sm, color: colors.textMuted },
  seriesValue: { width: 56, textAlign: 'right', fontSize: font.sm, color: colors.text },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.surfaceMuted, borderRadius: radius.pill },
  barFill: { height: 10, backgroundColor: colors.primary, borderRadius: radius.pill, minWidth: 2 },
});
