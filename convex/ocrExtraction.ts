"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/** OCR vision model — Qwen3-VL-8B: 32-language receipt OCR, handles blur/tilt/low-light */
const OCR_MODEL = "qwen/qwen3-vl-8b-instruct";

/**
 * Extract payment data from a screenshot using Qwen3-VL via OpenRouter.
 * Scheduled by createSignup when a paymentScreenshotId is provided.
 */
export const extractPaymentData = internalAction({
  args: {
    signupId: v.id("pendingSignups"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { signupId, storageId }): Promise<void> => {
    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) {
      console.error("[OCR:extractPaymentData] Could not resolve storage URL", { storageId });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[OCR:extractPaymentData] OPENROUTER_API_KEY not set — check Convex environment variables",
      );
    }

    try {
      const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
      const { generateText } = await import("ai");

      const openrouter = createOpenRouter({ apiKey });

      const { text } = await generateText({
        model: openrouter(OCR_MODEL),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: new URL(imageUrl),
              },
              {
                type: "text",
                text: `Extract payment information from this screenshot. Return ONLY valid JSON with these fields (use null for any field you cannot find):
{
  "amount": "the payment amount as a string including currency if visible",
  "sender_name": "name of the person who sent the payment",
  "reference_number": "transaction or reference number",
  "date": "payment date",
  "bank": "bank or payment provider name"
}
Respond with ONLY the JSON object, no markdown or explanation.`,
              },
            ],
          },
        ],
        maxOutputTokens: 300,
      });

      // Parse the JSON response
      const cleaned = text
        .replace(/```(?:json)?\s*/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      // Filter out null/undefined values
      const ocrData: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== null && value !== undefined && value !== "") {
          ocrData[key] = String(value);
        }
      }

      if (Object.keys(ocrData).length > 0) {
        await ctx.runMutation(internal.pendingSignups.patchOcrData, {
          signupId,
          ocrExtractedData: ocrData,
        });
      }
    } catch (err) {
      console.error("[OCR:extractPaymentData] Extraction failed", {
        signupId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Non-critical — don't throw. The signup still exists without OCR data.
    }
  },
});

/**
 * Extract body composition data from an InBody result sheet photo.
 * Scheduled after check-in save when measurementMethod === "inbody".
 */
export const extractInBodyData = internalAction({
  args: {
    checkInId: v.id("checkIns"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { checkInId, storageId }): Promise<void> => {
    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) {
      console.error("[OCR:extractInBodyData] Could not resolve storage URL", { storageId });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[OCR:extractInBodyData] OPENROUTER_API_KEY not set — check Convex environment variables",
      );
    }

    try {
      const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
      const { generateText } = await import("ai");

      const openrouter = createOpenRouter({ apiKey });

      const { text } = await generateText({
        model: openrouter(OCR_MODEL),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: new URL(imageUrl),
              },
              {
                type: "text",
                text: `Extract body composition data from this InBody result sheet. Return ONLY valid JSON with these fields (use null for any field you cannot find):
{
  "bodyFatPercentage": number or null,
  "leanBodyMass": number in kg or null,
  "skeletalMuscleMass": number in kg or null,
  "bmi": number or null,
  "visceralFatLevel": number or null,
  "basalMetabolicRate": number in kcal or null,
  "totalBodyWater": number in liters or null
}
Respond with ONLY the JSON object, no markdown or explanation.`,
              },
            ],
          },
        ],
        maxOutputTokens: 300,
      });

      // Robust JSON extraction (handles markdown fences, trailing commas, brace extraction)
      let cleaned = text
        .replace(/```(?:json)?\s*/g, "")
        .replace(/```/g, "")
        .replace(/,\s*([\]}])/g, "$1")
        .trim();
      // Extract outermost JSON object if surrounded by text
      const braceStart = cleaned.indexOf("{");
      const braceEnd = cleaned.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd > braceStart) {
        cleaned = cleaned.slice(braceStart, braceEnd + 1);
      }
      const parsed = JSON.parse(cleaned);

      // Physiological range validation — skip values outside plausible ranges
      const fieldRanges: Record<string, [number, number]> = {
        bodyFatPercentage: [3, 60],
        leanBodyMass: [20, 150],
        skeletalMuscleMass: [10, 80],
        bmi: [10, 60],
        visceralFatLevel: [1, 30],
        basalMetabolicRate: [800, 4000],
        totalBodyWater: [10, 80],
      };

      // Build typed InBody data — parse strings to numbers as fallback (Qwen3-VL sometimes returns string numbers)
      const inBodyData: Record<string, number> = {};
      for (const [field, [min, max]] of Object.entries(fieldRanges)) {
        const val = parsed[field];
        if (val !== null && val !== undefined) {
          const num = typeof val === "number" ? val : parseFloat(String(val));
          if (!isNaN(num)) {
            if (num < min || num > max) {
              console.warn(
                `[OCR:extractInBodyData] ${field}=${num} outside range [${min}, ${max}], skipping`,
                { checkInId },
              );
            } else {
              inBodyData[field] = num;
            }
          }
        }
      }

      if (Object.keys(inBodyData).length > 0) {
        await ctx.runMutation(internal.checkInWorkflow.patchInBodyData, {
          checkInId,
          inBodyData,
        });
      } else {
        console.warn("[OCR:extractInBodyData] AI returned no extractable fields", {
          checkInId,
          rawText: text.slice(0, 200),
        });
      }
    } catch (err) {
      console.error("[OCR:extractInBodyData] Extraction failed", {
        checkInId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Non-critical — don't throw. The check-in still exists without InBody data.
      // The user can manually enter data or re-upload.
    }
  },
});
