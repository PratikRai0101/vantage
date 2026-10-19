/// <reference types="node" />
import test from "node:test";
import assert from "node:assert/strict";
import {
  ageText,
  brakeText,
  lapTime,
  numberText,
  teamColor,
} from "../src/components/replay-format";

test("lap formatting rounds before splitting minutes and seconds", () => {
  assert.equal(lapTime(59.9996), "1:00.000");
  assert.equal(lapTime(92.184), "1:32.184");
  assert.equal(lapTime(null), "—");
  assert.equal(lapTime(-1), "—");
  assert.equal(lapTime(Infinity), "—");
});
test("missing measurements never become zero or a brake-off assertion", () => {
  assert.equal(numberText(null, " km/h"), "—");
  assert.equal(numberText(NaN), "—");
  assert.equal(numberText(0, "%"), "0%");
  assert.equal(brakeText(null), "—");
  assert.equal(brakeText(0), "Off");
  assert.equal(brakeText(1), "On");
  assert.equal(ageText(null), "No source sample");
  assert.equal(ageText(4.29), "4.3s old");
});
test("team colors accept only valid recorded hex values", () => {
  assert.equal(teamColor("FF8700", "#FFFFFF"), "#FF8700");
  assert.equal(teamColor("#FF8700", "#FFFFFF"), "#FF8700");
  assert.equal(teamColor("invalid", "#FFFFFF"), "#FFFFFF");
  assert.equal(teamColor(null, "#FFFFFF"), "#FFFFFF");
});
