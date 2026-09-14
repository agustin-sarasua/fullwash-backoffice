import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { adminApi } from '@/api/endpoints';
import type { ClientTransaction } from '@/api/types';
import { Modal } from '@/components/Modal';
import { CellText, Pagination, Table, type Column } from '@/components/Table';
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
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatRelative,
  formatTokens,
} from '@/format';
import { colors, font, space, weight } from '@/theme';

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Compra',
  WASH: 'Lavado',
  REFUND: 'Reembolso',
  ADMIN_GRANT: 'Carga manual',
};

export default function ClientDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const id = String(userId);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [granting, setGranting] = useState(false);
  const [tokens, setTokens] = useState('');
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);

  // One key per opening of the form. Two submits of the same form carry the same key,
  // so a double-click credits once; a deliberate second grant opens the form again and
  // gets a new key.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const client = useQuery({
    queryKey: ['client', id],
    queryFn: () => adminApi.getClient(id),
  });

  const transactions = useQuery({
    queryKey: ['client-transactions', id, page],
    queryFn: () => adminApi.listClientTransactions(id, { page, page_size: 20 }),
  });

  const grant = useMutation({
    mutationFn: () =>
      adminApi.grantTokens(id, {
        tokens: Number(tokens),
        reason: reason.trim(),
        idempotency_key: idempotencyKey,
      }),
    onSuccess: () => {
      setGranting(false);
      setTokens('');
      setReason('');
      setIdempotencyKey(crypto.randomUUID());
      void queryClient.invalidateQueries({ queryKey: ['client', id] });
      void queryClient.invalidateQueries({ queryKey: ['client-transactions', id] });
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const tokenCount = Number(tokens);
  const grantError = useMemo(() => {
    if (!tokens) return null;
    if (!Number.isInteger(tokenCount) || tokenCount < 1) return 'Ingresá un número entero mayor a 0.';
    if (tokenCount > 500) return 'El máximo por carga es 500 fichas.';
    return null;
  }, [tokens, tokenCount]);
  const reasonError = reason.length > 0 && reason.trim().length < 5 ? 'Contá brevemente el motivo (mínimo 5 caracteres).' : null;
  const canSubmit = !grantError && !reasonError && tokenCount >= 1 && reason.trim().length >= 5;

  if (client.isLoading) return <Loading />;
  if (client.isError) return <ErrorState error={client.error} onRetry={() => void client.refetch()} />;
  const data = client.data;
  if (!data) return null;

  const columns: Column<ClientTransaction>[] = [
    {
      key: 'when',
      header: 'Fecha',
      width: 1.4,
      render: (t) => <CellText>{formatDateTime(t.created_date)}</CellText>,
    },
    {
      key: 'type',
      header: 'Tipo',
      width: 1.2,
      render: (t) => <CellText strong>{TYPE_LABELS[t.transaction_type] ?? t.transaction_type}</CellText>,
    },
    {
      key: 'where',
      header: 'Dónde',
      width: 1.4,
      render: (t) => (
        <CellText muted>{t.site?.name ?? t.machine?.name ?? '—'}</CellText>
      ),
    },
    {
      key: 'tokens',
      header: 'Fichas',
      align: 'right',
      render: (t) => (
        <Text
          style={[
            s.delta,
            t.signed_tokens > 0 && { color: colors.success },
            t.signed_tokens < 0 && { color: colors.text },
            !t.counts_toward_balance && { color: colors.textSubtle },
          ]}
        >
          {t.signed_tokens > 0 ? `+${t.signed_tokens}` : t.signed_tokens || `(${t.tokens})`}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: 1.2,
      align: 'right',
      render: (t) =>
        t.counts_toward_balance ? (
          <Badge label="Acreditado" tone="success" />
        ) : (
          // The usual answer to "why isn't my balance what I expect".
          <Badge label={`No acreditado · ${t.payment?.status ?? 'sin pago'}`} tone="neutral" />
        ),
    },
  ];

  return (
    <View style={{ gap: space.lg }}>
      <Button title="← Volver a clientes" variant="ghost" small onPress={() => router.push('/clients')} />

      <Row align="flex-start" style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: space.xs }}>
          <Heading>{data.name || 'Sin nombre'}</Heading>
          <Muted>{data.email || data.user_id}</Muted>
          {data.phone ? <Muted>{data.phone}</Muted> : null}
        </View>
        <Button title="Cargar fichas" onPress={() => setGranting(true)} />
      </Row>

      <Card>
        <Row gap={space.xl}>
          <Stat label="Saldo" value={formatTokens(data.balance_tokens)} emphasis />
          {data.pending_hold_tokens > 0 ? (
            <Stat
              label="Reservadas"
              value={formatTokens(data.pending_hold_tokens)}
              hint="En una máquina ahora mismo"
            />
          ) : null}
          <Stat label="Lavados" value={formatNumber(data.total_washes)} />
          <Stat label="Gastado" value={formatCurrency(data.total_spent_uyu)} />
          <Stat label="Cargadas manualmente" value={formatNumber(data.total_tokens_granted)} />
          <Stat label="Local habitual" value={data.home_site?.name ?? '—'} />
          <Stat label="Último lavado" value={formatRelative(data.last_wash_at)} />
        </Row>
      </Card>

      {data.recent_grants.length > 0 ? (
        <Card>
          <Heading level={3}>Cargas manuales</Heading>
          {data.recent_grants.map((g) => (
            <View key={g.id} style={s.grantRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.grantReason}>{g.reason}</Text>
                <Muted>
                  {g.granted_by_email ?? g.granted_by_uid} · {formatDateTime(g.created_at)}
                </Muted>
              </View>
              <Text style={[s.delta, { color: colors.success }]}>+{g.tokens}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Heading level={3}>Movimientos</Heading>
        {transactions.isLoading ? (
          <Loading />
        ) : transactions.data && transactions.data.items.length > 0 ? (
          <View>
            <Table
              columns={columns}
              rows={transactions.data.items}
              keyExtractor={(t) => String(t.id)}
              minWidth={760}
            />
            <Pagination
              page={transactions.data.page}
              totalPages={transactions.data.total_pages}
              total={transactions.data.total}
              onChange={setPage}
            />
          </View>
        ) : (
          <Muted>Sin movimientos.</Muted>
        )}
      </View>

      <Modal visible={granting} title="Cargar fichas" onClose={() => setGranting(false)}>
        <Muted>
          Se acreditan al instante y quedan registradas con tu usuario y el motivo.
        </Muted>
        <Field label="Cantidad de fichas" error={grantError}>
          <Input
            value={tokens}
            onChangeText={setTokens}
            keyboardType="number-pad"
            placeholder="10"
          />
        </Field>
        <Field
          label="Motivo"
          hint="Queda en la auditoría. Ej: reembolso por lavado fallido."
          error={reasonError}
        >
          <Input
            value={reason}
            onChangeText={setReason}
            placeholder="Reembolso por lavado fallido"
            multiline
          />
        </Field>
        {tokenCount >= 1 ? (
          <Muted>
            Saldo tras la carga: {formatTokens(data.balance_tokens + tokenCount)}
          </Muted>
        ) : null}
        {grant.isError ? <Text style={s.mutationError}>{(grant.error as Error).message}</Text> : null}
        <Row gap={space.sm}>
          <Button
            title="Cargar"
            loading={grant.isPending}
            disabled={!canSubmit}
            onPress={() => grant.mutate()}
          />
          <Button title="Cancelar" variant="secondary" onPress={() => setGranting(false)} />
        </Row>
      </Modal>
    </View>
  );
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
  statLabel: {
    fontSize: font.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: { fontSize: font.xl, fontWeight: weight.bold, color: colors.text },
  statHint: { fontSize: font.xs, color: colors.textSubtle },
  delta: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.text },
  grantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grantReason: { fontSize: font.sm, color: colors.text, fontWeight: weight.medium },
  mutationError: { color: colors.danger, fontSize: font.sm },
});
