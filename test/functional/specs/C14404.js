import fixtureFactory from "../helpers/fixtureFactory";
import configureAlloyInstance from "../helpers/configureAlloyInstance";
import createNetworkLogger from "../helpers/networkLogger";

import {
  compose,
  orgMainConfigMain,
  consentPending
} from "../helpers/constants/configParts";

const config = compose(
  orgMainConfigMain,
  consentPending
);

const networkLogger = createNetworkLogger();

fixtureFactory({
  title:
    "C14404: User cannot consent to all purposes after consenting to no purposes",
  requestHooks: [networkLogger.edgeEndpointLogs]
});

test.meta({
  ID: "C14404",
  SEVERITY: "P0",
  TEST_RUN: "Regression"
});

test("Test C14404: User cannot consent to all purposes after consenting to no purposes", async t => {
  await configureAlloyInstance("alloy", config);
  await t.eval(() => window.alloy("setConsent", { general: "out" }));
  const setConsentErrorMessage = await t.eval(() =>
    window
      .alloy("setConsent", { general: "in" })
      .then(() => undefined, e => e.message)
  );
  await t
    .expect(setConsentErrorMessage)
    .ok("Expected the setConsent command to be rejected");
  await t
    .expect(setConsentErrorMessage)
    .contains("The user previously declined consent, which cannot be changed.");

  // make sure the instance still has no consent
  const eventErrorMessage = await t.eval(() =>
    window
      .alloy("event", { data: { a: 1 } })
      .then(() => undefined, e => e.message)
  );
  await t
    .expect(eventErrorMessage)
    .ok("Expected the event command to be rejected");
  await t.expect(eventErrorMessage).contains("The user declined consent.");
  // make sure no event requests went out
  await t.expect(networkLogger.edgeEndpointLogs.requests.length).eql(0);
});
