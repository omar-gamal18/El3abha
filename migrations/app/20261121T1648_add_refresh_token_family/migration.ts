#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/069be2fdb7dd34bc4237e36c8039696ac4afab6ee772d4f68ed7c017b30a45a1/contract';
import endContract from '../../snapshots/069be2fdb7dd34bc4237e36c8039696ac4afab6ee772d4f68ed7c017b30a45a1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/339e19a96f0dcf30662a6489a1a6ac110a47268ab68c27d7e4873492e2ba347e/contract';
import startContract from '../../snapshots/339e19a96f0dcf30662a6489a1a6ac110a47268ab68c27d7e4873492e2ba347e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'RefreshToken',
        column: col('familyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'RefreshToken',
        index: 'RefreshToken_familyId_idx',
        columns: ['familyId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
