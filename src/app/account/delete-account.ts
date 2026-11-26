"use server";

import { deleteSignedInAccount, removeOwnedAccountRows, type AccountDeletionDb } from "@/lib/account/delete-account";
import { getServiceRoleClient } from "@/lib/account/service-role";
import { getUserClient } from "@/lib/account/user-client";

type DbError = { code?: string; message?: string } | null;

type AdminClient = {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): PromiseLike<{ data: { id?: string }[] | null; error: DbError }>;
    };
    delete(): {
      eq(column: string, value: string): PromiseLike<{ error: DbError }>;
      in(column: string, values: string[]): PromiseLike<{ error: DbError }>;
    };
  };
  auth: {
    admin: {
      deleteUser(id: string, shouldSoftDelete?: boolean): PromiseLike<{ error: { message?: string } | null }>;
    };
  };
};

function rowsFor(admin: AdminClient): AccountDeletionDb {
  return {
    async listIds(table, column, value) {
      const result = await admin.from(table).select("id").eq(column, value);
      const ids = (result.data ?? []).flatMap((row) => (typeof row.id === "string" && row.id ? [row.id] : []));
      return { ids, error: result.error };
    },
    async deleteEq(table, column, value) {
      const result = await admin.from(table).delete().eq(column, value);
      return { error: result.error };
    },
    async deleteIn(table, column, values) {
      if (values.length === 0) return { error: null };
      const result = await admin.from(table).delete().in(column, values);
      return { error: result.error };
    },
  };
}

/** Deletes the account for the current session. A user id in the body is ignored. */
export async function deleteMyAccount(input: {
  accessToken?: string | null;
  userId?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = getServiceRoleClient() as AdminClient | null;
  return deleteSignedInAccount({
    accessToken: input?.accessToken,
    clientUserId: input?.userId,
    readUser: async (token) => {
      const client = getUserClient(token);
      if (!client) throw new Error("session unavailable");
      const result = await client.auth.getUser(token);
      const id = result.data.user?.id;
      if (result.error || !id) return null;
      return { id };
    },
    removeOwnedRows: async (userId) => {
      if (!admin) throw new Error("session unavailable");
      await removeOwnedAccountRows(userId, rowsFor(admin));
    },
    deleteAuthUser: async (userId) => {
      if (!admin) throw new Error("session unavailable");
      const result = await admin.auth.admin.deleteUser(userId, false);
      if (result.error) throw new Error("session unavailable");
    },
  });
}
