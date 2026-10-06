// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const appState=sqliteTable('app_state',{key:text('key').primaryKey()});
export const customCategories=sqliteTable('custom_categories',{key:text('key').primaryKey(),name:text('name').notNull(),color:text('color').notNull().default(''),icon:text('icon').notNull().default('')});
export const expenses=sqliteTable('expenses',{id:text('id').primaryKey(),category:text('category').notNull(),cents:integer('cents').notNull(),date:text('date').notNull(),note:text('note').notNull().default(''),method:text('method').notNull().default(''),account:text('account').notNull().default('')});
export const budgets=sqliteTable('budgets',{category:text('category').primaryKey(),cents:integer('cents').notNull()});
export const recurring=sqliteTable('recurring',{id:text('id').primaryKey(),category:text('category').notNull(),cents:integer('cents').notNull(),day:integer('day').notNull(),note:text('note').notNull().default(''),startMonth:text('start_month').notNull(),lastMonth:text('last_month'),kind:text('kind').notNull().default('expense'),source:text('source').notNull().default(''),account:text('account').notNull().default(''),toAccount:text('to_account').notNull().default('')});
export const income=sqliteTable('income',{id:text('id').primaryKey(),source:text('source').notNull(),cents:integer('cents').notNull(),date:text('date').notNull(),note:text('note').notNull().default(''),account:text('account').notNull().default('')});
// Accounts (cash, banks, investments, loans). opening is in cents: the balance, or the amount owed for debt types.
// Gold and property: quantity in thousandths of unit (vori, gram, katha, decimal, bigha, sqft).
// Terms for savings and loans: start/maturity (or end) dates, rate in basis points (9.5% = 950), monthly instalment or EMI in cents.
export const accounts=sqliteTable('accounts',{id:text('id').primaryKey(),name:text('name').notNull(),type:text('type').notNull(),opening:integer('opening').notNull().default(0),note:text('note').notNull().default(''),closed:integer('closed').notNull().default(0),startDate:text('start_date').notNull().default(''),maturityDate:text('maturity_date').notNull().default(''),rate:integer('rate').notNull().default(0),instalment:integer('instalment').notNull().default(0),quantity:integer('quantity').notNull().default(0),unit:text('unit').notNull().default('')});
export const transfers=sqliteTable('transfers',{id:text('id').primaryKey(),fromAccount:text('from_account').notNull(),toAccount:text('to_account').notNull(),cents:integer('cents').notNull(),date:text('date').notNull(),note:text('note').notNull().default('')});
// Signed change in an account's net-worth value (e.g. interest, market value updates).
export const adjustments=sqliteTable('adjustments',{id:text('id').primaryKey(),account:text('account').notNull(),cents:integer('cents').notNull(),date:text('date').notNull(),note:text('note').notNull().default('')});
// Savings goals: target in cents, optional target date, linked account ids (JSON array) or a manual saved amount.
export const goals=sqliteTable('goals',{id:text('id').primaryKey(),name:text('name').notNull(),target:integer('target').notNull(),targetDate:text('target_date').notNull().default(''),accounts:text('accounts').notNull().default('[]'),saved:integer('saved').notNull().default(0),note:text('note').notNull().default('')});
