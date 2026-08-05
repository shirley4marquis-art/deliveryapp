import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { authorizeTelegramChat, verifyTelegramAdminLink } from "@/lib/telegram-auth";

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin-login", request.url), 303);

  const form = await request.formData();
  const token = String(form.get("token") || "");
  const verified = verifyTelegramAdminLink(token);
  if (!verified) {
    return NextResponse.redirect(new URL("/admin/telegram-link?error=expired", request.url), 303);
  }

  await authorizeTelegramChat({
    chatId: verified.chatId,
    adminUserId: admin.user.id,
    adminEmail: admin.adminUser.email,
  });
  return NextResponse.redirect(new URL("/admin/telegram-link?linked=1", request.url), 303);
}
