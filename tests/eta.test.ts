import assert from "node:assert/strict";
import test from "node:test";
import { estimateEtas } from "@/lib/eta";

const stops = [
  { name: "South", lat: 23.75, lng: 90.4 },
  { name: "Middle", lat: 23.76, lng: 90.4 },
  { name: "North", lat: 23.77, lng: 90.4 },
];

test("ETA follows the stored order when heading north", () => {
  const result = estimateEtas({ latitude: 23.755, longitude: 90.4, heading: 0, speed: 5, lastUpdatedAt: new Date() }, stops);
  assert.equal(result.direction, "forward");
  assert.equal(result.nextStopIndex, 1);
  assert.ok(result.etas[1].etaMinutes !== null);
  assert.equal(result.etas[0].etaMinutes, null);
});

test("ETA reverses the stop sequence when heading south", () => {
  const result = estimateEtas({ latitude: 23.765, longitude: 90.4, heading: 180, speed: 5, lastUpdatedAt: new Date() }, stops);
  assert.equal(result.direction, "reverse");
  assert.equal(result.nextStopIndex, 1);
  assert.ok(result.etas[1].etaMinutes !== null);
  assert.equal(result.etas[2].etaMinutes, null);
});

test("ETA rejects vehicles far away from the route", () => {
  const result = estimateEtas({ latitude: 24, longitude: 91, heading: 0, speed: null, lastUpdatedAt: new Date() }, stops);
  assert.equal(result.nextStopIndex, -1);
  assert.ok(result.etas.every((entry) => entry.etaMinutes === null));
});
