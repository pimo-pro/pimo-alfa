import { createRulesStore } from "../shared/createRulesStore";
import { ROOM_RULES_DEFAULTS, type RoomRules } from "./rulesDefaults";

export const roomRulesStore = createRulesStore<RoomRules>("roomRules", ROOM_RULES_DEFAULTS);
