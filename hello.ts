import { Context, Hono } from "https://deno.land/x/hono@v3.10.2/mod.ts";
import { hmac } from "https://deno.land/x/hmac/mod.ts";

const app = new Hono();

const WEBHOOK_SECRET = Deno.env.get("LINEAR_WEBHOOK_SECRET");
if (!WEBHOOK_SECRET) {
  throw new Error("webhook secret must be provided");
}

app.post("/", async (c: Context) => {
  console.log(c.body);
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
    c.text("Wrong request.", 400);
    return;
  }

  const payload = await c.req.json();
  console.log(payload);

  // Do something neat with the data received!

  // Finally, respond with a HTTP 200 to signal all good
  return c.text("Done.", 200);
});

Deno.serve(app.fetch);
