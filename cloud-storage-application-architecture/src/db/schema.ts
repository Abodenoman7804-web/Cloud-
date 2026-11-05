import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── المستخدمون والمساحة التخزينية (1TB افتراضياً) ───────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    // رمز PIN مخزّن كـ bcrypt(sha256(pin)) — لا يصل للخادم بصيغته الأصلية
    pinHash: text("pin_hash"),
    // ملح PBKDF2 لاشتقاق مفتاح التشفير من طرف العميل (Zero-Knowledge)
    encryptionSalt: text("encryption_salt").notNull(),
    storageLimitBytes: bigint("storage_limit_bytes", { mode: "number" })
      .notNull()
      .default(1099511627776), // 1 TB
    storageUsedBytes: bigint("storage_used_bytes", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uidx").on(t.email)]
);

// ─── جلسات التحديث (Refresh Tokens) — مخزّنة كـ SHA-256 hash ─────────────────
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_uidx").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]
);

// ─── المجلدات الهرمية (حذف ناعم عبر deletedAt) ──────────────────────────────
export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    name: varchar("name", { length: 255 }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("folders_user_parent_idx").on(t.userId, t.parentId)]
);

// ─── الملفات والوسائط (مفاتيح تخزين S3 + تشفير طرف-لطرف) ────────────────────
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
    fileName: text("file_name").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    mimeType: varchar("mime_type", { length: 150 }).notNull(),
    storageKey: text("storage_key").notNull(),
    thumbnailKey: text("thumbnail_key"),
    encrypted: boolean("encrypted").notNull().default(true),
    chunkCount: integer("chunk_count").notNull().default(1),
    isFavorite: boolean("is_favorite").notNull().default(false),
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("files_user_folder_idx").on(t.userId, t.folderId),
    index("files_user_trash_idx").on(t.userId, t.trashedAt),
    uniqueIndex("files_storage_key_uidx").on(t.storageKey),
  ]
);

// ─── جلسات الرفع المجزأ (Multi-part) — تُحجز المساحة مسبقاً وتُسترد عند الإلغاء
export const uploadSessions = pgTable(
  "upload_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id"),
    fileName: text("file_name").notNull(),
    mimeType: varchar("mime_type", { length: 150 }).notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    totalChunks: integer("total_chunks").notNull(),
    storageKey: text("storage_key").notNull(),
    thumbnailKey: text("thumbnail_key"),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | completed | aborted
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("upload_sessions_user_idx").on(t.userId, t.status)]
);

// ─── سجل النشاط (Audit Trail) ────────────────────────────────────────────────
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    detail: text("detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activities_user_idx").on(t.userId, t.createdAt)]
);

// ─── روابط المشاركة المنتهية (Zero-Knowledge — بدون صلاحية فك التشفير للخادم) ─
export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    downloadCount: integer("download_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("share_links_token_uidx").on(t.token), index("share_links_file_idx").on(t.fileId)]
);

export type User = typeof users.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type FolderRow = typeof folders.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
