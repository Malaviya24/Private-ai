import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCooldownResponse, startCooldown } from "@/lib/request-cooldown";
import { buildContactRows, parseVcf } from "@/lib/vcf-parser";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const VCF_HINT = /^BEGIN:VCARD/im;

function sanitizeBaseName(value: string) {
  const trimmed = value
    .replace(/\.vcf$/i, "")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return trimmed || "contacts";
}

export async function POST(request: NextRequest) {
  const cooldownResponse = getCooldownResponse(request, "vcf-to-xlsx");

  if (cooldownResponse) {
    return cooldownResponse;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not read the uploaded form. Please try again." },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Attach a .vcf contacts file before uploading." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "The selected file is empty." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File is larger than 10 MB. Please split it into smaller parts." },
      { status: 413 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const text = decoder.decode(arrayBuffer);

  if (!VCF_HINT.test(text)) {
    return NextResponse.json(
      { error: "This file does not look like a vCard (.vcf) file." },
      { status: 400 }
    );
  }

  const contacts = parseVcf(text);

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "No contacts were found inside the uploaded file." },
      { status: 400 }
    );
  }

  const { rows } = buildContactRows(contacts);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Auto-size columns based on header and value width.
  const columnWidths = rows[0].map((_, columnIndex) => {
    let max = 10;
    for (const row of rows) {
      const cell = row[columnIndex];
      const length = cell == null ? 0 : String(cell).length;
      if (length > max) {
        max = length;
      }
    }
    return { wch: Math.min(max + 2, 60) };
  });

  worksheet["!cols"] = columnWidths;
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true
  }) as Buffer;

  startCooldown(request, "vcf-to-xlsx");

  const baseName = sanitizeBaseName(file.name || "contacts");
  const filename = `${baseName}-contacts.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
      "X-Contact-Count": String(contacts.length)
    }
  });
}
