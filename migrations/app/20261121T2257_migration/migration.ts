#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/575b7432418abcf5c26834af939d27f43ace96abc315b85a53b7de8266635e6d/contract';
import endContract from '../../snapshots/575b7432418abcf5c26834af939d27f43ace96abc315b85a53b7de8266635e6d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/87dccb3500674ba7aff7aa200c62428363c214d974351304509d7b0922dc9f1f/contract';
import startContract from '../../snapshots/87dccb3500674ba7aff7aa200c62428363c214d974351304509d7b0922dc9f1f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropIndex({ schema: 'public', table: 'User', index: 'User_phone_key' })];
  }
}

MigrationCLI.run(import.meta.url, M);
