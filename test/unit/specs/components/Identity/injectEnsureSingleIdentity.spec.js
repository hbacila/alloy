/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import injectEnsureSingleIdentity from "../../../../../src/components/Identity/injectEnsureSingleIdentity";
import { defer } from "../../../../../src/utils";
import flushPromiseChains from "../../../helpers/flushPromiseChains";

describe("Identity::injectEnsureSingleIdentity", () => {
  let doesIdentityCookieExist;
  let setDomainForInitialIdentityPayload;
  let addLegacyEcidToPayload;
  let awaitIdentityCookie;
  let logger;
  let ensureSingleIdentity;

  let sentIndex;
  let recievedIndex;
  let payloads;
  let requestsSentYet;
  let awaitIdentityDeferreds;
  let onResponse;
  let onRequestFailure;
  let doesIdentityCookieExistBoolean;

  beforeEach(() => {
    logger = jasmine.createSpyObj("logger", ["log"]);

    sentIndex = 0;
    recievedIndex = 0;
    payloads = [];
    requestsSentYet = [];
    awaitIdentityDeferreds = [];
    doesIdentityCookieExistBoolean = false;

    setDomainForInitialIdentityPayload = payload => {
      payload.domain = "initialIdentityDomain";
    };
    addLegacyEcidToPayload = payload => {
      payload.legacyId = "legacyId";
      return Promise.resolve();
    };
    awaitIdentityCookie = () => {
      const deferred = defer();
      awaitIdentityDeferreds.push(deferred);
      return deferred.promise;
    };
    doesIdentityCookieExist = () => doesIdentityCookieExistBoolean;
  });

  const setup = () => {
    ensureSingleIdentity = injectEnsureSingleIdentity({
      doesIdentityCookieExist,
      setDomainForInitialIdentityPayload,
      addLegacyEcidToPayload,
      awaitIdentityCookie,
      logger
    });
  };

  const sendRequest = () => {
    const payload = { id: sentIndex };
    payloads.push(payload);
    onResponse = jasmine.createSpy("onResponse");
    onRequestFailure = jasmine.createSpy("onRequestFailure");
    const i = sentIndex;
    requestsSentYet.push(false);
    ensureSingleIdentity({
      payload,
      onResponse,
      onRequestFailure
    }).then(() => {
      requestsSentYet[i] = true;
    });

    sentIndex += 1;
  };
  const simulateResponseWithIdentity = () => {
    doesIdentityCookieExist = true;
    awaitIdentityDeferreds[recievedIndex].resolve();
    recievedIndex += 1;
  };
  const simulateResponseWithoutIdentity = () => {
    awaitIdentityDeferreds[recievedIndex].reject();
    recievedIndex += 1;
  };

  it("allows first request to proceed and pauses subsequent requests until identity cookie exists", () => {
    setup();
    return Promise.resolve()
      .then(() => {
        sendRequest();
        sendRequest();
        sendRequest();
        return flushPromiseChains();
      })
      .then(() => {
        expect(requestsSentYet).toEqual([true, false, false]);
        simulateResponseWithIdentity();
        return flushPromiseChains();
      })
      .then(() => {
        expect(requestsSentYet).toEqual([true, true, true]);
        expect(payloads).toEqual([
          { id: 0, domain: "initialIdentityDomain", legacyId: "legacyId" },
          { id: 1 },
          { id: 2 }
        ]);
        sendRequest();
        return flushPromiseChains();
      })
      .then(() => {
        expect(payloads[3]).toEqual({ id: 3 });
        expect(requestsSentYet[3]).toEqual(true);
      });
  });

  it("allows the second request to be called if the first doesn't set the cookie, but still holds up the third", () => {
    setup();
    return Promise.resolve()
      .then(() => {
        sendRequest();
        sendRequest();
        sendRequest();
        sendRequest();
        return flushPromiseChains();
      })
      .then(() => {
        expect(requestsSentYet).toEqual([true, false, false, false]);
        simulateResponseWithoutIdentity();
        return flushPromiseChains();
      })
      .then(() => {
        expect(requestsSentYet).toEqual([true, true, false, false]);
        simulateResponseWithIdentity();
        return flushPromiseChains();
      })
      .then(() => {
        expect(requestsSentYet).toEqual([true, true, true, true]);
        expect(payloads).toEqual([
          { id: 0, domain: "initialIdentityDomain", legacyId: "legacyId" },
          { id: 1, domain: "initialIdentityDomain", legacyId: "legacyId" },
          { id: 2 },
          { id: 3 }
        ]);
      });
  });

  it("logs messages", () => {
    setup();
    return Promise.resolve()
      .then(() => {
        sendRequest();
        return flushPromiseChains();
      })
      .then(() => {
        expect(logger.log).not.toHaveBeenCalled();
        sendRequest();
        return flushPromiseChains();
      })
      .then(() => {
        expect(logger.log).toHaveBeenCalledWith(
          "Delaying request while retrieving ECID from server."
        );
        simulateResponseWithIdentity();
        return flushPromiseChains();
      })
      .then(() => {
        expect(logger.log).toHaveBeenCalledWith(
          "Resuming previously delayed request."
        );
      });
  });

  it("sends a message if we have an identity cookie", () => {
    doesIdentityCookieExistBoolean = true;
    setup();
    return Promise.resolve()
      .then(() => {
        sendRequest();
        return flushPromiseChains();
      })
      .then(() => {
        expect(requestsSentYet).toEqual([true]);
        expect(payloads).toEqual([{ id: 0 }]);
      });
  });

  it("calls awaitIdentityCookie with the correct parameters", () => {
    awaitIdentityCookie = jasmine.createSpy("awaitIdentityCookie");
    setup();
    sendRequest();
    expect(awaitIdentityCookie).toHaveBeenCalledWith({
      onResponse,
      onRequestFailure
    });
  });
});
