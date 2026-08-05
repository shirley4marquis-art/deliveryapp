import { cookies } from "next/headers";
import { getSupabaseForUser, getSupabasePublic } from "./supabase";

const accessCookie = "royal_runs_sb_access";
const refreshCookie = "royal_runs_sb_refresh";
const maxAge = 60 * 60 * 24 * 7;

export async function setAdminSession({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string;
}) {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };

  cookieStore.set(accessCookie, accessToken, options);
  cookieStore.set(refreshCookie, refreshToken, options);
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(accessCookie);
  cookieStore.delete(refreshCookie);
}

export async function getAdminAccessToken() {
  return (await cookies()).get(accessCookie)?.value || null;
}

export async function getAuthenticatedAdmin() {
  let accessToken = await getAdminAccessToken();

  if (!accessToken) {
    return null;
  }

  let supabase = getSupabaseForUser(accessToken);
  let { data: userData, error: userError } =
    await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    const refreshToken = (await cookies()).get(refreshCookie)?.value;

    if (!refreshToken) {
      return null;
    }

    const refreshClient = getSupabasePublic();
    const { data: refreshed, error: refreshError } =
      await refreshClient.auth.refreshSession({ refresh_token: refreshToken });

    if (refreshError || !refreshed.session) {
      return null;
    }

    accessToken = refreshed.session.access_token;
    await setAdminSession({
      accessToken,
      refreshToken: refreshed.session.refresh_token,
    });

    supabase = getSupabaseForUser(accessToken);
    const refreshedUser = await supabase.auth.getUser(accessToken);
    userData = refreshedUser.data;
    userError = refreshedUser.error;
  }

  if (userError || !userData.user) {
    return null;
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id,email")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError || !adminUser) {
    return null;
  }

  return {
    user: userData.user,
    adminUser,
    accessToken,
  };
}

export async function isAdminAuthenticated() {
  return Boolean(await getAuthenticatedAdmin());
}

export async function signInAdmin(email: string, password: string) {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return { error: error?.message || "Invalid admin credentials." };
  }

  const userClient = getSupabaseForUser(data.session.access_token);
  const { data: adminUser, error: adminError } = await userClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !adminUser) {
    return { error: "This Supabase user is not a Royal Runs admin." };
  }

  await setAdminSession({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });

  return { ok: true };
}
