#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/24971bfc64633f0f9d77dd5c897fe8585cbc6dd385dcdbf4509a3f489903cdf6/contract';
import endContract from '../../snapshots/24971bfc64633f0f9d77dd5c897fe8585cbc6dd385dcdbf4509a3f489903cdf6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/575b7432418abcf5c26834af939d27f43ace96abc315b85a53b7de8266635e6d/contract';
import startContract from '../../snapshots/575b7432418abcf5c26834af939d27f43ace96abc315b85a53b7de8266635e6d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'Facility',
        members: ['floodlights', 'parking', 'changing_rooms', 'showers', 'water', 'ball_included'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PitchSize',
        members: ['five_a_side', 'six_a_side', 'seven_a_side', 'nine_a_side', 'eleven_a_side'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PitchSurface',
        members: ['artificial_turf', 'natural_grass', 'indoor', 'concrete'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'SportCategory',
        members: ['football', 'padel', 'basketball', 'tennis', 'squash', 'volleyball'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'VenueStatus',
        members: ['pending', 'approved', 'rejected'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Venue',
        columns: [
          col('bookingDuration', 'int4', {
            notNull: true,
            default: lit(60),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('closingTime', 'text', {
            notNull: true,
            default: lit('03:00'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('contactPhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('facilities', '"Facility"[]', {
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'Facility' }, many: true },
          }),
          col('hourlyPrice', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('neighborhood', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openingTime', 'text', {
            notNull: true,
            default: lit('12:00'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ownerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('photos', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
          col('pitchSize', '"PitchSize"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PitchSize' } },
          }),
          col('rejectionReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sportCategory', '"SportCategory"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'SportCategory' } },
          }),
          col('status', '"VenueStatus"', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'VenueStatus' } },
          }),
          col('streetAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('surface', '"PitchSurface"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PitchSurface' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Venue',
        index: 'Venue_city_neighborhood_idx',
        columns: ['city', 'neighborhood'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Venue',
        index: 'Venue_ownerId_idx',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Venue',
        index: 'Venue_status_isActive_idx',
        columns: ['status', 'isActive'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Venue',
        foreignKey: {
          name: 'Venue_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
