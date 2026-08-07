import { NextResponse } from "next/server";
import { sendRucoShipmentReceivedEmail } from "@/lib/email";
import { parsePastedOrder } from "@/lib/order-import";
import { getSupabaseServiceRole } from "@/lib/supabase";
import { generateTrackingNumber } from "@/lib/tracking";
import type { Database } from "@/lib/database.types";
import {
  createTelegramAdminLink,
  isTelegramChatAuthorized,
  revokeTelegramChat,
} from "@/lib/telegram-auth";

export const runtime = "nodejs";

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; width: number; height: number }>;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  business_message?: TelegramMessage;
  edited_business_message?: TelegramMessage;
};

const siteUrl = process.env.SITE_URL || "https://royalruns.co.uk";

export async function POST(request: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const suppliedSecret =
    request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!webhookSecret || suppliedSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const update = (await request.json().catch(() => ({}))) as TelegramUpdate;
  const message =
    update.message ||
    update.edited_message ||
    update.channel_post ||
    update.edited_channel_post ||
    update.business_message ||
    update.edited_business_message;
  if (!message) {
    console.info("Ignored Telegram update", {
      updateId: update.update_id,
      kinds: Object.keys(update).filter((key) => key !== "update_id"),
    });
    return NextResponse.json({ ok: true });
  }

  if (!(await isTelegramChatAuthorized(message.chat.id))) {
    const token = createTelegramAdminLink(message.chat.id);
    const link = `${siteUrl}/admin/telegram-link?token=${encodeURIComponent(token)}`;
    await sendTelegramMessage(
      message.chat.id,
      [
        "Royal Runs shipment bot",
        "",
        "This bot is public, but shipment tools require a Royal Runs admin account.",
        "Sign in and authorize this chat using the secure link below. The link expires in 10 minutes.",
        "",
        link,
      ].join("\n"),
    );
    return NextResponse.json({ ok: true });
  }

  try {
    await handleMessage(message);
  } catch (error) {
    await sendTelegramMessage(
      message.chat.id,
      `I could not complete that action: ${
        error instanceof Error ? error.message : "Unknown error."
      }`,
    );
  }

  return NextResponse.json({ ok: true });
}

async function handleMessage(message: TelegramMessage) {
  const text = (message.text || message.caption || "").trim();
  const command = text.split(/\s+/)[0]?.toLowerCase();

  if (command === "/disconnect") {
    await revokeTelegramChat(message.chat.id);
    await sendTelegramMessage(
      message.chat.id,
      "This Telegram chat has been disconnected from Royal Runs admin access. Send /start to authorize it again.",
    );
    return;
  }

  if (command === "/start" || command === "/help") {
    await sendTelegramMessage(
      message.chat.id,
      [
        "Royal Runs shipment bot",
        "",
        "1. Forward or paste a Ruco Supply or 1:1 Connect order.",
        "2. Send the package photo.",
        "3. Adjust the latest shipment when needed:",
        "/weight 2.5 kg",
        "/sender Name | City or town",
        "/service UK Standard Delivery",
        "4. Use /summary to review it.",
        "5. Use /sendemail when the first customer email is ready to go.",
        "Use /testemail you@example.com to send a safe test copy first.",
        "Use /resendemail only when another copy is intentionally needed.",
        "Use /disconnect to revoke this chat's admin access.",
        "",
        "The bot never sends the first email until you request it.",
      ].join("\n"),
    );
    return;
  }

  if (command === "/weight") {
    const weight = text.slice(command.length).trim();
    if (!weight) throw new Error("Use /weight followed by the new weight.");
    const shipment = await latestTelegramShipment(message.chat.id);
    await updateShipment(shipment.id, { weight });
    await sendTelegramMessage(
      message.chat.id,
      `Weight updated to ${weight} for ${shipment.tracking_number}.`,
    );
    return;
  }

  if (command === "/sender") {
    const sender = parseSenderReply(text.slice(command.length));
    if (!sender) throw new Error("Use /sender Name | City or town");
    const shipment = await latestTelegramShipment(message.chat.id);
    await updateShipment(shipment.id, {
      sender_name: sender.name,
      sender_address: sender.location,
      sender_city: sender.location,
    });
    await sendTelegramMessage(
      message.chat.id,
      `Sender updated for ${shipment.tracking_number}.`,
    );
    return;
  }

  if (command === "/service") {
    const deliveryService = text.slice(command.length).trim();
    if (!deliveryService) {
      throw new Error("/service must include the delivery service.");
    }
    const shipment = await latestTelegramShipment(message.chat.id);
    await updateShipment(shipment.id, {
      delivery_service: deliveryService,
    });
    await sendTelegramMessage(
      message.chat.id,
      `Delivery service updated for ${shipment.tracking_number}.`,
    );
    return;
  }

  if (command === "/summary") {
    const shipment = await latestTelegramShipment(message.chat.id);
    await sendTelegramMessage(message.chat.id, shipmentSummary(shipment));
    return;
  }

  if (
    command === "/sendemail" ||
    command === "/resendemail" ||
    command === "/testemail"
  ) {
    const shipment = await latestTelegramShipment(message.chat.id);
    const isTest = command === "/testemail";
    const testEmail = isTest ? text.slice(command.length).trim() : "";
    if (isTest && !isEmailAddress(testEmail)) {
      throw new Error("Use /testemail followed by a valid test email address.");
    }
    const targetEmail = isTest ? testEmail : shipment.receiver_email;
    if (!targetEmail) {
      throw new Error("The latest shipment has no customer email address.");
    }
    if (!isTest) {
      const { data: previousEmail } = await getSupabaseServiceRole()
        .from("shipment_email_logs")
        .select("sent_at")
        .eq("shipment_id", shipment.id)
        .eq("status", "Ruco details confirmation")
        .eq("sent_successfully", true)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (previousEmail && command !== "/resendemail") {
        await sendTelegramMessage(
          message.chat.id,
          [
            `The confirmation email for ${shipment.tracking_number} was already sent.`,
            `Sent: ${new Date(previousEmail.sent_at).toLocaleString("en-GB")}`,
            "",
            "Use /resendemail only if you intentionally want to send another copy.",
          ].join("\n"),
        );
        return;
      }
    }
    const result = await sendRucoShipmentReceivedEmail({
      receiverName: shipment.receiver_name,
      receiverEmail: targetEmail,
      receiverAddress: shipment.receiver_address,
      receiverCity: shipment.receiver_city,
      receiverPostcode: shipment.receiver_postcode,
      trackingNumber: shipment.tracking_number,
      status: shipment.current_status,
      estimatedDeliveryDate: shipment.estimated_delivery_date,
      shipmentId: shipment.id,
      packageImageUrl:
        shipment.package_image_url || telegramPhotoFromNotes(shipment.notes),
    });
    await getSupabaseServiceRole().from("shipment_email_logs").insert({
      shipment_id: shipment.id,
      receiver_email: targetEmail,
      status: isTest
        ? "Ruco details confirmation (test)"
        : "Ruco details confirmation",
      subject: `Please confirm your delivery details | Ref: ${shipment.tracking_number}`,
      sent_successfully: result.success,
      error_message: result.error ?? null,
    });
    if (!result.success) throw new Error(result.error || "Email send failed.");
    await sendTelegramMessage(
      message.chat.id,
      `${isTest ? "Test confirmation" : "Confirmation"} email sent to ${targetEmail} for ${shipment.tracking_number}.${isTest ? " The real customer has not been emailed." : ""}`,
    );
    return;
  }

  if (message.photo?.length) {
    const shipment = await latestTelegramShipment(message.chat.id);
    const photo = [...message.photo].sort(
      (a, b) => b.width * b.height - a.width * a.height,
    )[0];
    const imageUrl = await saveTelegramPhoto(
      shipment.id,
      photo.file_id,
      message.message_id,
    );
    const { error: imageUpdateError } = await getSupabaseServiceRole()
      .from("shipments")
      .update({ package_image_url: imageUrl })
      .eq("id", shipment.id);
    if (imageUpdateError) {
      if (
        !isMissingColumnError(imageUpdateError.message, "package_image_url")
      ) {
        throw new Error(imageUpdateError.message);
      }
      const notesWithoutOldPhoto = (shipment.notes || "")
        .split("\n")
        .filter((line) => !line.startsWith("Telegram photo: "))
        .join("\n");
      await updateShipment(shipment.id, {
        notes: `${notesWithoutOldPhoto}\nTelegram photo: ${imageUrl}\nTelegram awaiting: weight`.trim(),
      });
    } else {
      await setAwaitingStep(shipment, "weight");
    }
    await sendTelegramMessage(
      message.chat.id,
      [
        `Package photo saved for ${shipment.tracking_number}.`,
        "",
        "What is the package weight?",
        "Reply with the weight, for example: 2.5 kg",
      ].join("\n"),
    );
    return;
  }

  if (!text || text.startsWith("/")) {
    await sendTelegramMessage(
      message.chat.id,
      "Send /help to see the available shipment commands.",
    );
    return;
  }

  const pendingShipment = await latestTelegramShipment(message.chat.id).catch(
    () => null,
  );
  const awaitingStep = telegramAwaitingStep(pendingShipment?.notes);
  if (pendingShipment && awaitingStep) {
    await handleGuidedReply(message.chat.id, pendingShipment, awaitingStep, text);
    return;
  }

  if (/^(?:yes|yep|yeah|ok|okay|confirmed|confirm|done|thanks|thank you)$/i.test(text)) {
    await sendTelegramMessage(
      message.chat.id,
      "All set. The shipment is saved and the confirmation email has been handled. Send another order whenever you are ready.",
    );
    return;
  }

  await createShipmentFromOrder(message.chat.id, text);
}

async function handleGuidedReply(
  chatId: number,
  shipment: Awaited<ReturnType<typeof latestTelegramShipment>>,
  step: string,
  reply: string,
) {
  if (step === "weight") {
    await updateShipment(shipment.id, {
      weight: reply,
      notes: notesWithAwaitingStep(shipment.notes, "sender"),
    });
    await sendTelegramMessage(
      chatId,
      [
        `Weight saved as ${reply}.`,
        "",
        "Now send the sender name and general dispatch location:",
        "Sender name | City or town",
        "",
        "Example:",
        "Ruco Supply | Newcastle upon Tyne",
      ].join("\n"),
    );
    return;
  }

  if (step === "sender") {
    const sender = parseSenderReply(reply);
    if (!sender) {
      throw new Error("Please use: Sender name | City or town");
    }
    await updateShipment(shipment.id, {
      sender_name: sender.name,
      sender_address: sender.location,
      sender_city: sender.location,
      notes: notesWithAwaitingStep(shipment.notes, "courier"),
    });
    await sendTelegramMessage(
      chatId,
      [
        "Sender information saved.",
        "",
        "Which courier will carry this shipment?",
        "Choose Royal Mail or FedEx.",
      ].join("\n"),
      ["Royal Mail", "FedEx"],
    );
    return;
  }

  if (step === "courier") {
    const normalised = reply.trim().toLowerCase().replace(/\s+/g, " ");
    const courier =
      normalised === "royal mail"
        ? "Royal Mail"
        : normalised === "fedex"
          ? "FedEx"
          : null;
    if (!courier) {
      throw new Error("Please choose Royal Mail or FedEx.");
    }
    await updateShipment(shipment.id, {
      notes: notesWithCourier(
        notesWithAwaitingStep(shipment.notes, "service"),
        courier,
      ),
    });
    await sendTelegramMessage(
      chatId,
      [
        `${courier} selected.`,
        "",
        "Now enter the delivery service.",
        courier === "Royal Mail"
          ? "Example: Tracked 48 or Special Delivery"
          : "Example: International Priority or UK Next Day",
      ].join("\n"),
    );
    return;
  }

  if (step === "service") {
    const courier = telegramCourier(shipment.notes);
    if (!courier) {
      await updateShipment(shipment.id, {
        notes: notesWithAwaitingStep(shipment.notes, "courier"),
      });
      await sendTelegramMessage(
        chatId,
        "Before selecting the service, choose the courier: Royal Mail or FedEx.",
        ["Royal Mail", "FedEx"],
      );
      return;
    }
    const service = reply.toLowerCase().startsWith(courier.toLowerCase())
      ? reply
      : `${courier} — ${reply}`;
    const finalPatch: Database["public"]["Tables"]["shipments"]["Update"] = {
      notes: notesWithCourier(
        notesWithAwaitingStep(shipment.notes, null),
        courier,
      ),
      delivery_service: service,
    };
    await updateShipment(shipment.id, finalPatch);
    const completedShipment = {
      ...shipment,
      delivery_service: service,
      notes: finalPatch.notes || null,
    };
    await sendTelegramMessage(
      chatId,
      [
        "Shipment details are ready for review.",
        "",
        shipmentSummary(completedShipment),
        "",
        "If everything is correct, use /sendemail to send the first customer email.",
        "You can still use /weight, /sender, or /service to make changes.",
      ].join("\n"),
    );
  }
}

async function createShipmentFromOrder(chatId: number, rawOrder: string) {
  const imported = parsePastedOrder(rawOrder);
  if (
    !imported.customerName ||
    !imported.customerEmail ||
    !imported.deliveryAddress
  ) {
    throw new Error(
      "I need a customer name, address, and email to create a shipment.",
    );
  }

  const supabase = getSupabaseServiceRole();
  if (imported.orderReference) {
    const { data: existing, error: existingError } = await supabase
      .from("shipments")
      .select("*")
      .eq("external_order_id", imported.orderReference)
      .maybeSingle();
    if (
      existingError &&
      !isMissingColumnError(existingError.message, "external_order_id")
    ) {
      throw new Error(existingError.message);
    }
    if (existing) {
      const { data: lastEmail } = await supabase
        .from("shipment_email_logs")
        .select("status, sent_at")
        .eq("shipment_id", existing.id)
        .eq("sent_successfully", true)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const emailStatusLine = lastEmail
        ? `Already contacted — last email "${lastEmail.status}" sent ${new Date(lastEmail.sent_at).toLocaleString("en-GB")}.`
        : "No emails sent yet for this client — new/unprocessed, use /sendemail to begin.";
      await sendTelegramMessage(
        chatId,
        `That order already exists as ${existing.tracking_number}.\n${emailStatusLine}\n\n${shipmentSummary(existing)}`,
      );
      return;
    }
  }

  const trackingNumber = generateTrackingNumber();
  const sourceValue =
    imported.source === "Ruco Supply"
      ? "ruco"
      : imported.source === "1:1 Connect"
        ? "one-connect"
        : null;
  const shipmentInput: Database["public"]["Tables"]["shipments"]["Insert"] = {
    tracking_number: trackingNumber,
    external_order_id: imported.orderReference || null,
    order_source: sourceValue,
    sender_name: imported.source,
    sender_address: "Original dispatch unit",
    sender_city: "Dispatch unit",
    receiver_name: imported.customerName,
    receiver_email: imported.customerEmail.toLowerCase() || null,
    receiver_address: imported.deliveryAddress,
    receiver_city: imported.deliveryCity || "To be confirmed",
    receiver_postcode: imported.deliveryPostcode,
    package_type: imported.items.join("; ") || "Customer order",
    weight: "To be confirmed",
    delivery_service: imported.courier || "Standard delivery",
    current_status: "Shipment Created" as const,
    estimated_delivery_date: addDays(new Date(), 3),
    notes: `${imported.notes}\nTelegram chat: ${chatId}${sourceValue ? `\nTelegram source: ${sourceValue}` : ""}`,
  };

  let shipment = null;
  let insertError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await supabase
      .from("shipments")
      .insert(shipmentInput)
      .select("*")
      .single();
    shipment = result.data;
    insertError = result.error;
    if (!insertError) break;

    if (isMissingColumnError(insertError.message, "external_order_id")) {
      delete shipmentInput.external_order_id;
      continue;
    }
    if (isMissingColumnError(insertError.message, "order_source")) {
      delete shipmentInput.order_source;
      continue;
    }
    break;
  }
  if (insertError || !shipment) {
    throw new Error(insertError?.message || "Unable to create the shipment.");
  }

  await supabase.from("tracking_events").insert({
    shipment_id: shipment.id,
    event_time: new Date().toISOString(),
    location: imported.deliveryCity || "Order received",
    status: "Shipment Created",
    description: `Shipment created from a Telegram ${imported.source} order.`,
  });

  await sendTelegramMessage(
    chatId,
    [
      `Shipment created: ${trackingNumber}`,
      "",
      shipmentSummary(shipment),
      "",
      "Now send the package photo. You can also adjust the weight, sender, or service before using /sendemail.",
    ].join("\n"),
  );
}

async function latestTelegramShipment(chatId: number) {
  const { data, error } = await getSupabaseServiceRole()
    .from("shipments")
    .select("*")
    .ilike("notes", `%Telegram chat: ${chatId}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error("No Telegram-created shipment was found. Send an order first.");
  }
  return data;
}

async function updateShipment(
  id: string,
  patch: Database["public"]["Tables"]["shipments"]["Update"],
) {
  const { error } = await getSupabaseServiceRole()
    .from("shipments")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function saveTelegramPhoto(
  shipmentId: string,
  fileId: string,
  messageId: number,
) {
  const botToken = requiredEnv("TELEGRAM_BOT_TOKEN");
  const fileResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  const filePayload = (await fileResponse.json()) as {
    ok: boolean;
    result?: { file_path?: string };
    description?: string;
  };
  const filePath = filePayload.result?.file_path;
  if (!filePayload.ok || !filePath) {
    throw new Error(filePayload.description || "Unable to retrieve the photo.");
  }

  const imageResponse = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`,
  );
  if (!imageResponse.ok) throw new Error("Unable to download the photo.");
  const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
  const extension = filePath.split(".").at(-1)?.toLowerCase() || "jpg";
  const objectPath = `${shipmentId}/telegram-${messageId}.${extension}`;
  const supabase = getSupabaseServiceRole();
  const responseContentType = imageResponse.headers.get("content-type");
  const contentType =
    responseContentType && responseContentType.startsWith("image/")
      ? responseContentType
      : imageContentType(extension);

  const { error: uploadError } = await supabase.storage
    .from("package-images")
    .upload(objectPath, imageBytes, {
      contentType,
      upsert: true,
    });
  if (uploadError) throw new Error(uploadError.message);
  return supabase.storage.from("package-images").getPublicUrl(objectPath).data
    .publicUrl;
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  choices?: string[],
) {
  const response = await fetch(
    `https://api.telegram.org/bot${requiredEnv("TELEGRAM_BOT_TOKEN")}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        reply_markup: choices?.length
          ? {
              keyboard: [choices.map((choice) => ({ text: choice }))],
              one_time_keyboard: true,
              resize_keyboard: true,
            }
          : undefined,
      }),
    },
  );
  if (!response.ok) throw new Error("Unable to reply through Telegram.");
}

function shipmentSummary(shipment: {
  id: string;
  tracking_number: string;
  receiver_name: string;
  receiver_email: string | null;
  receiver_address: string;
  receiver_city: string;
  receiver_postcode: string;
  sender_name: string;
  sender_address?: string;
  sender_city?: string;
  weight: string;
  delivery_service: string;
  package_image_url: string | null;
  notes?: string | null;
}) {
  const savedPhoto =
    shipment.package_image_url || telegramPhotoFromNotes(shipment.notes);
  return [
    `Customer: ${shipment.receiver_name}`,
    `Email: ${shipment.receiver_email || "Not provided"}`,
    `Address: ${uniqueLocationParts([
      shipment.receiver_address,
      shipment.receiver_city,
      shipment.receiver_postcode,
    ])}`,
    `Sender: ${uniqueLocationParts([
      shipment.sender_name,
      shipment.sender_address,
      shipment.sender_city,
    ])}`,
    `Weight: ${shipment.weight}`,
    `Service: ${shipment.delivery_service}`,
    `Photo: ${savedPhoto ? "Saved" : "Waiting"}`,
    `Admin: ${siteUrl}/admin/tracking/${shipment.id}`,
    `Tracking: ${siteUrl}/track?q=${shipment.tracking_number}`,
    "Email: Ready, not sent",
  ].join("\n");
}

function telegramPhotoFromNotes(notes?: string | null) {
  return notes?.match(/^Telegram photo:\s*(https?:\/\/\S+)$/im)?.[1] || null;
}

function uniqueLocationParts(parts: Array<string | undefined>) {
  const result: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    const normalised = value.toLowerCase();
    if (
      result.some(
        (existing) =>
          existing.toLowerCase() === normalised ||
          existing.toLowerCase().includes(normalised),
      )
    ) {
      continue;
    }
    result.push(value);
  }
  return result.join(", ");
}

function telegramAwaitingStep(notes?: string | null) {
  return notes?.match(/^Telegram awaiting:\s*(\S+)$/im)?.[1] || null;
}

function notesWithAwaitingStep(
  notes: string | null,
  step: "weight" | "sender" | "courier" | "service" | null,
) {
  const cleaned = (notes || "")
    .split("\n")
    .filter((line) => !line.startsWith("Telegram awaiting: "))
    .join("\n")
    .trim();
  return step ? `${cleaned}\nTelegram awaiting: ${step}`.trim() : cleaned;
}

function telegramCourier(notes?: string | null) {
  return notes?.match(/^Telegram courier:\s*(Royal Mail|FedEx)$/im)?.[1] || null;
}

function notesWithCourier(notes: string | null, courier: string) {
  const cleaned = (notes || "")
    .split("\n")
    .filter((line) => !line.startsWith("Telegram courier: "))
    .join("\n")
    .trim();
  return `${cleaned}\nTelegram courier: ${courier}`.trim();
}

function parseSenderReply(value: string) {
  const parts = value
    .split(/\||\r?\n/)
    .map((part) =>
      part
        .trim()
        .replace(
          /^(?:sn|sender name|sender address|sender city)\s*[-:]\s*/i,
          "",
        )
        .trim(),
    )
    .filter(Boolean);
  if (parts.length < 2) return null;
  return {
    name: parts[0],
    location: parts.at(-1) || "",
  };
}

async function setAwaitingStep(
  shipment: Awaited<ReturnType<typeof latestTelegramShipment>>,
  step: "weight" | "sender" | "courier" | "service",
) {
  await updateShipment(shipment.id, {
    notes: notesWithAwaitingStep(shipment.notes, step),
  });
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function imageContentType(extension: string) {
  const contentTypes: Record<string, string> = {
    gif: "image/gif",
    heic: "image/heic",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return contentTypes[extension] || "image/jpeg";
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function isMissingColumnError(message: string, column: string) {
  const normalised = message.toLowerCase();
  return (
    normalised.includes(column.toLowerCase()) &&
    (normalised.includes("schema cache") ||
      normalised.includes("could not find") ||
      normalised.includes("does not exist"))
  );
}
