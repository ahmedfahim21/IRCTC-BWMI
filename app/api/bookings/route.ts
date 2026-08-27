import { listBookings } from "@/lib/mock/bookings";
import { getWorld } from "@/lib/mock/seed";
import { handler, json } from "@/lib/api/http";
import { stationSidecar } from "@/lib/api/dto";

/** Every trip, past and future. Drives the trips list and the home screen's live card. */
export const GET = handler(async () => {
  const world = getWorld();
  const bookings = listBookings();
  const codes = new Set<string>();
  for (const b of bookings) {
    codes.add(b.fromCode);
    codes.add(b.toCode);
  }
  return json({
    bookings,
    trains: Object.fromEntries(
      bookings.map((b) => {
        const t = world.trains.get(b.trainNumber)!;
        return [b.trainNumber, { number: t.number, name: t.name, type: t.type, avgDelayMins: t.avgDelayMins }];
      })
    ),
    stations: stationSidecar(codes, world.stations),
  });
});
