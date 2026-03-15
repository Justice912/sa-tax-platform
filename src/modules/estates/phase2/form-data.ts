export function readRequiredString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function readOptionalString(formData: FormData, name: string) {
  const value = readRequiredString(formData, name);
  return value || undefined;
}

export function readRequiredNumber(formData: FormData, name: string) {
  const value = Number(readRequiredString(formData, name));
  return Number.isFinite(value) ? value : 0;
}

export function readOptionalNumber(formData: FormData, name: string) {
  const value = readRequiredString(formData, name);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on";
}
