import validateUserEventOptions from "./validateUserEventOptions";
import clone from "../../utils/clone";

/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const createDataCollector = ({ eventManager, logger }) => {
  return {
    commands: {
      sendEvent: {
        documentationUri: "https://adobe.ly/2r0uUjh",
        optionsValidator: options => {
          return validateUserEventOptions({ options, logger });
        },
        run: options => {
          const {
            xdm,
            data,
            documentUnloading = false,
            type,
            mergeId,
            renderDecisions = false,
            decisionScopes = [],
            datasetId
          } = options;
          const event = eventManager.createEvent();

          if (documentUnloading) {
            event.documentMayUnload();
          }

          if (xdm) {
            // Clone xdm in case the customer modifies the object
            // between now and the time it gets sent to the server.
            event.setUserXdm(clone(xdm));
          }

          if (data) {
            // Clone data in case the customer modifies the object
            // between now and the time it gets sent to the server.
            event.setUserData(clone(data));
          }

          if (type) {
            event.mergeXdm({
              eventType: type
            });
          }

          if (mergeId) {
            event.mergeXdm({
              eventMergeId: mergeId
            });
          }

          if (datasetId) {
            event.mergeMeta({
              collect: {
                datasetId
              }
            });
          }

          return eventManager.sendEvent(event, {
            renderDecisions,
            decisionScopes
          });
        }
      }
    }
  };
};

createDataCollector.namespace = "DataCollector";
createDataCollector.configValidators = {};

export default createDataCollector;
