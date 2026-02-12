import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateRequestBody } from "@/lib/api-validation";
import { OcrRequestSchema, OcrResultSchema } from "@/lib/api-validation/admin";
import * as Sentry from "@sentry/nextjs";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const VISION_MODEL = "qwen/qwen2.5-vl-72b-instruct"; // Qwen VL for OCR

/**
 * POST /api/admin/ocr
 * Accepts a payment screenshot (base64 or URL) and extracts payment data via Qwen VL.
 * Coach-only endpoint.
 *
 * Body: { imageBase64?: string, imageUrl?: string, signupId?: string }
 * - If signupId is provided, also updates the pending_signups row with OCR data.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth check — must be a coach
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_coach")
    .eq("id", user.id)
    .single<{ is_coach: boolean }>();

  if (!profile?.is_coach) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const validation = validateRequestBody(body, OcrRequestSchema, {
    userId: user.id,
    feature: "ocr-input",
  });
  if (!validation.success) return validation.response;
  const { imageBase64, imageUrl, signupId } = validation.data;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  // Build image content for the vision model
  const imageContent = imageBase64
    ? { type: "image_url" as const, image_url: { url: `data:image/png;base64,${imageBase64}` } }
    : { type: "image_url" as const, image_url: { url: imageUrl! } };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "FitFast",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a payment receipt OCR assistant for Egyptian payment apps. Extract structured data from payment screenshots (InstaPay, Vodafone Cash, bank transfers). Return ONLY valid JSON with these fields: amount (string — numeric value only, e.g. \"20000\"), sender_name (string), reference_number (string — copy EXACTLY as shown, including any trailing letters like M or K), date (string), bank (string). IMPORTANT: Reference numbers often end with a letter (e.g. \"401719036M\"). Transcribe them character-by-character. If a field is not visible, omit it. No markdown, no explanation — only the JSON object.",
          },
          {
            role: "user",
            content: [
              {
                type: "text" as const,
                text: "Extract the payment details from this screenshot. Return only the JSON object.",
              },
              imageContent,
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      Sentry.captureException(new Error("OpenRouter OCR API error"), {
        tags: { feature: "ocr-api" },
        extra: { coachId: user.id, signupId, errorText },
      });
      return NextResponse.json(
        { error: "OCR extraction failed", details: errorText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content ?? "";

    // Parse the JSON from the model response (strip markdown fences if present)
    let rawOcrResult;
    try {
      const cleaned = rawContent
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      rawOcrResult = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse OCR response", raw: rawContent },
        { status: 422 }
      );
    }

    // ADMIN-02: Validate OCR extracted data before database save
    const ocrValidation = OcrResultSchema.safeParse(rawOcrResult);
    if (!ocrValidation.success) {
      Sentry.captureException(new Error("OCR validation failed"), {
        tags: { feature: "ocr-validation" },
        extra: {
          coachId: user.id,
          signupId,
          rawOcrResult,
          errors: ocrValidation.error.issues,
        },
      });
      return NextResponse.json(
        {
          error: "OCR extracted data is invalid",
          details: ocrValidation.error.issues,
          raw: rawOcrResult,
        },
        { status: 422 }
      );
    }

    // Use validated data
    const ocrResult = ocrValidation.data;

    // If signupId provided, update the pending_signups row
    if (signupId) {
      await supabase
        .from("pending_signups")
        .update({ ocr_extracted_data: ocrResult as never } as never)
        .eq("id", signupId);
    }

    return NextResponse.json({
      success: true,
      data: ocrResult,
      usage: data.usage ?? null,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "ocr-extraction" },
      extra: { coachId: user.id, signupId },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
