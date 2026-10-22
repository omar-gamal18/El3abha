#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/bc19f812ea76ecbeb4ba93c37d6a1c78dd75632887d6682f889639f47d7144b1/contract';
import endContract from '../../snapshots/bc19f812ea76ecbeb4ba93c37d6a1c78dd75632887d6682f889639f47d7144b1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f926b899bedaa71221348c41e045867c9fb04a157e829427cf30ef241fcb1b9a/contract';
import startContract from '../../snapshots/f926b899bedaa71221348c41e045867c9fb04a157e829427cf30ef241fcb1b9a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('deletedAt', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
        }),
      }),
      this.setDefault({
        schema: 'public',
        table: 'User',
        column: col('isActive', 'bool', { default: lit(true), codecRef: { codecId: 'pg/bool@1' } }),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'User',
        column: 'phone',
        type: 'text',
        operationClass: 'widening',
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_phone_key',
        columns: ['phone'],
        extras: { unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
