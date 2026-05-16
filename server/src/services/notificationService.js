export async function notify({ type, recipient, subject, body, metadata = {} }) {
  // Demo-friendly notification hook: production can wire SMTP or Teams webhooks via env.
  console.log(
    JSON.stringify(
      {
        type,
        recipient,
        subject,
        body,
        metadata,
        sentAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}
