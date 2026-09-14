import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, space, weight } from '@/theme';
import { Button, Muted } from './ui';

export type Column<T> = {
  key: string;
  header: string;
  /** Flex weight for this column. */
  width?: number;
  render: (row: T) => React.ReactNode;
  /** When set, the header becomes a sort control using this API sort key. */
  sortKey?: string;
  align?: 'left' | 'right';
};

type TableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  /** Minimum width before the table scrolls horizontally rather than crushing columns. */
  minWidth?: number;
};

export function Table<T>({
  columns,
  rows,
  keyExtractor,
  onRowPress,
  sortBy,
  sortDir,
  onSort,
  minWidth = 760,
}: TableProps<T>) {
  return (
    // A data table cannot be made narrow enough for a phone without becoming unreadable,
    // so it scrolls sideways inside its own container rather than forcing the page to.
    // contentContainerStyle carries flexGrow, not the ScrollView's own style: without it
    // the content sizes to minWidth and the table stops short of the available width on
    // a desktop screen, which is where this is actually used.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={s.scroller}
      contentContainerStyle={{ flexGrow: 1, minWidth }}
    >
      <View style={[s.table, { flex: 1 }]}>
        <View style={s.headerRow}>
          {columns.map((column) => {
            const sortable = Boolean(column.sortKey && onSort);
            const active = column.sortKey && sortBy === column.sortKey;
            return (
              <Pressable
                key={column.key}
                style={[s.cell, { flex: column.width ?? 1 }]}
                onPress={sortable ? () => onSort?.(column.sortKey!) : undefined}
                accessibilityRole={sortable ? 'button' : undefined}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    s.headerText,
                    column.align === 'right' && s.right,
                    active && { color: colors.primary },
                  ]}
                >
                  {column.header}
                  {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : sortable ? ' ↕' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {rows.map((row) => (
          <Pressable
            key={keyExtractor(row)}
            onPress={onRowPress ? () => onRowPress(row) : undefined}
            style={({ pressed }) => [s.row, pressed && onRowPress && s.rowPressed]}
          >
            {columns.map((column) => (
              <View key={column.key} style={[s.cell, { flex: column.width ?? 1 }]}>
                <View style={column.align === 'right' ? s.rightBox : undefined}>
                  {column.render(row)}
                </View>
              </View>
            ))}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export function CellText({
  children,
  strong,
  muted,
}: {
  children: React.ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <Text
      numberOfLines={1}
      style={[s.cellText, strong && s.cellStrong, muted && { color: colors.textMuted }]}
    >
      {children}
    </Text>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <View style={s.pagination}>
      <Muted>
        {total} {total === 1 ? 'resultado' : 'resultados'} · página {page} de{' '}
        {Math.max(totalPages, 1)}
      </Muted>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          title="Anterior"
          variant="secondary"
          small
          disabled={page <= 1}
          onPress={() => onChange(page - 1)}
        />
        <Button
          title="Siguiente"
          variant="secondary"
          small
          disabled={page >= totalPages}
          onPress={() => onChange(page + 1)}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scroller: { borderRadius: radius.lg },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    fontSize: font.xs,
    fontWeight: weight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  rowPressed: { backgroundColor: colors.primarySubtle },
  cell: { paddingVertical: space.md, paddingHorizontal: space.md, justifyContent: 'center' },
  cellText: { fontSize: font.sm, color: colors.text },
  cellStrong: { fontWeight: weight.semibold },
  right: { textAlign: 'right' },
  rightBox: { alignItems: 'flex-end' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.md,
    gap: space.md,
    flexWrap: 'wrap',
  },
});
