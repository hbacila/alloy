import { RequestLogger, t, ClientFunction } from "testcafe";
import createFixture from "../../helpers/createFixture";

import {
  compose,
  orgMainConfigMain,
  orgAltConfigAlt,
  debugEnabled,
  migrationDisabled
} from "../../helpers/constants/configParts";

import { edgeConfigId } from "../../helpers/edgeInfo";

import configureAlloyInstance from "../../helpers/configureAlloyInstance";

const mainConfig = compose(orgMainConfigMain, debugEnabled, migrationDisabled);
const altConfig = compose(orgAltConfigAlt, debugEnabled, migrationDisabled);

const networkLoggerConfig = {
  logRequestBody: true,
  stringifyRequestBody: true
};
const networkLogger1 = RequestLogger(
  /v1\/(interact|collect)\?configId=9999999/,
  networkLoggerConfig
);

const networkLogger2 = RequestLogger(
  new RegExp(`v1\\/(interact|collect)\\?configId=${edgeConfigId}`),
  networkLoggerConfig
);

createFixture({
  title: "C2579: Isolates multiple SDK instances",
  requestHooks: [networkLogger1, networkLogger2]
});

test.meta({
  ID: "C2579",
  SEVERITY: "P0",
  TEST_RUN: "Regression"
});

const getIdentityCookieValue = request => {
  const payload = JSON.parse(request.request.body);
  if (!payload.meta.state.entries) {
    return undefined;
  }
  const identityEntry = payload.meta.state.entries.find(entry =>
    entry.key.includes("_identity")
  );
  return identityEntry.value;
};

const instance1Config = () => configureAlloyInstance(altConfig);

const instance1Event = ClientFunction(() => window.alloy("sendEvent"));

const instance2Config = () => configureAlloyInstance("instance2", mainConfig);

const instance2Event = ClientFunction(() => window.instance2("sendEvent"));

test("Test C2579: Separate ECIDs are used for multiple SDK instances.", async () => {
  await instance1Config();
  await instance2Config();
  await instance1Event();
  await instance2Event();
  await instance1Event();
  await instance2Event();

  await t.expect(networkLogger1.requests.length).eql(2);
  await t.expect(networkLogger2.requests.length).eql(2);
  const id1a = getIdentityCookieValue(networkLogger1.requests[0]);
  const id1b = getIdentityCookieValue(networkLogger1.requests[1]);
  const id2a = getIdentityCookieValue(networkLogger2.requests[0]);
  const id2b = getIdentityCookieValue(networkLogger2.requests[1]);

  await t.expect(id1a).eql(undefined);
  await t.expect(id1b).notEql(undefined);
  await t.expect(id2a).eql(undefined);
  await t.expect(id2b).notEql(undefined);
  await t.expect(id1b).notEql(id2b);
});
