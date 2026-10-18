import { describe, expect, it } from "vitest";
import { availableSlots, DEFAULT_HOURS, isValidSlot } from "./schedule";

// 2026-10-19 é segunda-feira. 10:00 em São Paulo = 13:00 UTC.
const mondayMorning = new Date("2026-10-19T13:00:00Z");

describe("availableSlots", () => {
  it("respeita a antecedência mínima de 2h", () => {
    const slots = availableSlots(mondayMorning);
    // primeiro horário: 12:00 SP = 15:00 UTC
    expect(slots[0].toISOString()).toBe("2026-10-19T15:00:00.000Z");
  });

  it("não oferece horários depois do fechamento", () => {
    const slots = availableSlots(mondayMorning).filter((s) => s.toISOString().startsWith("2026-10-19"));
    // última fatia de segunda: 18:30 SP = 21:30 UTC (fecha às 19:00)
    expect(slots.at(-1)!.toISOString()).toBe("2026-10-19T21:30:00.000Z");
  });

  it("usa o horário reduzido de domingo", () => {
    const sunday = availableSlots(mondayMorning).filter((s) => s.toISOString().startsWith("2026-10-25T"));
    // domingo 08:00–13:00 SP => 11:00–16:00 UTC; última fatia 12:30 SP = 15:30 UTC
    expect(sunday[0].toISOString()).toBe("2026-10-25T11:00:00.000Z");
    expect(sunday.at(-1)!.toISOString()).toBe("2026-10-25T15:30:00.000Z");
  });

  it("não passa de 7 dias à frente", () => {
    const last = availableSlots(mondayMorning).at(-1)!;
    expect(last.getTime()).toBeLessThan(new Date("2026-10-27T03:00:00Z").getTime());
  });

  it("no fim do dia só oferece a partir do dia seguinte", () => {
    const late = new Date("2026-10-19T21:00:00Z"); // 18:00 SP
    expect(availableSlots(late)[0].toISOString()).toBe("2026-10-20T10:00:00.000Z"); // 07:00 SP
  });
});

describe("isValidSlot", () => {
  it("aceita um horário gerado e rejeita os demais", () => {
    expect(isValidSlot(new Date("2026-10-19T15:00:00Z"), mondayMorning)).toBe(true);
    expect(isValidSlot(new Date("2026-10-19T14:00:00Z"), mondayMorning)).toBe(false); // < 2h
    expect(isValidSlot(new Date("2026-10-19T15:10:00Z"), mondayMorning)).toBe(false); // fora da grade
    expect(isValidSlot(new Date("2026-10-19T23:00:00Z"), mondayMorning)).toBe(false); // fechado
    expect(isValidSlot(new Date("invalid"), mondayMorning)).toBe(false);
  });

  it("aceita horários personalizados da loja", () => {
    const hours = { ...DEFAULT_HOURS, weekdays: "09:00–12:00" };
    expect(isValidSlot(new Date("2026-10-20T12:00:00Z"), mondayMorning, hours)).toBe(true); // 09:00 SP
    expect(isValidSlot(new Date("2026-10-20T10:00:00Z"), mondayMorning, hours)).toBe(false); // 07:00 SP
  });
});
