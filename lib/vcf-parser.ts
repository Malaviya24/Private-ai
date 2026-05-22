export type VcfContact = {
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  prefix: string;
  suffix: string;
  organization: string;
  title: string;
  phones: { type: string; value: string }[];
  emails: { type: string; value: string }[];
  addresses: { type: string; value: string }[];
  birthday: string;
  note: string;
  url: string;
};

const VCARD_BEGIN = /^BEGIN:VCARD\s*$/i;
const VCARD_END = /^END:VCARD\s*$/i;

function unfoldLines(text: string): string[] {
  // vCard line folding: a line that begins with a space or tab is a
  // continuation of the previous line. Strip the leading whitespace.
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  const lines: string[] = [];

  for (const line of rawLines) {
    if (line.length === 0) {
      lines.push("");
      continue;
    }

    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }

  return lines;
}

function decodeQuotedPrintable(value: string, charset: string): string {
  // Quoted-printable: =XX hex pairs. Soft line breaks ("=" at end of line) are
  // already handled by unfolding. Some exporters split soft breaks across
  // physical lines that did NOT begin with a space, so also drop trailing "=".
  const cleaned = value.replace(/=\r?\n/g, "");
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];

    if (char === "=" && i + 2 < cleaned.length) {
      const hex = cleaned.slice(i + 1, i + 3);

      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }

    bytes.push(char.charCodeAt(0));
  }

  try {
    const decoder = new TextDecoder(charset || "utf-8", { fatal: false });
    return decoder.decode(new Uint8Array(bytes));
  } catch {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    return decoder.decode(new Uint8Array(bytes));
  }
}

function unescapeValue(value: string): string {
  // vCard 3.0/4.0 escape sequences inside values.
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

type ParsedLine = {
  name: string;
  params: Record<string, string[]>;
  value: string;
};

function parseLine(rawLine: string): ParsedLine | null {
  if (!rawLine) {
    return null;
  }

  const colonIndex = rawLine.indexOf(":");

  if (colonIndex === -1) {
    return null;
  }

  const head = rawLine.slice(0, colonIndex);
  let value = rawLine.slice(colonIndex + 1);

  const segments = head.split(";");
  // The first segment may include a "group." prefix (e.g. "item1.TEL"). Drop it.
  const nameWithGroup = segments.shift() || "";
  const name = nameWithGroup.includes(".")
    ? nameWithGroup.split(".").slice(1).join(".").toUpperCase()
    : nameWithGroup.toUpperCase();

  const params: Record<string, string[]> = {};

  for (const segment of segments) {
    if (!segment) continue;
    const eqIndex = segment.indexOf("=");

    if (eqIndex === -1) {
      // Bare parameter like "HOME" (vCard 2.1 style).
      const key = "TYPE";
      const list = params[key] || [];
      list.push(segment.toUpperCase());
      params[key] = list;
      continue;
    }

    const paramKey = segment.slice(0, eqIndex).toUpperCase();
    const paramValueRaw = segment.slice(eqIndex + 1);
    const paramValues = paramValueRaw
      .split(",")
      .map((part) => part.replace(/^"|"$/g, ""))
      .filter(Boolean);

    const list = params[paramKey] || [];
    list.push(...paramValues.map((part) => part.toUpperCase()));
    params[paramKey] = list;
  }

  const encoding = (params.ENCODING || []).join(",").toUpperCase();
  const charset = (params.CHARSET || ["utf-8"])[0]?.toLowerCase() || "utf-8";

  if (encoding.includes("QUOTED-PRINTABLE")) {
    value = decodeQuotedPrintable(value, charset);
  }

  return {
    name,
    params,
    value
  };
}

function pickType(params: Record<string, string[]>, fallback = ""): string {
  const types = params.TYPE || [];
  const filtered = types.filter((type) => type && type !== "INTERNET" && type !== "PREF");
  return (filtered[0] || fallback || "").toLowerCase();
}

function emptyContact(): VcfContact {
  return {
    fullName: "",
    firstName: "",
    lastName: "",
    middleName: "",
    prefix: "",
    suffix: "",
    organization: "",
    title: "",
    phones: [],
    emails: [],
    addresses: [],
    birthday: "",
    note: "",
    url: ""
  };
}

export function parseVcf(text: string): VcfContact[] {
  const lines = unfoldLines(text);
  const contacts: VcfContact[] = [];
  let current: VcfContact | null = null;

  for (const rawLine of lines) {
    if (!rawLine) continue;

    if (VCARD_BEGIN.test(rawLine)) {
      current = emptyContact();
      continue;
    }

    if (VCARD_END.test(rawLine)) {
      if (current) {
        if (!current.fullName) {
          const composed = [current.firstName, current.middleName, current.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          current.fullName = composed || current.organization || (current.phones[0]?.value ?? "");
        }
        contacts.push(current);
      }
      current = null;
      continue;
    }

    if (!current) continue;

    const parsed = parseLine(rawLine);

    if (!parsed) continue;

    const value = unescapeValue(parsed.value);

    switch (parsed.name) {
      case "FN":
        current.fullName = value.trim();
        break;
      case "N": {
        const parts = parsed.value.split(";");
        current.lastName = unescapeValue(parts[0] || "").trim();
        current.firstName = unescapeValue(parts[1] || "").trim();
        current.middleName = unescapeValue(parts[2] || "").trim();
        current.prefix = unescapeValue(parts[3] || "").trim();
        current.suffix = unescapeValue(parts[4] || "").trim();
        break;
      }
      case "ORG": {
        const parts = parsed.value.split(";").map((part) => unescapeValue(part).trim()).filter(Boolean);
        current.organization = parts.join(" - ");
        break;
      }
      case "TITLE":
        current.title = value.trim();
        break;
      case "TEL": {
        const phone = value.replace(/\s+/g, " ").trim();
        if (phone) {
          current.phones.push({
            type: pickType(parsed.params, "phone"),
            value: phone
          });
        }
        break;
      }
      case "EMAIL": {
        const email = value.trim();
        if (email) {
          current.emails.push({
            type: pickType(parsed.params, "email"),
            value: email
          });
        }
        break;
      }
      case "ADR": {
        const parts = parsed.value.split(";").map((part) => unescapeValue(part).trim());
        // ADR fields: PO Box; Extended; Street; Locality; Region; Postal; Country
        const compact = [parts[2], parts[3], parts[4], parts[5], parts[6]]
          .filter(Boolean)
          .join(", ");
        if (compact) {
          current.addresses.push({
            type: pickType(parsed.params, "address"),
            value: compact
          });
        }
        break;
      }
      case "BDAY":
        current.birthday = value.trim();
        break;
      case "NOTE":
        current.note = value.trim();
        break;
      case "URL":
        current.url = value.trim();
        break;
      default:
        break;
    }
  }

  return contacts;
}

export function buildContactRows(contacts: VcfContact[]) {
  const maxPhones = contacts.reduce((max, contact) => Math.max(max, contact.phones.length), 0);
  const maxEmails = contacts.reduce((max, contact) => Math.max(max, contact.emails.length), 0);
  const maxAddresses = contacts.reduce((max, contact) => Math.max(max, contact.addresses.length), 0);

  const headers: string[] = [
    "Full Name",
    "First Name",
    "Last Name",
    "Middle Name",
    "Prefix",
    "Suffix",
    "Organization",
    "Title"
  ];

  for (let i = 0; i < Math.max(1, maxPhones); i += 1) {
    headers.push(`Phone ${i + 1}`);
    headers.push(`Phone ${i + 1} Type`);
  }

  for (let i = 0; i < Math.max(1, maxEmails); i += 1) {
    headers.push(`Email ${i + 1}`);
    headers.push(`Email ${i + 1} Type`);
  }

  for (let i = 0; i < Math.max(1, maxAddresses); i += 1) {
    headers.push(`Address ${i + 1}`);
    headers.push(`Address ${i + 1} Type`);
  }

  headers.push("Birthday", "Website", "Note");

  const rows: (string | number)[][] = [headers];

  for (const contact of contacts) {
    const row: (string | number)[] = [
      contact.fullName,
      contact.firstName,
      contact.lastName,
      contact.middleName,
      contact.prefix,
      contact.suffix,
      contact.organization,
      contact.title
    ];

    for (let i = 0; i < Math.max(1, maxPhones); i += 1) {
      row.push(contact.phones[i]?.value || "");
      row.push(contact.phones[i]?.type || "");
    }

    for (let i = 0; i < Math.max(1, maxEmails); i += 1) {
      row.push(contact.emails[i]?.value || "");
      row.push(contact.emails[i]?.type || "");
    }

    for (let i = 0; i < Math.max(1, maxAddresses); i += 1) {
      row.push(contact.addresses[i]?.value || "");
      row.push(contact.addresses[i]?.type || "");
    }

    row.push(contact.birthday, contact.url, contact.note);

    rows.push(row);
  }

  return { rows, headers };
}
