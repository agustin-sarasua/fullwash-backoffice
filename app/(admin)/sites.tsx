import React, { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '@/api/endpoints';
import type { Site } from '@/api/types';
import { Modal } from '@/components/Modal';
import { CellText, Table, type Column } from '@/components/Table';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Heading,
  Input,
  Loading,
  Muted,
  Row,
} from '@/components/ui';
import { formatNumber } from '@/format';
import { space } from '@/theme';

type Draft = { id?: number; name: string; address: string; city: string };

const EMPTY: Draft = { name: '', address: '', city: '' };

export default function SitesScreen() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDetach, setConfirmDetach] = useState<Site | null>(null);

  const query = useQuery({
    queryKey: ['sites', 'list'],
    queryFn: () => adminApi.listSites({ page_size: 100, sort_by: 'name', sort_dir: 'asc' }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['sites'] });
    void queryClient.invalidateQueries({ queryKey: ['machines'] });
  };

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = {
        name: d.name.trim(),
        address: d.address.trim() || null,
        city: d.city.trim() || null,
      } as Partial<Site>;
      return d.id ? adminApi.updateSite(d.id, body) : adminApi.createSite(body);
    },
    onSuccess: () => {
      setDraft(null);
      invalidate();
    },
  });

  const deactivate = useMutation({
    mutationFn: ({ id, detach }: { id: number; detach: boolean }) =>
      adminApi.deactivateSite(id, detach),
    onSuccess: () => {
      setConfirmDetach(null);
      invalidate();
    },
  });

  const columns: Column<Site>[] = [
    {
      key: 'name',
      header: 'Local',
      width: 2,
      render: (site) => (
        <View style={{ gap: 2 }}>
          <CellText strong>{site.name}</CellText>
          <CellText muted>{site.address || site.city || 'Sin dirección'}</CellText>
        </View>
      ),
    },
    {
      key: 'machines',
      header: 'Máquinas',
      align: 'right',
      render: (site) => <CellText>{formatNumber(site.machine_count)}</CellText>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (site) =>
        site.is_active ? (
          <Badge label="Activo" tone="success" />
        ) : (
          <Badge label="Inactivo" tone="neutral" />
        ),
    },
    {
      key: 'actions',
      header: '',
      width: 1.4,
      align: 'right',
      render: (site) => (
        <Row gap={space.xs} wrap={false}>
          <Button
            title="Editar"
            variant="secondary"
            small
            onPress={() =>
              setDraft({
                id: site.id,
                name: site.name,
                address: site.address ?? '',
                city: site.city ?? '',
              })
            }
          />
          {site.is_active ? (
            <Button
              title="Desactivar"
              variant="ghost"
              small
              onPress={() => {
                if (site.machine_count > 0) {
                  // Machines still point at it; make the operator decide rather than
                  // orphaning their metrics silently.
                  setConfirmDetach(site);
                } else {
                  deactivate.mutate({ id: site.id, detach: false });
                }
              }}
            />
          ) : null}
        </Row>
      ),
    },
  ];

  const data = query.data;

  return (
    <View style={{ gap: space.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: space.xs }}>
          <Heading>Locales</Heading>
          <Muted>
            Los clientes se segmentan por el local donde más lavan en los últimos 90 días.
          </Muted>
        </View>
        <Button title="Nuevo local" onPress={() => setDraft({ ...EMPTY })} />
      </Row>

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Todavía no hay locales"
          hint="Creá uno y asignale las máquinas para poder segmentar por ubicación."
        />
      ) : (
        <Table
          columns={columns}
          rows={data.items}
          keyExtractor={(site) => String(site.id)}
          minWidth={640}
        />
      )}

      <Modal
        visible={draft !== null}
        title={draft?.id ? 'Editar local' : 'Nuevo local'}
        onClose={() => setDraft(null)}
      >
        <Field label="Nombre">
          <Input
            value={draft?.name ?? ''}
            onChangeText={(v) => setDraft((d) => (d ? { ...d, name: v } : d))}
            placeholder="Punta Carretas"
          />
        </Field>
        <Field label="Dirección">
          <Input
            value={draft?.address ?? ''}
            onChangeText={(v) => setDraft((d) => (d ? { ...d, address: v } : d))}
            placeholder="Av. Brasil 2800"
          />
        </Field>
        <Field label="Ciudad">
          <Input
            value={draft?.city ?? ''}
            onChangeText={(v) => setDraft((d) => (d ? { ...d, city: v } : d))}
            placeholder="Montevideo"
          />
        </Field>
        {save.isError ? <Muted>{(save.error as Error).message}</Muted> : null}
        <Row gap={space.sm}>
          <Button
            title="Guardar"
            loading={save.isPending}
            disabled={!draft?.name.trim()}
            onPress={() => draft && save.mutate(draft)}
          />
          <Button title="Cancelar" variant="secondary" onPress={() => setDraft(null)} />
        </Row>
      </Modal>

      <Modal
        visible={confirmDetach !== null}
        title="Desactivar local"
        onClose={() => setConfirmDetach(null)}
      >
        <Muted>
          {confirmDetach?.name} todavía tiene {confirmDetach?.machine_count} máquina(s)
          asignada(s). Si continuás, quedan sin local y dejan de contar para la
          segmentación por ubicación. El historial de lavados no se pierde.
        </Muted>
        {deactivate.isError ? <Muted>{(deactivate.error as Error).message}</Muted> : null}
        <Row gap={space.sm}>
          <Button
            title="Desasignar y desactivar"
            variant="danger"
            loading={deactivate.isPending}
            onPress={() =>
              confirmDetach && deactivate.mutate({ id: confirmDetach.id, detach: true })
            }
          />
          <Button title="Cancelar" variant="secondary" onPress={() => setConfirmDetach(null)} />
        </Row>
      </Modal>
    </View>
  );
}
