#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/96ccda060b15ff222d43c590eb45562478dab8cd390af66b11f707acdf8c770f/contract';
import startContract from '../../snapshots/96ccda060b15ff222d43c590eb45562478dab8cd390af66b11f707acdf8c770f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b01b4120221257b2b2d93b61cf7d12f002690a8d388a55214c0e636eef404c94/contract';
import endContract from '../../snapshots/b01b4120221257b2b2d93b61cf7d12f002690a8d388a55214c0e636eef404c94/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'User', column: 'deletedAt' }),
      this.dropColumn({ schema: 'public', table: 'User', column: 'updatedAt' }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('passwordResetCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('passwordResetExpires', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
