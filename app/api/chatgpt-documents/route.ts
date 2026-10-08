import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { apiError, guard, HttpError } from "@/lib/server";
import { requireUser } from "@/lib/local/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const directory = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  ".jeff-data",
  "chatgpt-course-documents",
);
const maxBytes = 20 * 1024 * 1024;
const allowedExtensions = new Set([
  ".csv",
  ".doc",
  ".docx",
  ".md",
  ".pdf",
  ".ppt",
  ".pptx",
  ".rtf",
  ".txt",
  ".xls",
  ".xlsx",
]);

type CourseDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

function safeId(value: string | null) {
  if (!value || !/^[0-9a-f-]{36}$/i.test(value))
    throw new HttpError(400, "That course document could not be found.");
  return value;
}

function metadataPath(id: string) {
  return path.join(directory, `${id}.json`);
}

function contentPath(id: string) {
  return path.join(directory, `${id}.bin`);
}

async function readMetadata(id: string) {
  try {
    return JSON.parse(await readFile(metadataPath(id), "utf8")) as CourseDocument;
  } catch {
    throw new HttpError(404, "That course document is no longer available.");
  }
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const id = new URL(request.url).searchParams.get("download");
    if (id) {
      const safe = safeId(id);
      const metadata = await readMetadata(safe);
      const content = await readFile(contentPath(safe)).catch(() => {
        throw new HttpError(404, "That course document is no longer available.");
      });
      const encodedName = encodeURIComponent(metadata.name);
      return new Response(content, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
          "Content-Length": String(content.byteLength),
          "Content-Type": metadata.type || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory);
    const documents = (
      await Promise.all(
        entries
          .filter((name) => name.endsWith(".json"))
          .map(async (name) => {
            try {
              return JSON.parse(
                await readFile(path.join(directory, name), "utf8"),
              ) as CourseDocument;
            } catch {
              return null;
            }
          }),
      )
    )
      .filter((item): item is CourseDocument => !!item)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    return Response.json(
      { documents },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser("admin");
    await guard(request, "chatgpt-document-upload", 20);
    if (Number(request.headers.get("content-length")) > maxBytes + 1024 * 1024)
      throw new HttpError(413, "Each course document must be 20 MB or smaller.");
    const form = await request.formData();
    const file = form.get("document");
    if (!(file instanceof File) || !file.size)
      throw new HttpError(400, "Choose a document to upload.");
    if (file.size > maxBytes)
      throw new HttpError(413, "Each course document must be 20 MB or smaller.");
    const name = path.basename(file.name).replace(/[\u0000-\u001f]/g, "").trim();
    if (!name || name.length > 180)
      throw new HttpError(400, "Please use a shorter document filename.");
    if (!allowedExtensions.has(path.extname(name).toLowerCase()))
      throw new HttpError(
        415,
        "Use a PDF, Word, PowerPoint, Excel, text, Markdown, RTF or CSV document.",
      );
    const document: CourseDocument = {
      id: randomUUID(),
      name,
      size: file.size,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
    };
    await mkdir(directory, { recursive: true });
    await writeFile(contentPath(document.id), Buffer.from(await file.arrayBuffer()), {
      flag: "wx",
      mode: 0o600,
    });
    try {
      await writeFile(metadataPath(document.id), JSON.stringify(document), {
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      await rm(contentPath(document.id), { force: true });
      throw error;
    }
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireUser("admin");
    await guard(request, "chatgpt-document-delete", 20);
    const id = safeId(new URL(request.url).searchParams.get("id"));
    await Promise.all([
      rm(contentPath(id), { force: true }),
      rm(metadataPath(id), { force: true }),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
