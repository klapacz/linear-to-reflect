import { Context, Hono } from "https://deno.land/x/hono@v3.10.2/mod.ts";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";
import { z } from "https://deno.land/x/zod/mod.ts";

const app = new Hono();

const WEBHOOK_SECRET = Deno.env.get("LINEAR_WEBHOOK_SECRET");
if (!WEBHOOK_SECRET) {
  throw new Error("webhook secret must be provided");
}

const baseLinearSchema = z.object({
  action: z.string(),
});

const createActionLinearSchema = z.object({
  action: z.literal("create"),
  data: z.object({
    title: z.string(),
    identifier: z.string(),
    url: z.string().url(),
    assignee: z
      .object({
        name: z.string(),
      })
      .optional(),
    description: z.string().optional(),
  }),
});

app.post("/", async (c: Context) => {
  const rawBody = await c.req.arrayBuffer();
  const linearSignature = c.req.header("linear-signature");

  // Verify signature
  const calculatedHmac = hmac(
    "sha256",
    WEBHOOK_SECRET,
    new Uint8Array(rawBody),
    "utf8",
    "hex"
  );
  if (calculatedHmac !== linearSignature) {
    c.json({ message: "Bad request." }, 400);
    return;
  }

  const okResponse = c.json({ status: "Ok." }, 200);

  const rawPayload = JSON.parse(new TextDecoder().decode(rawBody));
  const parsedBasePayload = baseLinearSchema.safeParse(rawPayload);

  if (!parsedBasePayload.success) {
    console.log("No action specified.", parsedBasePayload.error);
    return okResponse;
  }
  if (parsedBasePayload.data.action !== "create") {
    return okResponse;
  }

  const parsedCreateActionPayload =
    createActionLinearSchema.safeParse(rawPayload);
  if (!parsedCreateActionPayload.success) {
    console.log("Wrong action payload", parsedCreateActionPayload.error);
    return okResponse;
  }

  console.log({ data: parsedCreateActionPayload.data });

  // Do something neat with the data received!

  // Finally, respond with a HTTP 200 to signal all good
  return okResponse;
});

Deno.serve(app.fetch);
