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

import { string } from "../../../../../src/utils/validation";
import describeValidation from "../../../helpers/describeValidation";

describe("validation::default", () => {
  describeValidation("default string", string().default("my default"), [
    { value: null, expected: "my default" },
    { value: undefined, expected: "my default" },
    { value: "" },
    { value: "hello" }
  ]);
});
