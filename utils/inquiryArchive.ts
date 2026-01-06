type ArchiveState = {
  archivedAt: string | null;
  archivedAtDate: Date | null;
  isArchived: boolean;
};

const toValidDate = (value: Date | null) => {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }
  return value;
};

export const resolveArchiveState = (value: unknown): ArchiveState => {
  if (typeof value === "string") {
    const parsed = toValidDate(new Date(value));
    return {
      archivedAt: value,
      archivedAtDate: parsed,
      isArchived: Boolean(value),
    };
  }

  if (value instanceof Date) {
    const parsed = toValidDate(value);
    return {
      archivedAt: parsed ? parsed.toISOString() : null,
      archivedAtDate: parsed,
      isArchived: Boolean(parsed),
    };
  }

  if (value && typeof value === "object") {
    const record = value as {
      toDate?: () => Date;
      seconds?: number;
    };
    if (typeof record.toDate === "function") {
      const parsed = toValidDate(record.toDate());
      return {
        archivedAt: parsed ? parsed.toISOString() : null,
        archivedAtDate: parsed,
        isArchived: Boolean(parsed),
      };
    }
    if (typeof record.seconds === "number") {
      const parsed = toValidDate(new Date(record.seconds * 1000));
      return {
        archivedAt: parsed ? parsed.toISOString() : null,
        archivedAtDate: parsed,
        isArchived: Boolean(parsed),
      };
    }
  }

  return {
    archivedAt: null,
    archivedAtDate: null,
    isArchived: false,
  };
};

export type { ArchiveState };
