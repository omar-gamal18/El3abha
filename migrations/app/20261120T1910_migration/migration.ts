#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8911088be667b55786cf682330361abd76d33475579a81244207ddf2e0785691/contract';
import endContract from '../../snapshots/8911088be667b55786cf682330361abd76d33475579a81244207ddf2e0785691/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e5d475f890a71229a2abde9f85fc02cfd68456a531dcbafe5108bab9aea0f5c4/contract';
import startContract from '../../snapshots/e5d475f890a71229a2abde9f85fc02cfd68456a531dcbafe5108bab9aea0f5c4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('passwordResetToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
