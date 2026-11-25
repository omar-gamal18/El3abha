#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/24971bfc64633f0f9d77dd5c897fe8585cbc6dd385dcdbf4509a3f489903cdf6/contract';
import startContract from '../../snapshots/24971bfc64633f0f9d77dd5c897fe8585cbc6dd385dcdbf4509a3f489903cdf6/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6042681c5ba98b476f67e1eaaa3860ea739baa42f3ba8973bb5f67b7823b4a33/contract';
import endContract from '../../snapshots/6042681c5ba98b476f67e1eaaa3860ea739baa42f3ba8973bb5f67b7823b4a33/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'Venue', column: 'photos' }),
      this.createTable({
        schema: 'public',
        table: 'VenuePhoto',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('publicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('venueId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.setDefault({
        schema: 'public',
        table: 'Venue',
        column: col('facilities', '"Facility"[]', {
          default: lit([]),
          codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'Facility' }, many: true },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'VenuePhoto',
        index: 'VenuePhoto_publicId_key',
        columns: ['publicId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'VenuePhoto',
        index: 'VenuePhoto_venueId_idx',
        columns: ['venueId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'VenuePhoto',
        foreignKey: {
          name: 'VenuePhoto_venueId_fkey',
          columns: ['venueId'],
          references: { schema: 'public', table: 'Venue', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
