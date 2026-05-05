import { existsSync } from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import { generateSheetHTML, type SheetData } from "@/lib/sheetTemplate";

export const runtime = "nodejs";

type ChromiumModule = typeof import("@sparticuz/chromium");

async function getChromium() {
  if (process.env.VERCEL) {
    process.env.AWS_EXECUTION_ENV ??= "AWS_Lambda_nodejs20.x";
    process.env.FONTCONFIG_PATH ??= "/tmp/fonts";
    process.env.LD_LIBRARY_PATH = [
      "/tmp/al2023/lib",
      ...(process.env.LD_LIBRARY_PATH ?? "").split(":").filter(Boolean)
    ]
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(":");
  }

  const chromium = (await import("@sparticuz/chromium")).default as ChromiumModule;
  return chromium;
}

async function getExecutablePath(chromium: ChromiumModule) {
  if (process.env.VERCEL) {
    return chromium.executablePath(path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin"));
  }

  const localPaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean) as string[];

  const localPath = localPaths.find((path) => existsSync(path));
  return localPath ?? chromium.executablePath();
}

export async function POST(req: Request) {
  const data = (await req.json()) as SheetData;
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const html = generateSheetHTML(data, origin);
  const chromium = await getChromium();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await getExecutablePath(chromium),
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (document.fonts) {
          document.fonts.ready.then(() => resolve());
        } else {
          resolve();
        }
      });
    });

    // Extra wait for math rendering
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "10mm", bottom: "10mm", left: "12mm", right: "12mm" }
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="RajAcademy_Class${data.class}_${data.date}.pdf"`
      }
    });
  } finally {
    await browser.close();
  }
}
