import { runScenarioTestVectors } from "../shared/scenario.mjs";
import { createScenario } from "../scenario/scenario.mjs";
import { EXPECTED_SCENARIO_METADATA } from "../scenario/metadata.mjs";

const scenario = createScenario(EXPECTED_SCENARIO_METADATA);
const results = await runScenarioTestVectors(scenario);
if (results.length < 4) throw new Error("scenario must include all required offline vector kinds");
console.log(`Offline gate check passed: ${scenario.id} · ${results.length} vectors`);
