/**
 * Packed tuple: [number, name, lat, lng, typeIndex, headingLat, headingLng].
 * Roughly a fifth the size of the object form, which matters at 2,800 entries.
 */
export type PackedTrain = [string, string, number, number, number, number, number];

/** List/React identity. Index is required because train numbers repeat in the live pack. */
export function packedTrainKey(train: PackedTrain, index: number): string {
  return `${index}:${train[0]}:${train[2]}:${train[3]}`;
}

function packedTupleId(train: PackedTrain): string {
  return train.join("\u001f");
}

/** Drop bitwise-identical tuples. Same number at two positions is kept twice. */
export function uniquePackedTrains(trains: PackedTrain[]): PackedTrain[] {
  const seen = new Set<string>();
  const out: PackedTrain[] = [];
  for (const train of trains) {
    const id = packedTupleId(train);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(train);
  }
  return out;
}
