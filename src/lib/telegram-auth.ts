import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseServiceRole } from "./supabase";

const LINK_TTL_SECONDS = 10 * 60;

function signingSecret() {
  const value = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!value) throw new Error("Missing environment variable: TELEGRAM_WEBHOOK_SECRET");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createTelegramAdminLink(chatId: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  const payload = `${chatId}.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyTelegramAdminLink(token: string) {
  const [chatId, expiresAtRaw, suppliedSignature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!chatId || !/^[-]?\d+$/.test(chatId) || !Number.isFinite(expiresAt) || !suppliedSignature) {
    return null;
  }
  if (expiresAt < Math.floor(Date.now() / 1000)) return null;
  const payload = `${chatId}.${expiresAt}`;
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  return { chatId };
}

export async function isTelegramChatAuthorized(chatId: number) {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from("telegram_admin_chats")
    .select("chat_id")
    .eq("chat_id", String(chatId))
    .maybeSingle();
  if (error) {
    // Keep existing private bots operational while the admin-chat migration is
    // being rolled out. Never fail open: only explicitly configured chat IDs
    // are accepted by this compatibility path.
    if (isMissingTelegramAdminChatsTable(error.message)) {
      return configuredTelegramChatIds().has(String(chatId));
    }
    throw new Error(error.message);
  }
  return Boolean(data);
}

function configuredTelegramChatIds() {
  return new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function isMissingTelegramAdminChatsTable(message: string) {
  const normalised = message.toLowerCase();
  return (
    normalised.includes("telegram_admin_chats") &&
    (normalised.includes("schema cache") ||
      normalised.includes("could not find") ||
      normalised.includes("does not exist"))
  );
}

export async function authorizeTelegramChat({
  chatId,
  adminUserId,
  adminEmail,
}: {
  chatId: string;
  adminUserId: string;
  adminEmail: string;
}) {
  const { error } = await getSupabaseServiceRole()
    .from("telegram_admin_chats")
    .upsert({
      chat_id: chatId,
      admin_user_id: adminUserId,
      admin_email: adminEmail,
      authorized_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}

export async function revokeTelegramChat(chatId: number) {
  const { error } = await getSupabaseServiceRole()
    .from("telegram_admin_chats")
    .delete()
    .eq("chat_id", String(chatId));
  if (error) throw new Error(error.message);
}
