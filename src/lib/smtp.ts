import { connect, type TLSSocket } from "node:tls";

export type SmtpMail = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const wrap = (s: string) => s.replace(/(.{76})/g, "$1\r\n");
const bareAddress = (s: string) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim();
const noBreaks = (s: string) => s.replace(/[\r\n]+/g, " ");

/**
 * A small SMTP sender over an encrypted connection (port 465), so email works with Gmail
 * (use an "app password"), Brevo, or any host, without extra packages.
 */
export async function smtpSend(m: SmtpMail): Promise<void> {
  const socket: TLSSocket = await new Promise((resolve, reject) => {
    const s = connect({ host: m.host, port: m.port, servername: m.host }, () => resolve(s));
    s.setTimeout(15_000, () => s.destroy(new Error("The email server took too long to answer.")));
    s.once("error", reject);
  });

  let buffer = "";
  const waiters: Array<(r: { code: number; text: string }) => void> = [];
  const failAll = (err: Error) => {
    while (waiters.length) waiters.shift()!({ code: 0, text: err.message });
  };
  socket.on("data", (d) => {
    buffer += d.toString("utf8");
    // A reply is finished at a line like "250 text" (a dash after the code means more lines follow).
    for (;;) {
      const m2 = buffer.match(/^(?:\d{3}-.*\r?\n)*(\d{3}) .*\r?\n/);
      if (!m2) break;
      const text = buffer.slice(0, m2[0].length).trim();
      buffer = buffer.slice(m2[0].length);
      waiters.shift()?.({ code: Number(m2[1]), text });
    }
  });
  socket.on("error", (e) => failAll(e));
  socket.on("close", () => failAll(new Error("The email server closed the connection.")));

  const reply = () => new Promise<{ code: number; text: string }>((resolve) => waiters.push(resolve));
  const expect = async (ok: number[], what: string) => {
    const r = await reply();
    if (!ok.includes(r.code)) throw new Error(`${what}: ${r.text.slice(0, 160) || "no answer"}`);
  };
  const send = async (line: string, ok: number[], what: string) => {
    const p = reply();
    socket.write(line + "\r\n");
    const r = await p;
    if (!ok.includes(r.code)) throw new Error(`${what}: ${r.text.slice(0, 160) || "no answer"}`);
  };

  try {
    await expect([220], "Connecting");
    await send("EHLO nowbey.app", [250], "Greeting");
    await send("AUTH LOGIN", [334], "Login");
    await send(b64(m.user), [334], "Username");
    await send(b64(m.pass), [235], "Password rejected by the email server");
    await send(`MAIL FROM:<${bareAddress(m.from)}>`, [250], "Sender");
    await send(`RCPT TO:<${bareAddress(m.to)}>`, [250, 251], "Recipient");
    await send("DATA", [354], "Message");

    const boundary = `nb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const headers = [
      `From: ${noBreaks(m.from)}`,
      `To: ${noBreaks(m.to)}`,
      ...(m.replyTo ? [`Reply-To: ${noBreaks(m.replyTo)}`] : []),
      `Subject: =?UTF-8?B?${b64(noBreaks(m.subject))}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${boundary}@nowbey.app>`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];
    const part = (type: string, body: string) =>
      `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(b64(body))}\r\n`;
    const data = `${headers.join("\r\n")}\r\n\r\n${part("text/plain", m.text)}${part("text/html", m.html)}--${boundary}--\r\n`;
    // base64 lines can never start with ".", so no dot-stuffing is needed.
    const done = reply();
    socket.write(`${data}\r\n.\r\n`);
    const r = await done;
    if (r.code !== 250) throw new Error(`Sending: ${r.text.slice(0, 160)}`);
    socket.write("QUIT\r\n");
  } finally {
    socket.end();
  }
}
