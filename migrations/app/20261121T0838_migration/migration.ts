#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/87dccb3500674ba7aff7aa200c62428363c214d974351304509d7b0922dc9f1f/contract';
import endContract from '../../snapshots/87dccb3500674ba7aff7aa200c62428363c214d974351304509d7b0922dc9f1f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8911088be667b55786cf682330361abd76d33475579a81244207ddf2e0785691/contract';
import startContract from '../../snapshots/8911088be667b55786cf682330361abd76d33475579a81244207ddf2e0785691/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_passwordResetCode_idx',
        columns: ['passwordResetCode'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_passwordResetToken_idx',
        columns: ['passwordResetToken'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
