import { describe, expect, it } from "vitest";
import { parseIntent, parseDate } from "@/lib/voice/intent";

const TODAY = "2026-08-27"; // a Thursday

describe("voice intent parsing", () => {
  describe("dates", () => {
    it("reads relative days", () => {
      expect(parseDate("leaving today", TODAY)).toBe("2026-08-27");
      expect(parseDate("tomorrow please", TODAY)).toBe("2026-08-28");
      expect(parseDate("day after tomorrow", TODAY)).toBe("2026-08-29");
    });

    it("reads weekday names, always forward", () => {
      expect(parseDate("on friday", TODAY)).toBe("2026-08-28");
      expect(parseDate("on monday", TODAY)).toBe("2026-08-31");
      // Today is Thursday, so plain "thursday" means the next one.
      expect(parseDate("on thursday", TODAY)).toBe("2026-09-03");
    });

    it("reads explicit dates in either order", () => {
      expect(parseDate("on 5 september", TODAY)).toBe("2026-09-05");
      expect(parseDate("september 12", TODAY)).toBe("2026-09-12");
    });

    it("rolls a date that has already passed into next year", () => {
      expect(parseDate("on 3 january", TODAY)).toBe("2027-01-03");
    });

    it("returns nothing when no date was spoken", () => {
      expect(parseDate("trains to mumbai", TODAY)).toBeUndefined();
    });
  });

  describe("intents", () => {
    it("routes a five-digit train number to live status", () => {
      for (const said of ["where is train 12951", "12951 status", "live status of 12951"]) {
        const intent = parseIntent(said, TODAY);
        expect(intent.kind, said).toBe("trainStatus");
        expect(intent.trainNumber).toBe("12951");
        expect(intent.href).toBe("/trains/12951");
      }
    });

    it("routes a ten-digit PNR", () => {
      const intent = parseIntent("check pnr 4603633563", TODAY);
      expect(intent.kind).toBe("pnrStatus");
      expect(intent.pnr).toBe("4603633563");
      expect(intent.href).toBe("/trips/4603633563");
    });

    it("does not mistake a bare ten-digit number for a PNR", () => {
      expect(parseIntent("9876543210", TODAY).kind).not.toBe("pnrStatus");
    });

    it("pulls both stations and a date out of a search", () => {
      const intent = parseIntent("show me trains from Delhi to Mumbai tomorrow", TODAY);
      expect(intent.kind).toBe("search");
      expect(intent.fromQuery).toBe("Delhi".toLowerCase());
      expect(intent.toQuery).toBe("Mumbai".toLowerCase());
      expect(intent.dateIso).toBe("2026-08-28");
      expect(intent.needsResolution).toBe(true);
    });

    it("handles the terse form without 'from'", () => {
      const intent = parseIntent("Bengaluru to Kozhikode on friday", TODAY);
      expect(intent.kind).toBe("search");
      expect(intent.fromQuery).toBe("bengaluru");
      expect(intent.toQuery).toBe("kozhikode");
      expect(intent.dateIso).toBe("2026-08-28");
    });

    it("defaults a search with no spoken date to today", () => {
      expect(parseIntent("trains from Patna to Delhi", TODAY).dateIso).toBe(TODAY);
    });

    it("strips filler words out of station names", () => {
      const intent = parseIntent("please find me any trains from the Delhi to Mumbai for tomorrow", TODAY);
      expect(intent.fromQuery).toBe("delhi");
      expect(intent.toQuery).toBe("mumbai");
    });

    it("routes the standalone destinations", () => {
      expect(parseIntent("show the live map", TODAY).href).toBe("/map");
      expect(parseIntent("my trips", TODAY).href).toBe("/trips");
      expect(parseIntent("my bookings", TODAY).href).toBe("/trips");
    });

    it("offers help, and admits when it has no idea", () => {
      expect(parseIntent("what can you do", TODAY).kind).toBe("help");
      const puzzled = parseIntent("the weather is nice", TODAY);
      expect(puzzled.kind).toBe("unknown");
      // It repeats what it heard rather than silently doing nothing.
      expect(puzzled.reply).toContain("the weather is nice");
    });

    it("never returns an empty reply for a resolved intent", () => {
      for (const said of ["12951", "pnr 4603633563", "live map", "my trips", "help", "nonsense words"]) {
        const intent = parseIntent(said, TODAY);
        if (!intent.needsResolution) expect(intent.reply.length, said).toBeGreaterThan(0);
      }
    });
  });
});
