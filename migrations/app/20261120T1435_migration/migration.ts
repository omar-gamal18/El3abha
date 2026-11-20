#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/b01b4120221257b2b2d93b61cf7d12f002690a8d388a55214c0e636eef404c94/contract';
import startContract from '../../snapshots/b01b4120221257b2b2d93b61cf7d12f002690a8d388a55214c0e636eef404c94/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e5d475f890a71229a2abde9f85fc02cfd68456a531dcbafe5108bab9aea0f5c4/contract';
import endContract from '../../snapshots/e5d475f890a71229a2abde9f85fc02cfd68456a531dcbafe5108bab9aea0f5c4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('passwordResetVerified', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
