import * as Phaser from "phaser";
import {
  getOfficeSheet,
  type OfficeSheetConfig,
} from "@/game/officeRefSheets";
import { useGameStore } from "@/stores/gameStore";

const CELL_WIDTH = 80;
const CELL_HEIGHT = 52;
const WORLD_COLUMNS = 26;
const WORLD_ROWS = 18;
const WORLD_WIDTH = CELL_WIDTH * WORLD_COLUMNS;
const WORLD_HEIGHT = CELL_HEIGHT * WORLD_ROWS;
const HIDE_DURATION = 5000;
const PLAYER_SPEED = 260;
const SECURITY_COLUMN_X = 600;
const REF_BASE = "/assets/pixel-art/office-ref";
const KEEPER_BASE = "/assets/pixel-art/office-escape";
const KEEPER_CHARACTER = `${KEEPER_BASE}/characters`;
const KEEPER_FURNITURE = `${KEEPER_BASE}/furniture`;
type WalkDirection = "front" | "back" | "left" | "right";
type EditTarget =
  | { kind: "column"; index: number }
  | { kind: "row"; index: number };
type HideVisual = Phaser.GameObjects.GameObject & {
  getBounds: () => Phaser.Geom.Rectangle;
  setVisible: (visible: boolean) => unknown;
};
type HideBodyObject = HideVisual;

interface HideTargetGroup {
  bodies: HideBodyObject[];
  targetKey?: string;
  visuals: HideVisual[];
}

interface OfficeKeys {
  copy: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  edit: Phaser.Input.Keyboard.Key;
  execute: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  paste: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  undo: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
}

const ASSETS = {
  playerFront: `${KEEPER_CHARACTER}/player_front.png`,
  playerBack: `${KEEPER_CHARACTER}/player_back.png`,
  playerLeft: `${KEEPER_CHARACTER}/player_left.png`,
  playerRight: `${KEEPER_CHARACTER}/player_right.png`,
  coworkerBack: `${REF_BASE}/characters/coworker_back.png`,
  coworkerFront: `${REF_BASE}/characters/coworker_front.png`,
  leaderBack: `${REF_BASE}/characters/team_leader_back.png`,
  guardFront: `${REF_BASE}/characters/security_front.png`,
  guardBack: `${REF_BASE}/characters/security_back.png`,
  playerWalkFront1: `${REF_BASE}/characters/walk/player_front_1.png`,
  playerWalkFront2: `${REF_BASE}/characters/walk/player_front_2.png`,
  playerWalkBack1: `${REF_BASE}/characters/walk/player_back_1.png`,
  playerWalkBack2: `${REF_BASE}/characters/walk/player_back_2.png`,
  playerWalkLeft1: `${REF_BASE}/characters/walk/player_left_1.png`,
  playerWalkLeft2: `${REF_BASE}/characters/walk/player_left_2.png`,
  playerWalkRight1: `${REF_BASE}/characters/walk/player_right_1.png`,
  playerWalkRight2: `${REF_BASE}/characters/walk/player_right_2.png`,
  guardWalkFront1: `${REF_BASE}/characters/walk/security_front_1.png`,
  guardWalkFront2: `${REF_BASE}/characters/walk/security_front_2.png`,
  guardWalkBack1: `${REF_BASE}/characters/walk/security_back_1.png`,
  guardWalkBack2: `${REF_BASE}/characters/walk/security_back_2.png`,
  guardWalkLeft1: `${REF_BASE}/characters/walk/security_left_1.png`,
  guardWalkLeft2: `${REF_BASE}/characters/walk/security_left_2.png`,
  guardWalkRight1: `${REF_BASE}/characters/walk/security_right_1.png`,
  guardWalkRight2: `${REF_BASE}/characters/walk/security_right_2.png`,
  terminal: `${REF_BASE}/props/evaluation_terminal.png`,
  exitLocked: `${REF_BASE}/devices/security_door_locked.png`,
  exitOpen: `${REF_BASE}/devices/security_door_open.png`,
  turnstile: `${REF_BASE}/props/security_turnstile.png`,
  doorway: `${REF_BASE}/environment/doorway_threshold.png`,
  partitionWall: `${KEEPER_FURNITURE}/partition_wall.png`,
  desk: `${KEEPER_FURNITURE}/office_desk.png`,
  chair: `${KEEPER_FURNITURE}/office_chair_green.png`,
  monitor: `${KEEPER_FURNITURE}/computer_monitor.png`,
  conferenceTable: `${KEEPER_FURNITURE}/conference_table_set.png`,
  bookshelf: `${KEEPER_FURNITURE}/bookshelf.png`,
  plant: `${KEEPER_FURNITURE}/potted_plant.png`,
  copier: `${KEEPER_FURNITURE}/copier_printer.png`,
  itemHighlight: `${KEEPER_BASE}/mission-ui/item_highlight.png`,
  contractDocument: `${KEEPER_BASE}/mission-ui/budget_document.png`,
  approvalDocument: `${KEEPER_BASE}/mission-ui/report_document.png`,
  keycard: `${KEEPER_BASE}/mission-ui/keycard.png`,
  cctv: `${REF_BASE}/devices/cctv_camera_active.png`,
  scanner: `${REF_BASE}/props/policy_scanner.png`,
  chargeNode: `${REF_BASE}/props/calc_recharge_node.png`,
  emergencyRelease: `${REF_BASE}/props/approval_stamp.png`,
  filingCabinet: `${REF_BASE}/props/mobile_filing_cabinet.png`,
  sensorPad: `${REF_BASE}/props/sensor_pad.png`,
  projector: `${REF_BASE}/props/meeting_projector.png`,
  serverRack: `${REF_BASE}/props/server_rack.png`,
  rootLock: `${REF_BASE}/props/root_lock.png`,
  saveSlot: `${REF_BASE}/props/local_save_slot.png`,
  waterCooler: `${REF_BASE}/environment/water_cooler.png`,
  managerVlookup: `${REF_BASE}/characters/manager_vlookup_front.png`,
  chiefCountif: `${REF_BASE}/characters/chief_countif_front.png`,
  directorIferror: `${REF_BASE}/characters/director_iferror_front.png`,
  auditorCtrl: `${REF_BASE}/characters/auditor_ctrl_front.png`,
  vpDrop: `${REF_BASE}/characters/vp_drop_front.png`,
} as const;

export class CellOfficeRefScene extends Phaser.Scene {
  private officeSheet: OfficeSheetConfig = getOfficeSheet(1, 1);
  private playerStart = { x: 200, y: 806 };
  private terminalPosition = { x: 1640, y: 806 };
  private exitPosition = { x: 1880, y: 156 };
  private guardStart = { x: 760, y: 520 };
  private guardAxis: "horizontal" | "vertical" = "vertical";
  private guardMinimum = 416;
  private guardMaximum = 624;
  private secondGuardStart = { x: 1040, y: 182 };
  private secondGuardAxis: "horizontal" | "vertical" = "horizontal";
  private secondGuardMinimum = 880;
  private secondGuardMaximum = 1160;
  private player?: Phaser.Physics.Arcade.Sprite;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private guard?: Phaser.Physics.Arcade.Sprite;
  private guardShadow?: Phaser.GameObjects.Ellipse;
  private secondGuard?: Phaser.Physics.Arcade.Sprite;
  private secondGuardShadow?: Phaser.GameObjects.Ellipse;
  private keys?: OfficeKeys;
  private walls?: Phaser.Physics.Arcade.StaticGroup;
  private hideTargets: HideTargetGroup[] = [];
  private activeHideTargets: HideTargetGroup[] = [];
  private exitDoor?: Phaser.GameObjects.Image;
  private terminal?: Phaser.GameObjects.Image;
  private terminalHighlight?: Phaser.GameObjects.Image;
  private contractDocument?: Phaser.GameObjects.Image;
  private contractHighlight?: Phaser.GameObjects.Image;
  private rechargeNode?: Phaser.GameObjects.Image;
  private rechargeHighlight?: Phaser.GameObjects.Image;
  private sheet2Cctv?: Phaser.GameObjects.Image;
  private sheet3TrainingTerminal?: Phaser.GameObjects.Image;
  private sheet3TrainingHighlight?: Phaser.GameObjects.Image;
  private sheet3LeaderBadge?: Phaser.GameObjects.Image;
  private sheet3BadgeHighlight?: Phaser.GameObjects.Image;
  private sheet3PasteStation?: Phaser.GameObjects.Image;
  private sheet3SecurityDoor?: Phaser.GameObjects.Image;
  private sheet3SecurityDoorBody?: Phaser.GameObjects.Rectangle;
  private sheet3ApprovalDocument?: Phaser.GameObjects.Image;
  private sheet3ApprovalHighlight?: Phaser.GameObjects.Image;
  private sheet3BadgeTray?: Phaser.GameObjects.Image;
  private copyPasteUnlocked = false;
  private leaderBadgeCopied = false;
  private duplicateBadgeEquipped = false;
  private approvalCarrying = false;
  private approvalSubmitted = false;
  private originalBadgeRestored = false;
  private sheet4Printer?: Phaser.GameObjects.Image;
  private sheet4Cabinet?: Phaser.GameObjects.Image;
  private sheet4PrinterTarget?: Phaser.GameObjects.Image;
  private sheet4CabinetTarget?: Phaser.GameObjects.Image;
  private sheet4EmergencyRelease?: Phaser.GameObjects.Image;
  private sheet4AdminDoor?: Phaser.GameObjects.Image;
  private sheet4AdminDoorBody?: Phaser.GameObjects.Rectangle;
  private sheet4Colleague?: Phaser.GameObjects.Image;
  private sheet4ColleagueHighlight?: Phaser.GameObjects.Image;
  private sheet4Facilities: Phaser.GameObjects.Image[] = [];
  private sheet4Cctvs: Phaser.GameObjects.Image[] = [];
  private sheet4Clipboard: "cabinet" | "printer" | null = null;
  private sheet4PrinterDuplicated = false;
  private sheet4CabinetDuplicated = false;
  private sheet4CctvDisabled = false;
  private sheet4AdminDoorOpen = false;
  private sheet4ColleagueRescued = false;
  private finalProjectBonus?: Phaser.GameObjects.Image;
  private finalProjectHighlight?: Phaser.GameObjects.Image;
  private finalBorrowTarget?: Phaser.GameObjects.Image;
  private finalBorrowedResult?: Phaser.GameObjects.Image;
  private finalSubmitTerminal?: Phaser.GameObjects.Image;
  private finalRechargeNode?: Phaser.GameObjects.Image;
  private finalManager?: Phaser.GameObjects.Image;
  private finalCctvs: Phaser.GameObjects.Image[] = [];
  private finalScoreLabel?: Phaser.GameObjects.Text;
  private finalManagerLabel?: Phaser.GameObjects.Text;
  private finalBonusCopied = false;
  private finalBonusPasted = false;
  private finalRechargeUsed = false;
  private finalWorkPenalty = 0;
  private finalManagerActionIndex = 0;
  private finalManagerNextActionAt = 8000;
  private finalBonusLockedUntil = 0;
  private finalLastManagerSecond = -1;
  private s2s1TrainingTerminal?: Phaser.GameObjects.Image;
  private s2s1TrainingHighlight?: Phaser.GameObjects.Image;
  private s2s1SortStation?: Phaser.GameObjects.Image;
  private s2s1QueueEntries: Array<{
    container: Phaser.GameObjects.Container;
    name: string;
    originalIndex: number;
    rank: number | null;
  }> = [];
  private s2s1Gate?: Phaser.GameObjects.Image;
  private s2s1GateBody?: Phaser.GameObjects.Rectangle;
  private s2s1Request?: Phaser.GameObjects.Image;
  private s2s1RequestHighlight?: Phaser.GameObjects.Image;
  private s2s1Outbox?: Phaser.GameObjects.Image;
  private s2s1SortUnlocked = false;
  private s2s1SortPreviewed = false;
  private s2s1QueueValid = false;
  private s2s1RequestCarrying = false;
  private s2s1RequestSubmitted = false;
  private s2s2SortStation?: Phaser.GameObjects.Image;
  private s2s2QueueEntries: Array<{
    container: Phaser.GameObjects.Container;
    departmentCode: number | null;
    name: string;
    originalIndex: number;
  }> = [];
  private s2s2Gate?: Phaser.GameObjects.Image;
  private s2s2GateBody?: Phaser.GameObjects.Rectangle;
  private s2s2Request?: Phaser.GameObjects.Image;
  private s2s2RequestHighlight?: Phaser.GameObjects.Image;
  private s2s2Outbox?: Phaser.GameObjects.Image;
  private s2s2Cctv?: Phaser.GameObjects.Image;
  private s2s2SortPreviewed = false;
  private s2s2QueueValid = false;
  private s2s2RequestCarrying = false;
  private s2s2RequestSubmitted = false;
  private s2s3FilterStation?: Phaser.GameObjects.Image;
  private s2s3TrainingTerminal?: Phaser.GameObjects.Image;
  private s2s3QueueEntries: Array<{
    container: Phaser.GameObjects.Container;
    clearance: number | null;
    name: string;
    qualified: boolean;
  }> = [];
  private s2s3LateStaff?: Phaser.GameObjects.Container;
  private s2s3Gate?: Phaser.GameObjects.Image;
  private s2s3GateBody?: Phaser.GameObjects.Rectangle;
  private s2s3Patch?: Phaser.GameObjects.Image;
  private s2s3PatchHighlight?: Phaser.GameObjects.Image;
  private s2s3Outbox?: Phaser.GameObjects.Image;
  private s2s3RechargeNode?: Phaser.GameObjects.Image;
  private s2s3Cctv?: Phaser.GameObjects.Image;
  private s2s3FilterPreviewed = false;
  private s2s3FilterUnlocked = false;
  private s2s3FilterActive = false;
  private s2s3FilterUntil = 0;
  private s2s3LateStaffAt = 0;
  private s2s3LateStaffSpawned = false;
  private s2s3PatchCarrying = false;
  private s2s3PatchSubmitted = false;
  private s2s4DispatchTerminal?: Phaser.GameObjects.Image;
  private s2s4DispatchHighlight?: Phaser.GameObjects.Image;
  private s2s4WriteConsole?: Phaser.GameObjects.Image;
  private s2s4QueueEntries: Array<{
    container: Phaser.GameObjects.Container;
    name: string;
    originalIndex: number;
    priority: number;
    role: "TEAM_LEADER" | "FACILITIES";
  }> = [];
  private s2s4ProcessMarker?: Phaser.GameObjects.Image;
  private s2s4ProcessHighlight?: Phaser.GameObjects.Image;
  private s2s4Leader?: Phaser.GameObjects.Image;
  private s2s4LeaderHome = { x: 1180, y: 260 };
  private s2s4Gate?: Phaser.GameObjects.Image;
  private s2s4GateBody?: Phaser.GameObjects.Rectangle;
  private s2s4Cctv?: Phaser.GameObjects.Image;
  private s2s4ViolationLabel?: Phaser.GameObjects.Text;
  private s2s4WriteUnlocked = false;
  private s2s4WriteUntil = 0;
  private s2s4Filtered = false;
  private s2s4FilterPreviewed = false;
  private s2s4Sorted = false;
  private s2s4SortPreviewed = false;
  private s2s4Dispatched = false;
  private s2s4Processed = false;
  private s2fAuditStation?: Phaser.GameObjects.Image;
  private s2fRechargeNode?: Phaser.GameObjects.Image;
  private s2fRows: Array<{
    container: Phaser.GameObjects.Container;
    date: "TODAY" | "YESTERDAY";
    id: number;
    owner: string;
    status: "COMPLIANT" | "VIOLATION";
    visible: boolean;
  }> = [];
  private s2fSubmitTerminal?: Phaser.GameObjects.Image;
  private s2fSubmitHighlight?: Phaser.GameObjects.Image;
  private s2fGate?: Phaser.GameObjects.Image;
  private s2fGateBody?: Phaser.GameObjects.Rectangle;
  private s2fChief?: Phaser.GameObjects.Image;
  private s2fChiefLabel?: Phaser.GameObjects.Text;
  private s2fVerdictLabel?: Phaser.GameObjects.Text;
  private s2fCctv?: Phaser.GameObjects.Image;
  private s2fFiltered = false;
  private s2fFilterPreviewed = false;
  private s2fSorted = false;
  private s2fSortPreviewed = false;
  private s2fSampleValid = false;
  private s2fSampleUntil = 0;
  private s2fSubmitted = false;
  private s2fChiefActionIndex = 0;
  private s2fChiefNextAt = 10000;
  private s2fChiefLastSecond = -1;
  private s3s1IfTerminal?: Phaser.GameObjects.Image;
  private s3s1IfHighlight?: Phaser.GameObjects.Image;
  private s3s1InstallConsole?: Phaser.GameObjects.Image;
  private s3s1CoffeeButton?: Phaser.GameObjects.Image;
  private s3s1CoffeeHighlight?: Phaser.GameObjects.Image;
  private s3s1Employee?: Phaser.GameObjects.Image;
  private s3s1EmployeeHome = { x: 460, y: 182 };
  private s3s1ConditionCell?: Phaser.GameObjects.Rectangle;
  private s3s1Door?: Phaser.GameObjects.Image;
  private s3s1DoorBody?: Phaser.GameObjects.Rectangle;
  private s3s1TriggerLine?: Phaser.GameObjects.Line;
  private s3s1ResultLine?: Phaser.GameObjects.Line;
  private s3s1StatusLabel?: Phaser.GameObjects.Text;
  private s3s1Log?: Phaser.GameObjects.Image;
  private s3s1LogHighlight?: Phaser.GameObjects.Image;
  private s3s1Outbox?: Phaser.GameObjects.Image;
  private s3s1IfUnlocked = false;
  private s3s1IfInstalled = false;
  private s3s1IfPreviewed = false;
  private s3s1CoffeeCalled = false;
  private s3s1Triggered = false;
  private s3s1LogCarrying = false;
  private s3s1LogSubmitted = false;
  private s3s2ConsoleA?: Phaser.GameObjects.Image;
  private s3s2ConsoleB?: Phaser.GameObjects.Image;
  private s3s2Printer?: Phaser.GameObjects.Image;
  private s3s2Door1?: Phaser.GameObjects.Image;
  private s3s2Door1Body?: Phaser.GameObjects.Rectangle;
  private s3s2Door2?: Phaser.GameObjects.Image;
  private s3s2Door2Body?: Phaser.GameObjects.Rectangle;
  private s3s2RechargeNode?: Phaser.GameObjects.Image;
  private s3s2Worker?: Phaser.GameObjects.Image;
  private s3s2WorkerHome = { x: 840, y: 182 };
  private s3s2ConditionCell?: Phaser.GameObjects.Rectangle;
  private s3s2RepairButton?: Phaser.GameObjects.Image;
  private s3s2RepairHighlight?: Phaser.GameObjects.Image;
  private s3s2ResultLine?: Phaser.GameObjects.Line;
  private s3s2StatusLabel?: Phaser.GameObjects.Text;
  private s3s2Template?: Phaser.GameObjects.Image;
  private s3s2TemplateHighlight?: Phaser.GameObjects.Image;
  private s3s2Outbox?: Phaser.GameObjects.Image;
  private s3s2Cctv?: Phaser.GameObjects.Image;
  private s3s2If1Installed = false;
  private s3s2If1Previewed = false;
  private s3s2If2Installed = false;
  private s3s2If2Previewed = false;
  private s3s2RepairCalled = false;
  private s3s2Triggered = false;
  private s3s2TemplateCarrying = false;
  private s3s2TemplateSubmitted = false;
  private readonly s3s3CellX = [440, 520, 600, 680, 760];
  private readonly s3s3RowY = 182;
  private s3s3IfConsole?: Phaser.GameObjects.Image;
  private s3s3IfHighlight?: Phaser.GameObjects.Image;
  private s3s3Document?: Phaser.GameObjects.Image;
  private s3s3Sensor?: Phaser.GameObjects.Rectangle;
  private s3s3Door?: Phaser.GameObjects.Image;
  private s3s3DoorBody?: Phaser.GameObjects.Rectangle;
  private s3s3ResultLine?: Phaser.GameObjects.Line;
  private s3s3StatusLabel?: Phaser.GameObjects.Text;
  private s3s3Template?: Phaser.GameObjects.Image;
  private s3s3TemplateHighlight?: Phaser.GameObjects.Image;
  private s3s3Outbox?: Phaser.GameObjects.Image;
  private s3s3Cctv?: Phaser.GameObjects.Image;
  private s3s3IfInstalled = false;
  private s3s3IfPreviewed = false;
  private s3s3IfEditing = false;
  private s3s3ConveyorStarted = false;
  private s3s3DocIndex = 0;
  private s3s3DocTimer = 0;
  private s3s3DocAtSensor = false;
  private s3s3DoorOpenUntil = 0;
  private s3s3Passed = false;
  private s3s3TemplateCarrying = false;
  private s3s3TemplateSubmitted = false;
  private s3s4IfConsole?: Phaser.GameObjects.Image;
  private s3s4IfHighlight?: Phaser.GameObjects.Image;
  private s3s4MacroButton?: Phaser.GameObjects.Image;
  private s3s4MacroHighlight?: Phaser.GameObjects.Image;
  private s3s4Workers: Array<{ image: Phaser.GameObjects.Image; seat: { x: number; y: number } }> = [];
  private s3s4Leader?: Phaser.GameObjects.Image;
  private s3s4Door?: Phaser.GameObjects.Image;
  private s3s4DoorBody?: Phaser.GameObjects.Rectangle;
  private s3s4CountLabel?: Phaser.GameObjects.Text;
  private s3s4StatusLabel?: Phaser.GameObjects.Text;
  private s3s4Signature?: Phaser.GameObjects.Image;
  private s3s4SignatureHighlight?: Phaser.GameObjects.Image;
  private s3s4Outbox?: Phaser.GameObjects.Image;
  private s3s4Cctvs: Phaser.GameObjects.Image[] = [];
  private s3s4IfInstalled = false;
  private s3s4IfPreviewed = false;
  private s3s4MacroRun = false;
  private s3s4Count = 0;
  private s3s4Triggered = false;
  private s3s4SignatureCarrying = false;
  private s3s4SignatureSubmitted = false;
  private s3finTerminal?: Phaser.GameObjects.Image;
  private s3finTerminalHighlight?: Phaser.GameObjects.Image;
  private s3finMacroButton?: Phaser.GameObjects.Image;
  private s3finMacroHighlight?: Phaser.GameObjects.Image;
  private s3finSwitch?: Phaser.GameObjects.Image;
  private s3finLoopCell?: Phaser.GameObjects.Image;
  private s3finRechargeNode?: Phaser.GameObjects.Image;
  private s3finDirector?: Phaser.GameObjects.Image;
  private s3finDirectorLabel?: Phaser.GameObjects.Text;
  private s3finStatusLabel?: Phaser.GameObjects.Text;
  private s3finGate?: Phaser.GameObjects.Image;
  private s3finGateBody?: Phaser.GameObjects.Rectangle;
  private s3finSubmit?: Phaser.GameObjects.Image;
  private s3finSubmitHighlight?: Phaser.GameObjects.Image;
  private s3finCctvs: Phaser.GameObjects.Image[] = [];
  private s3finLinked = false;
  private s3finMacroRun = false;
  private s3finRouteReady = false;
  private s3finIf1Installed = false;
  private s3finIf1Previewed = false;
  private s3finIf2Installed = false;
  private s3finIf2Previewed = false;
  private s3finAutomation = true;
  private s3finPending = 3;
  private s3finLoopDepth = 4;
  private s3finPendingTimer = 0;
  private s3finGateOpened = false;
  private s3finSubmitted = false;
  private s3finDirectorActionIndex = 0;
  private s3finDirectorNextAt = 12000;
  private s3finDirectorLastSecond = -1;
  private s4s1UndoTerminal?: Phaser.GameObjects.Image;
  private s4s1UndoHighlight?: Phaser.GameObjects.Image;
  private s4s1Cart?: Phaser.GameObjects.Image;
  private s4s1CartHighlight?: Phaser.GameObjects.Image;
  private s4s1Sensor?: Phaser.GameObjects.Image;
  private s4s1DuplicateCart?: Phaser.GameObjects.Image;
  private s4s1Door?: Phaser.GameObjects.Image;
  private s4s1DoorBody?: Phaser.GameObjects.Rectangle;
  private s4s1Log?: Phaser.GameObjects.Image;
  private s4s1LogHighlight?: Phaser.GameObjects.Image;
  private s4s1Outbox?: Phaser.GameObjects.Image;
  private s4s1StatusLabel?: Phaser.GameObjects.Text;
  private s4s1UndoUnlocked = false;
  private s4s1CartCopied = false;
  private s4s1Pasted = false;
  private s4s1DoorOpen = false;
  private s4s1Undone = false;
  private s4s1LogCarrying = false;
  private s4s1LogSubmitted = false;
  private s4s2IfConsole?: Phaser.GameObjects.Image;
  private s4s2IfHighlight?: Phaser.GameObjects.Image;
  private s4s2BadgeSensor?: Phaser.GameObjects.Image;
  private s4s2Box?: Phaser.GameObjects.Image;
  private s4s2BoxHighlight?: Phaser.GameObjects.Image;
  private s4s2DecoyCell?: Phaser.GameObjects.Rectangle;
  private s4s2DecoyBox?: Phaser.GameObjects.Image;
  private s4s2Door?: Phaser.GameObjects.Image;
  private s4s2DoorBody?: Phaser.GameObjects.Rectangle;
  private s4s2Auditor?: Phaser.GameObjects.Image;
  private s4s2AuditLabel?: Phaser.GameObjects.Text;
  private s4s2StatusLabel?: Phaser.GameObjects.Text;
  private s4s2Index?: Phaser.GameObjects.Image;
  private s4s2IndexHighlight?: Phaser.GameObjects.Image;
  private s4s2Outbox?: Phaser.GameObjects.Image;
  private s4s2IfInstalled = false;
  private s4s2IfPreviewed = false;
  private s4s2BoxCopied = false;
  private s4s2Pasted = false;
  private s4s2AuditTarget: "none" | "L5" | "D4" = "none";
  private s4s2AuditUntil = 0;
  private s4s2AuditLastSecond = -1;
  private s4s2DoorOpen = false;
  private s4s2DecoyRestored = false;
  private s4s2IndexCarrying = false;
  private s4s2IndexSubmitted = false;
  private s4s3CompareTerminal?: Phaser.GameObjects.Image;
  private s4s3CompareHighlight?: Phaser.GameObjects.Image;
  private s4s3IfConsole?: Phaser.GameObjects.Image;
  private s4s3IfHighlight?: Phaser.GameObjects.Image;
  private s4s3ReviewButton?: Phaser.GameObjects.Image;
  private s4s3ReviewHighlight?: Phaser.GameObjects.Image;
  private s4s3Cabinet?: Phaser.GameObjects.Image;
  private s4s3CabinetGhost?: Phaser.GameObjects.Image;
  private s4s3CabinetBody?: Phaser.GameObjects.Rectangle;
  private s4s3Auditor?: Phaser.GameObjects.Image;
  private s4s3AuditLabel?: Phaser.GameObjects.Text;
  private s4s3Scanner?: Phaser.GameObjects.Rectangle;
  private s4s3StatusLabel?: Phaser.GameObjects.Text;
  private s4s3Log?: Phaser.GameObjects.Image;
  private s4s3LogHighlight?: Phaser.GameObjects.Image;
  private s4s3Outbox?: Phaser.GameObjects.Image;
  private s4s3IfInstalled = false;
  private s4s3IfPreviewed = false;
  private s4s3IfEditing = false;
  private s4s3Reviewed = false;
  private s4s3AuditUntil = 0;
  private s4s3AuditLastSecond = -1;
  private s4s3AuditDone = false;
  private s4s3Undone = false;
  private s4s3LogCarrying = false;
  private s4s3LogSubmitted = false;
  private s4s4Terminal?: Phaser.GameObjects.Image;
  private s4s4Highlight?: Phaser.GameObjects.Image;
  private s4s4Beam?: Phaser.GameObjects.Rectangle;
  private s4s4BeamLabel?: Phaser.GameObjects.Text;
  private s4s4StatusLabel?: Phaser.GameObjects.Text;
  private s4s4Log?: Phaser.GameObjects.Image;
  private s4s4LogHighlight?: Phaser.GameObjects.Image;
  private s4s4Outbox?: Phaser.GameObjects.Image;
  private s4s4Unlocked = false;
  private s4s4Hidden = false;
  private s4s4HideUntil = 0;
  private s4s4BeamY = 52;
  private s4s4BeamPauseUntil = 0;
  private s4s4CountedThisSweep = false;
  private s4s4SelfHideCount = 0;
  private s4s4LogCarrying = false;
  private s4s4LogSubmitted = false;
  private s4finCompareA?: Phaser.GameObjects.Image;
  private s4finCompareAHi?: Phaser.GameObjects.Image;
  private s4finCompareB?: Phaser.GameObjects.Image;
  private s4finCompareBHi?: Phaser.GameObjects.Image;
  private s4finForged?: Phaser.GameObjects.Image;
  private s4finForgedHi?: Phaser.GameObjects.Image;
  private s4finSlot?: Phaser.GameObjects.Image;
  private s4finSlotHi?: Phaser.GameObjects.Image;
  private s4finIfConsole?: Phaser.GameObjects.Image;
  private s4finIfHi?: Phaser.GameObjects.Image;
  private s4finAuditor?: Phaser.GameObjects.Image;
  private s4finFieldsLabel?: Phaser.GameObjects.Text;
  private s4finVerdictLabel?: Phaser.GameObjects.Text;
  private s4finStatusLabel?: Phaser.GameObjects.Text;
  private s4finBeam?: Phaser.GameObjects.Rectangle;
  private s4finBeamLabel?: Phaser.GameObjects.Text;
  private s4finOutbox?: Phaser.GameObjects.Image;
  private s4finRechargeA = false;
  private s4finRechargeB = false;
  private s4finForgedCopied = false;
  private s4finCompared = false;
  private s4finIfInstalled = false;
  private s4finIfPreviewed = false;
  private s4finVerdictLocked = false;
  private s4finUndone = false;
  private s4finBeamActive = false;
  private s4finBeamY = 52;
  private s4finBeamDone = false;
  private s4finBeamCounted = false;
  private s4finHidden = false;
  private s4finHideUntil = 0;
  private s4finSelfHideUsed = false;
  private s4finSubmitted = false;
  private s5s1Terminal?: Phaser.GameObjects.Image;
  private s5s1Highlight?: Phaser.GameObjects.Image;
  private s5s1HrBand?: Phaser.GameObjects.Rectangle;
  private s5s1Vp?: Phaser.GameObjects.Image;
  private s5s1Door?: Phaser.GameObjects.Image;
  private s5s1DoorBody?: Phaser.GameObjects.Rectangle;
  private s5s1DamageLabel?: Phaser.GameObjects.Text;
  private s5s1StatusLabel?: Phaser.GameObjects.Text;
  private s5s1Log?: Phaser.GameObjects.Image;
  private s5s1LogHighlight?: Phaser.GameObjects.Image;
  private s5s1Outbox?: Phaser.GameObjects.Image;
  private s5s1Unlocked = false;
  private s5s1NameError = false;
  private s5s1NameErrorUntil = 0;
  private s5s1NameErrorLastSecond = -1;
  private s5s1NamePreviewed = false;
  private s5s1Damage = 0;
  private s5s1DoorOpen = false;
  private s5s1LogCarrying = false;
  private s5s1LogSubmitted = false;
  private s5s2Terminal?: Phaser.GameObjects.Image;
  private s5s2Highlight?: Phaser.GameObjects.Image;
  private s5s2RangeRect?: Phaser.GameObjects.Rectangle;
  private s5s2Shutter?: Phaser.GameObjects.Image;
  private s5s2ShutterBody?: Phaser.GameObjects.Rectangle;
  private s5s2Cctv?: Phaser.GameObjects.Image;
  private s5s2Arm?: Phaser.GameObjects.Image;
  private s5s2DamageLabel?: Phaser.GameObjects.Text;
  private s5s2StatusLabel?: Phaser.GameObjects.Text;
  private s5s2Log?: Phaser.GameObjects.Image;
  private s5s2LogHighlight?: Phaser.GameObjects.Image;
  private s5s2Outbox?: Phaser.GameObjects.Image;
  private s5s2Unlocked = false;
  private s5s2Frozen = false;
  private s5s2FrozenUntil = 0;
  private s5s2FrozenLastSecond = -1;
  private s5s2FrozenAccum = 0;
  private s5s2Damage = 0;
  private s5s2DivPreviewed = false;
  private s5s2ShutterOpen = false;
  private s5s2ShutterOpenPrev = false;
  private s5s2LogCarrying = false;
  private s5s2LogSubmitted = false;
  private s5s3Terminal?: Phaser.GameObjects.Image;
  private s5s3Highlight?: Phaser.GameObjects.Image;
  private s5s3Employee?: Phaser.GameObjects.Image;
  private s5s3Box?: Phaser.GameObjects.Image;
  private s5s3Door?: Phaser.GameObjects.Image;
  private s5s3DoorBody?: Phaser.GameObjects.Rectangle;
  private s5s3Vp?: Phaser.GameObjects.Image;
  private s5s3DamageLabel?: Phaser.GameObjects.Text;
  private s5s3StatusLabel?: Phaser.GameObjects.Text;
  private s5s3Log?: Phaser.GameObjects.Image;
  private s5s3LogHighlight?: Phaser.GameObjects.Image;
  private s5s3Outbox?: Phaser.GameObjects.Image;
  private s5s3Unlocked = false;
  private s5s3BoxEmployee = false;
  private s5s3BoxEmployeeUntil = 0;
  private s5s3BoxLastSecond = -1;
  private s5s3Damage = 0;
  private s5s3ValuePreviewed = false;
  private s5s3LogCarrying = false;
  private s5s3LogSubmitted = false;
  private s5s4Terminal?: Phaser.GameObjects.Image;
  private s5s4Highlight?: Phaser.GameObjects.Image;
  private s5s4Relay?: Phaser.GameObjects.Image;
  private s5s4Server?: Phaser.GameObjects.Image;
  private s5s4Door1?: Phaser.GameObjects.Image;
  private s5s4Door1Body?: Phaser.GameObjects.Rectangle;
  private s5s4Door2?: Phaser.GameObjects.Image;
  private s5s4Door2Body?: Phaser.GameObjects.Rectangle;
  private s5s4Door3?: Phaser.GameObjects.Image;
  private s5s4Door3Body?: Phaser.GameObjects.Rectangle;
  private s5s4DamageLabel?: Phaser.GameObjects.Text;
  private s5s4StatusLabel?: Phaser.GameObjects.Text;
  private s5s4Log?: Phaser.GameObjects.Image;
  private s5s4LogHighlight?: Phaser.GameObjects.Image;
  private s5s4Outbox?: Phaser.GameObjects.Image;
  private s5s4Unlocked = false;
  private s5s4RelayDeleted = false;
  private s5s4Damage = 0;
  private s5s4RefTarget: "none" | "relay" | "server" = "none";
  private s5s4RefPreviewed = false;
  private s5s4LogCarrying = false;
  private s5s4LogSubmitted = false;
  private s5finErrorTerminal?: Phaser.GameObjects.Image;
  private s5finErrorHighlight?: Phaser.GameObjects.Image;
  private s5finCompareTerminal?: Phaser.GameObjects.Image;
  private s5finCompareHighlight?: Phaser.GameObjects.Image;
  private s5finPointer?: Phaser.GameObjects.Image;
  private s5finPointerHighlight?: Phaser.GameObjects.Image;
  private s5finVp?: Phaser.GameObjects.Image;
  private s5finReviewZone?: Phaser.GameObjects.Rectangle;
  private s5finRows: Array<{ container: Phaser.GameObjects.Container; canonical: boolean }> = [];
  private s5finDamageLabel?: Phaser.GameObjects.Text;
  private s5finStatusLabel?: Phaser.GameObjects.Text;
  private s5finVerdictLabel?: Phaser.GameObjects.Text;
  private s5finOutbox?: Phaser.GameObjects.Image;
  private s5finErrorUnlocked = false;
  private s5finNameError = false;
  private s5finNameErrorUntil = 0;
  private s5finNameLastSecond = -1;
  private s5finFirstReviewPassed = false;
  private s5finFilterConfirmed = false;
  private s5finPointerDeleted = false;
  private s5finDamage = 0;
  private s5finEditTarget: "none" | "name" | "filter" | "ref" = "none";
  private s5finEditPreviewed = false;
  private s5finSubmitted = false;
  private s6s1Box?: Phaser.GameObjects.Image;
  private s6s1BoxHighlight?: Phaser.GameObjects.Image;
  private s6s1Sensor?: Phaser.GameObjects.Image;
  private s6s1SortStation?: Phaser.GameObjects.Image;
  private s6s1Rows: Array<{ container: Phaser.GameObjects.Container; requestId: number; originalIndex: number }> = [];
  private s6s1Gate1?: Phaser.GameObjects.Image;
  private s6s1Gate1Body?: Phaser.GameObjects.Rectangle;
  private s6s1Gate2?: Phaser.GameObjects.Image;
  private s6s1Gate2Body?: Phaser.GameObjects.Rectangle;
  private s6s1RangeRect?: Phaser.GameObjects.Rectangle;
  private s6s1Key?: Phaser.GameObjects.Image;
  private s6s1KeyHighlight?: Phaser.GameObjects.Image;
  private s6s1StatusLabel?: Phaser.GameObjects.Text;
  private s6s1Phase = 1;
  private s6s1BoxCopied = false;
  private s6s1SortEditing = false;
  private s6s1SortPreviewed = false;
  private s6s1KeyTaken = false;
  private s6s2Sandbox?: Phaser.GameObjects.Image;
  private s6s2SandboxRect?: Phaser.GameObjects.Rectangle;
  private s6s2LinkTerminal?: Phaser.GameObjects.Image;
  private s6s2LinkHighlight?: Phaser.GameObjects.Image;
  private s6s2Rows: Array<{ container: Phaser.GameObjects.Container; priority: number; originalIndex: number }> = [];
  private s6s2Sensor?: Phaser.GameObjects.Rectangle;
  private s6s2Door?: Phaser.GameObjects.Image;
  private s6s2DoorBody?: Phaser.GameObjects.Rectangle;
  private s6s2Key?: Phaser.GameObjects.Image;
  private s6s2KeyHighlight?: Phaser.GameObjects.Image;
  private s6s2Outbox?: Phaser.GameObjects.Image;
  private s6s2StatusLabel?: Phaser.GameObjects.Text;
  private s6s2Linked = false;
  private s6s2LinkUntil = 0;
  private s6s2LinkLastSecond = -1;
  private s6s2IfInstalled = false;
  private s6s2IfPreviewed = false;
  private s6s2Sorted = false;
  private s6s2SortPreviewed = false;
  private s6s2Triggered = false;
  private s6s2EditTarget: "none" | "if" | "sort" = "none";
  private s6s2KeyCarrying = false;
  private s6s2KeySubmitted = false;
  private s6s3Gate1?: Phaser.GameObjects.Image;
  private s6s3Gate1Body?: Phaser.GameObjects.Rectangle;
  private s6s3Gate2?: Phaser.GameObjects.Image;
  private s6s3Gate2Body?: Phaser.GameObjects.Rectangle;
  private s6s3Guards: Phaser.GameObjects.Image[] = [];
  private s6s3BufferRect?: Phaser.GameObjects.Rectangle;
  private s6s3Token?: Phaser.GameObjects.Image;
  private s6s3TokenHighlight?: Phaser.GameObjects.Image;
  private s6s3PasteSlot?: Phaser.GameObjects.Rectangle;
  private s6s3Key?: Phaser.GameObjects.Image;
  private s6s3KeyHighlight?: Phaser.GameObjects.Image;
  private s6s3Outbox?: Phaser.GameObjects.Image;
  private s6s3StatusLabel?: Phaser.GameObjects.Text;
  private s6s3Phase = 1;
  private s6s3DraftUntil = 0;
  private s6s3DraftKind: "none" | "hide" | "sort" = "none";
  private s6s3DraftLastSecond = -1;
  private s6s3HidePreviewed = false;
  private s6s3SortPreviewed = false;
  private s6s3TokenCopied = false;
  private s6s3Pasted = false;
  private s6s3KeyCarrying = false;
  private s6s3KeySubmitted = false;
  private s6s4PrepTerminal?: Phaser.GameObjects.Image;
  private s6s4PrepHighlight?: Phaser.GameObjects.Image;
  private s6s4Barrier?: Phaser.GameObjects.Image;
  private s6s4BarrierBody?: Phaser.GameObjects.Rectangle;
  private s6s4Template?: Phaser.GameObjects.Image;
  private s6s4TemplateHighlight?: Phaser.GameObjects.Image;
  private s6s4SaveSlot?: Phaser.GameObjects.Image;
  private s6s4SaveSlotRect?: Phaser.GameObjects.Rectangle;
  private s6s4SlotHighlight?: Phaser.GameObjects.Image;
  private s6s4PastedDoc?: Phaser.GameObjects.Image;
  private s6s4Key?: Phaser.GameObjects.Image;
  private s6s4KeyHighlight?: Phaser.GameObjects.Image;
  private s6s4Outbox?: Phaser.GameObjects.Image;
  private s6s4StatusLabel?: Phaser.GameObjects.Text;
  private s6s4GhostLabel?: Phaser.GameObjects.Text;
  private s6s4Prepared = false;
  private s6s4CycleActive = false;
  private s6s4CycleUntil = 0;
  private s6s4CycleLastSecond = -1;
  private s6s4GhostActive = false;
  private s6s4RowHidden = false;
  private s6s4TemplateCopied = false;
  private s6s4Pasted = false;
  private s6s4IfInstalled = false;
  private s6s4KeyGenerated = false;
  private s6s4KeyCarrying = false;
  private s6s4KeySubmitted = false;
  private s6s4EditTarget: "none" | "row" | "if" = "none";
  private s6s4LoadCount = 0;
  private prompt?: Phaser.GameObjects.Text;
  private formulaPanel?: Phaser.GameObjects.Container;
  private formulaTitle?: Phaser.GameObjects.Text;
  private formulaLabel?: Phaser.GameObjects.Text;
  private inspectionLabel?: Phaser.GameObjects.Text;
  private executeLabel?: Phaser.GameObjects.Text;
  private columnSelection?: Phaser.GameObjects.Rectangle;
  private hideUntil = 0;
  private editMode = false;
  private selectedEditTarget: EditTarget = { kind: "column", index: 7 };
  private rowInput = "";
  private rowInputAt = 0;
  private previewArmed = false;
  private terminalChecked = false;
  private exitUnlocked = false;
  private calc = 5;
  private guardDirection: 1 | -1 = 1;
  private secondGuardDirection: 1 | -1 = -1;
  private carryingContract = false;
  private contractSubmitted = false;
  private rechargeUsed = false;
  private usedRow6 = false;
  private usedColumnJ = false;
  private playerFacing: WalkDirection = "front";
  private lastHideSecond = -1;
  private lastAlertAt = -2000;
  private runStatus: "playing" | "won" = "playing";

  constructor() {
    super("cell-office-ref");
  }

  preload() {
    for (const [key, path] of Object.entries(ASSETS)) {
      this.load.image(`office-ref-${key}`, path);
    }
  }

  create() {
    this.resetRuntime();
    const state = useGameStore.getState();
    this.officeSheet = getOfficeSheet(state.keeperLevel, state.keeperSheet);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawWorkbookFloor();
    this.walls = this.physics.add.staticGroup();
    this.buildCompanyLayout();
    this.createWalkAnimations();
    this.createPlayer();
    this.createGuard();
    this.createMissionObjects();
    this.createFormulaPanel();
    this.createInput();
    this.resizeCamera(this.scale.width, this.scale.height);
    this.scale.on("resize", (size: Phaser.Structs.Size) => {
      this.resizeCamera(size.width, size.height);
    });

    useGameStore.getState().updateKeeper({
      alerts: 0,
      calc: 5,
      exitUnlocked: false,
      hideActive: false,
      hideRemaining: 0,
      status: "playing",
      terminalChecked: false,
    });
    useGameStore.getState().setSelectedCell(
      this.cellAt(this.playerStart.x, this.playerStart.y),
      `=OPEN("${this.officeSheet.workbook}")`,
    );
  }

  update(time: number, delta: number) {
    if (!this.player || !this.keys || this.runStatus !== "playing") return;

    this.updateHide(time);
    this.updateMovement();
    this.updateGuard(time, delta);
    this.updateInteractionPrompt();

    const selfHidden = this.s4s4Hidden || this.s4finHidden;
    if (Phaser.Input.Keyboard.JustDown(this.keys.edit) && this.hideUntil <= time && !selfHidden) {
      if (this.isSession4Sheet4()) {
        this.trySelfHide(time);
      } else if (this.isSession4Final() && this.s4finBeamActive && !this.s4finBeamDone) {
        this.trySelfHideFinal(time);
      } else {
        this.setEditMode(!this.editMode);
      }
    }
    if (this.editMode && Phaser.Input.Keyboard.JustDown(this.keys.execute)) {
      this.confirmEdit(time);
    }
    if (!this.editMode && !selfHidden && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this.interact();
    }
    if (!this.editMode && !selfHidden && Phaser.Input.Keyboard.JustDown(this.keys.copy)) {
      this.copyContextObject();
    }
    if (!this.editMode && !selfHidden && Phaser.Input.Keyboard.JustDown(this.keys.paste)) {
      this.pasteContextObject();
    }
    if (!this.editMode && !selfHidden && Phaser.Input.Keyboard.JustDown(this.keys.undo)) {
      this.undoContextObject();
    }
  }

  private resetRuntime() {
    this.hideTargets = [];
    this.activeHideTargets = [];
    this.hideUntil = 0;
    this.editMode = false;
    this.selectedEditTarget = { kind: "column", index: 7 };
    this.rowInput = "";
    this.rowInputAt = 0;
    this.previewArmed = false;
    this.terminalChecked = false;
    this.exitUnlocked = false;
    this.calc = 5;
    this.guardDirection = 1;
    this.secondGuardDirection = -1;
    this.carryingContract = false;
    this.contractSubmitted = false;
    this.rechargeUsed = false;
    this.usedRow6 = false;
    this.usedColumnJ = false;
    this.copyPasteUnlocked = false;
    this.leaderBadgeCopied = false;
    this.duplicateBadgeEquipped = false;
    this.approvalCarrying = false;
    this.approvalSubmitted = false;
    this.originalBadgeRestored = false;
    this.sheet4Facilities = [];
    this.sheet4Cctvs = [];
    this.sheet4Clipboard = null;
    this.sheet4PrinterDuplicated = false;
    this.sheet4CabinetDuplicated = false;
    this.sheet4CctvDisabled = false;
    this.sheet4AdminDoorOpen = false;
    this.sheet4ColleagueRescued = false;
    this.finalCctvs = [];
    this.finalBonusCopied = false;
    this.finalBonusPasted = false;
    this.finalRechargeUsed = false;
    this.finalWorkPenalty = 0;
    this.finalManagerActionIndex = 0;
    this.finalManagerNextActionAt = 8000;
    this.finalBonusLockedUntil = 0;
    this.finalLastManagerSecond = -1;
    this.s2s1QueueEntries = [];
    this.s2s1SortUnlocked = false;
    this.s2s1SortPreviewed = false;
    this.s2s1QueueValid = false;
    this.s2s1RequestCarrying = false;
    this.s2s1RequestSubmitted = false;
    this.s2s2QueueEntries = [];
    this.s2s2SortPreviewed = false;
    this.s2s2QueueValid = false;
    this.s2s2RequestCarrying = false;
    this.s2s2RequestSubmitted = false;
    this.s2s3QueueEntries = [];
    this.s2s3FilterPreviewed = false;
    this.s2s3FilterUnlocked = false;
    this.s2s3FilterActive = false;
    this.s2s3FilterUntil = 0;
    this.s2s3LateStaffAt = 0;
    this.s2s3LateStaffSpawned = false;
    this.s2s3PatchCarrying = false;
    this.s2s3PatchSubmitted = false;
    this.s2s4QueueEntries = [];
    this.s2s4WriteUnlocked = false;
    this.s2s4WriteUntil = 0;
    this.s2s4Filtered = false;
    this.s2s4FilterPreviewed = false;
    this.s2s4Sorted = false;
    this.s2s4SortPreviewed = false;
    this.s2s4Dispatched = false;
    this.s2s4Processed = false;
    this.s2fRows = [];
    this.s2fFiltered = false;
    this.s2fFilterPreviewed = false;
    this.s2fSorted = false;
    this.s2fSortPreviewed = false;
    this.s2fSampleValid = false;
    this.s2fSampleUntil = 0;
    this.s2fSubmitted = false;
    this.s2fChiefActionIndex = 0;
    this.s2fChiefNextAt = 10000;
    this.s2fChiefLastSecond = -1;
    this.s3s1IfUnlocked = false;
    this.s3s1IfInstalled = false;
    this.s3s1IfPreviewed = false;
    this.s3s1CoffeeCalled = false;
    this.s3s1Triggered = false;
    this.s3s1LogCarrying = false;
    this.s3s1LogSubmitted = false;
    this.s3s2If1Installed = false;
    this.s3s2If1Previewed = false;
    this.s3s2If2Installed = false;
    this.s3s2If2Previewed = false;
    this.s3s2RepairCalled = false;
    this.s3s2Triggered = false;
    this.s3s2TemplateCarrying = false;
    this.s3s2TemplateSubmitted = false;
    this.s3s3IfInstalled = false;
    this.s3s3IfPreviewed = false;
    this.s3s3IfEditing = false;
    this.s3s3ConveyorStarted = false;
    this.s3s3DocIndex = 0;
    this.s3s3DocTimer = 0;
    this.s3s3DocAtSensor = false;
    this.s3s3DoorOpenUntil = 0;
    this.s3s3Passed = false;
    this.s3s3TemplateCarrying = false;
    this.s3s3TemplateSubmitted = false;
    this.s3s4Workers = [];
    this.s3s4Cctvs = [];
    this.s3s4IfInstalled = false;
    this.s3s4IfPreviewed = false;
    this.s3s4MacroRun = false;
    this.s3s4Count = 0;
    this.s3s4Triggered = false;
    this.s3s4SignatureCarrying = false;
    this.s3s4SignatureSubmitted = false;
    this.s3finCctvs = [];
    this.s3finLinked = false;
    this.s3finMacroRun = false;
    this.s3finRouteReady = false;
    this.s3finIf1Installed = false;
    this.s3finIf1Previewed = false;
    this.s3finIf2Installed = false;
    this.s3finIf2Previewed = false;
    this.s3finAutomation = true;
    this.s3finPending = 3;
    this.s3finLoopDepth = 4;
    this.s3finPendingTimer = 0;
    this.s3finGateOpened = false;
    this.s3finSubmitted = false;
    this.s3finDirectorActionIndex = 0;
    this.s3finDirectorNextAt = 12000;
    this.s3finDirectorLastSecond = -1;
    this.s4s1UndoUnlocked = false;
    this.s4s1CartCopied = false;
    this.s4s1Pasted = false;
    this.s4s1DoorOpen = false;
    this.s4s1Undone = false;
    this.s4s1LogCarrying = false;
    this.s4s1LogSubmitted = false;
    this.s4s2IfInstalled = false;
    this.s4s2IfPreviewed = false;
    this.s4s2BoxCopied = false;
    this.s4s2Pasted = false;
    this.s4s2AuditTarget = "none";
    this.s4s2AuditUntil = 0;
    this.s4s2AuditLastSecond = -1;
    this.s4s2DoorOpen = false;
    this.s4s2DecoyRestored = false;
    this.s4s2IndexCarrying = false;
    this.s4s2IndexSubmitted = false;
    this.s4s3IfInstalled = false;
    this.s4s3IfPreviewed = false;
    this.s4s3IfEditing = false;
    this.s4s3Reviewed = false;
    this.s4s3AuditUntil = 0;
    this.s4s3AuditLastSecond = -1;
    this.s4s3AuditDone = false;
    this.s4s3Undone = false;
    this.s4s3LogCarrying = false;
    this.s4s3LogSubmitted = false;
    this.s4s4Unlocked = false;
    this.s4s4Hidden = false;
    this.s4s4HideUntil = 0;
    this.s4s4BeamY = 52;
    this.s4s4BeamPauseUntil = 0;
    this.s4s4CountedThisSweep = false;
    this.s4s4SelfHideCount = 0;
    this.s4s4LogCarrying = false;
    this.s4s4LogSubmitted = false;
    this.s4finRechargeA = false;
    this.s4finRechargeB = false;
    this.s4finForgedCopied = false;
    this.s4finCompared = false;
    this.s4finIfInstalled = false;
    this.s4finIfPreviewed = false;
    this.s4finVerdictLocked = false;
    this.s4finUndone = false;
    this.s4finBeamActive = false;
    this.s4finBeamY = 52;
    this.s4finBeamDone = false;
    this.s4finBeamCounted = false;
    this.s4finHidden = false;
    this.s4finHideUntil = 0;
    this.s4finSelfHideUsed = false;
    this.s4finSubmitted = false;
    this.s5s1Unlocked = false;
    this.s5s1NameError = false;
    this.s5s1NameErrorUntil = 0;
    this.s5s1NameErrorLastSecond = -1;
    this.s5s1NamePreviewed = false;
    this.s5s1Damage = 0;
    this.s5s1DoorOpen = false;
    this.s5s1LogCarrying = false;
    this.s5s1LogSubmitted = false;
    this.s5s2Unlocked = false;
    this.s5s2Frozen = false;
    this.s5s2FrozenUntil = 0;
    this.s5s2FrozenLastSecond = -1;
    this.s5s2FrozenAccum = 0;
    this.s5s2Damage = 0;
    this.s5s2DivPreviewed = false;
    this.s5s2ShutterOpen = false;
    this.s5s2ShutterOpenPrev = false;
    this.s5s2LogCarrying = false;
    this.s5s2LogSubmitted = false;
    this.s5s3Unlocked = false;
    this.s5s3BoxEmployee = false;
    this.s5s3BoxEmployeeUntil = 0;
    this.s5s3BoxLastSecond = -1;
    this.s5s3Damage = 0;
    this.s5s3ValuePreviewed = false;
    this.s5s3LogCarrying = false;
    this.s5s3LogSubmitted = false;
    this.s5s4Unlocked = false;
    this.s5s4RelayDeleted = false;
    this.s5s4Damage = 0;
    this.s5s4RefTarget = "none";
    this.s5s4RefPreviewed = false;
    this.s5s4LogCarrying = false;
    this.s5s4LogSubmitted = false;
    this.s5finRows = [];
    this.s5finErrorUnlocked = false;
    this.s5finNameError = false;
    this.s5finNameErrorUntil = 0;
    this.s5finNameLastSecond = -1;
    this.s5finFirstReviewPassed = false;
    this.s5finFilterConfirmed = false;
    this.s5finPointerDeleted = false;
    this.s5finDamage = 0;
    this.s5finEditTarget = "none";
    this.s5finEditPreviewed = false;
    this.s5finSubmitted = false;
    this.s6s1Rows = [];
    this.s6s1Phase = 1;
    this.s6s1BoxCopied = false;
    this.s6s1SortEditing = false;
    this.s6s1SortPreviewed = false;
    this.s6s1KeyTaken = false;
    this.s6s2Rows = [];
    this.s6s2Linked = false;
    this.s6s2LinkUntil = 0;
    this.s6s2LinkLastSecond = -1;
    this.s6s2IfInstalled = false;
    this.s6s2IfPreviewed = false;
    this.s6s2Sorted = false;
    this.s6s2SortPreviewed = false;
    this.s6s2Triggered = false;
    this.s6s2EditTarget = "none";
    this.s6s2KeyCarrying = false;
    this.s6s2KeySubmitted = false;
    this.s6s3Guards = [];
    this.s6s3Phase = 1;
    this.s6s3DraftUntil = 0;
    this.s6s3DraftKind = "none";
    this.s6s3DraftLastSecond = -1;
    this.s6s3HidePreviewed = false;
    this.s6s3SortPreviewed = false;
    this.s6s3TokenCopied = false;
    this.s6s3Pasted = false;
    this.s6s3KeyCarrying = false;
    this.s6s3KeySubmitted = false;
    this.s6s4Prepared = false;
    this.s6s4CycleActive = false;
    this.s6s4CycleUntil = 0;
    this.s6s4CycleLastSecond = -1;
    this.s6s4GhostActive = false;
    this.s6s4RowHidden = false;
    this.s6s4TemplateCopied = false;
    this.s6s4Pasted = false;
    this.s6s4IfInstalled = false;
    this.s6s4KeyGenerated = false;
    this.s6s4KeyCarrying = false;
    this.s6s4KeySubmitted = false;
    this.s6s4EditTarget = "none";
    this.s6s4LoadCount = 0;
    this.playerFacing = "front";
    this.lastHideSecond = -1;
    this.runStatus = "playing";
  }

  private drawWorkbookFloor() {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0xdce4df);
    const grid = this.add.graphics().lineStyle(1, 0x6f8982, 0.18);
    for (let x = 0; x <= WORLD_WIDTH; x += CELL_WIDTH) {
      grid.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += CELL_HEIGHT) {
      grid.lineBetween(0, y, WORLD_WIDTH, y);
    }

    this.add.rectangle(200, 52, 400, 104, 0xf4f7f1, 0.92).setStrokeStyle(2, 0x8ca39a);
    this.add.text(24, 22, `SESSION ${this.officeSheet.session} · ${this.officeSheet.sheet === 5 ? "FINAL SHEET" : `SHEET ${this.officeSheet.sheet}`}`, {
      color: "#285044",
      fontFamily: "monospace",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(24, 58, `${this.officeSheet.title} / ${this.officeSheet.workbook}`, {
      color: "#43645d",
      fontFamily: "sans-serif",
      fontSize: "19px",
    });
  }

  private buildCompanyLayout() {
    this.addWall(8, WORLD_HEIGHT / 2, 16, WORLD_HEIGHT);
    this.addWall(WORLD_WIDTH - 8, WORLD_HEIGHT / 2, 16, WORLD_HEIGHT);
    this.addWall(WORLD_WIDTH / 2, 8, WORLD_WIDTH, 16);
    this.addWall(WORLD_WIDTH / 2, WORLD_HEIGHT - 8, WORLD_WIDTH, 16);
    if (this.isSession1Sheet2()) {
      this.buildSession1Sheet2Layout();
    } else if (this.isSession1Sheet3()) {
      this.buildSession1Sheet3Layout();
    } else if (this.isSession1Sheet4()) {
      this.buildSession1Sheet4Layout();
    } else if (this.isSession1Final()) {
      this.buildSession1FinalLayout();
    } else if (this.isSession2Sheet1()) {
      this.buildSession2Sheet1Layout();
    } else if (this.isSession2Sheet2()) {
      this.buildSession2Sheet2Layout();
    } else if (this.isSession2Sheet3()) {
      this.buildSession2Sheet3Layout();
    } else if (this.isSession2Sheet4()) {
      this.buildSession2Sheet4Layout();
    } else if (this.isSession2Final()) {
      this.buildSession2FinalLayout();
    } else if (this.isSession3Sheet1()) {
      this.buildSession3Sheet1Layout();
    } else if (this.isSession3Sheet2()) {
      this.buildSession3Sheet2Layout();
    } else if (this.isSession3Sheet3()) {
      this.buildSession3Sheet3Layout();
    } else if (this.isSession3Sheet4()) {
      this.buildSession3Sheet4Layout();
    } else if (this.isSession3Final()) {
      this.buildSession3FinalLayout();
    } else if (this.isSession4Sheet1()) {
      this.buildSession4Sheet1Layout();
    } else if (this.isSession4Sheet2()) {
      this.buildSession4Sheet2Layout();
    } else if (this.isSession4Sheet3()) {
      this.buildSession4Sheet3Layout();
    } else if (this.isSession4Sheet4()) {
      this.buildSession4Sheet4Layout();
    } else if (this.isSession4Final()) {
      this.buildSession4FinalLayout();
    } else if (this.isSession5Sheet1()) {
      this.buildSession5Sheet1Layout();
    } else if (this.isSession5Sheet2()) {
      this.buildSession5Sheet2Layout();
    } else if (this.isSession5Sheet3()) {
      this.buildSession5Sheet3Layout();
    } else if (this.isSession5Sheet4()) {
      this.buildSession5Sheet4Layout();
    } else if (this.isSession5Final()) {
      this.buildSession5FinalLayout();
    } else if (this.isSession6Sheet1()) {
      this.buildSession6Sheet1Layout();
    } else if (this.isSession6Sheet2()) {
      this.buildSession6Sheet2Layout();
    } else if (this.isSession6Sheet3()) {
      this.buildSession6Sheet3Layout();
    } else if (this.isSession6Sheet4()) {
      this.buildSession6Sheet4Layout();
    } else switch (this.officeSheet.layout) {
      case "records":
        this.buildRecordsLayout();
        break;
      case "checkpoint":
        this.buildCheckpointLayout();
        break;
      case "meeting":
        this.buildMeetingLayout();
        break;
      case "audit":
        this.buildAuditLayout();
        break;
      default:
        this.buildOperationsLayout();
    }
    if (
      !this.isSession1Sheet2() &&
      !this.isSession1Sheet3() &&
      !this.isSession1Sheet4() &&
      !this.isSession1Final() &&
      !this.isSession2Sheet1() &&
      !this.isSession2Sheet2() &&
      !this.isSession2Sheet3() &&
      !this.isSession2Sheet4() &&
      !this.isSession2Final() &&
      !this.isSession3Sheet1() &&
      !this.isSession3Sheet2() &&
      !this.isSession3Sheet3() &&
      !this.isSession3Sheet4() &&
      !this.isSession3Final() &&
      !this.isSession4Sheet1() &&
      !this.isSession4Sheet2() &&
      !this.isSession4Sheet3() &&
      !this.isSession4Sheet4() &&
      !this.isSession4Final() &&
      !this.isSession5Sheet1() &&
      !this.isSession5Sheet2() &&
      !this.isSession5Sheet3() &&
      !this.isSession5Sheet4() &&
      !this.isSession5Final() &&
      !this.isSession6Sheet1() &&
      !this.isSession6Sheet2() &&
      !this.isSession6Sheet3() &&
      !this.isSession6Sheet4()
    ) this.placeSessionProps();
    this.columnSelection = this.add
      .rectangle(SECURITY_COLUMN_X, WORLD_HEIGHT / 2, CELL_WIDTH, WORLD_HEIGHT, 0x61d8ca, 0.06)
      .setStrokeStyle(2, 0x61d8ca, 0.42)
      .setDepth(5)
      .setVisible(false);
  }

  private buildSession1Sheet2Layout() {
    this.configureRoute(
      { x: 120, y: 390 },
      { x: 1160, y: 390 },
      { x: 1240, y: 390 },
      { axis: "horizontal", x: 360, y: 286, minimum: 180, maximum: 620 },
    );
    this.secondGuardStart = { x: 1040, y: 182 };
    this.secondGuardAxis = "horizontal";
    this.secondGuardMinimum = 860;
    this.secondGuardMaximum = 1180;

    // ROW 6 보안 파티션: 북쪽 기록실로 가기 위한 첫 번째 HIDE 대상.
    this.addPartition(320, 286, 620, 22, "ROW_6");
    this.addPartition(910, 286, 540, 22, "ROW_6");
    const rowGate = this.add.image(680, 286, "office-ref-turnstile")
      .setDisplaySize(82, 82).setDepth(8);
    const rowGateBody = this.addWall(680, 286, 62, 70, 0);
    this.registerHideTarget([rowGate], [rowGateBody], "ROW_6");

    // COLUMN J 기록실 벽과 CCTV: ROW 6과 독립적으로 한 번 더 숨겨야 한다.
    this.addPartition(760, 128, 22, 240, "COLUMN_J");
    this.addPartition(760, 590, 22, 672, "COLUMN_J");
    this.sheet2Cctv = this.add.image(760, 220, "office-ref-cctv")
      .setDisplaySize(64, 64).setDepth(9);
    this.registerHideTarget([this.sheet2Cctv], [], "COLUMN_J");

    this.createDeskPod(240, 150, "office-ref-leaderBack");
    this.createDeskPod(500, 150, "office-ref-coworkerBack");
    this.addHideableFurniture(940, 110, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1120, 110, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(980, 520, "office-ref-filingCabinet", 72, 80, 62, 68);
    this.addHideableFurniture(1180, 520, "office-ref-copier", 74, 92, 64, 82);
    this.addDoorway(680, 286, false);

    // P열 밖은 같은 층의 일반 업무 구역이지만 이번 시트에서는 LOCKED다.
    this.addPartition(1480, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1660, 180, "office-ref-coworkerBack");
    this.createDeskPod(1920, 180, "office-ref-leaderBack");
    this.createMeetingTable(1760, 520);
    this.addHideableFurniture(1940, 780, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1640, 800, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession1Sheet3Layout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1080, y: 78 },
      { x: 1320, y: 442 },
      { axis: "vertical", x: 1540, y: 520, minimum: 390, maximum: 720 },
    );

    // 보안문이 있는 북쪽 승인 기록실. K6 한 칸만 정상 출입구다.
    this.addPartition(395, 286, 770, 22, "LOCKED");
    this.addPartition(1030, 286, 300, 22, "LOCKED");
    this.addDoorway(840, 286, false);
    this.addPartition(1200, 200, 22, 400, "LOCKED");
    this.addPartition(1200, 700, 22, 472, "LOCKED");
    this.addDoorway(1200, 442, true);

    // H3 원본 출입증은 유리 파티션 안에 있어 이동할 수 없고 COPY만 가능하다.
    this.addPartition(600, 44, 260, 18, "LOCKED");
    this.addPartition(600, 216, 260, 18, "LOCKED");
    this.addPartition(470, 130, 18, 190, "LOCKED");
    this.addPartition(730, 130, 18, 190, "LOCKED");

    this.createDeskPod(220, 160, "office-ref-leaderBack");
    this.createDeskPod(900, 170, "office-ref-coworkerBack");
    this.createDeskPod(260, 560, "office-ref-coworkerBack");
    this.addHideableFurniture(720, 520, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1080, 520, "office-ref-filingCabinet", 72, 80, 62, 68);

    // Q열 밖은 같은 층의 일반 업무 구역이며 이번 퍼즐에서는 잠겨 있다.
    this.addPartition(1400, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1600, 210, "office-ref-coworkerBack");
    this.createDeskPod(1900, 210, "office-ref-leaderBack");
    this.createMeetingTable(1760, 540);
    this.addHideableFurniture(1940, 800, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession1Sheet4Layout() {
    this.configureRoute(
      { x: 120, y: 494 },
      { x: 1160, y: 130 },
      { x: 1320, y: 494 },
      { axis: "horizontal", x: 700, y: 598, minimum: 520, maximum: 980 },
    );

    // 북쪽 회의·지원 구역의 관리문. 프린터 시설 업무나 비상 해제로 열 수 있다.
    this.addPartition(455, 286, 890, 22, "LOCKED");
    this.addPartition(990, 286, 100, 22, "LOCKED");
    this.addDoorway(920, 286, false);

    // COLUMN N 직접 진입로. 벽과 연결 CCTV가 같은 논리 열에 묶인다.
    this.addPartition(1080, 560, 22, 752, "COLUMN_N");
    this.addDoorway(1080, 338, true);

    this.createDeskPod(220, 170, "office-ref-leaderBack");
    this.createDeskPod(520, 170, "office-ref-coworkerBack");
    this.createDeskPod(260, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(720, 820, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1240, 700);

    // R열 밖 일반 업무 공간은 이번 시트에서 잠겨 있다.
    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1640, 220, "office-ref-coworkerBack");
    this.createDeskPod(1920, 220, "office-ref-leaderBack");
    this.createMeetingTable(1760, 560);
    this.addHideableFurniture(1940, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession1FinalLayout() {
    this.configureRoute(
      { x: 120, y: 494 },
      { x: 1240, y: 130 },
      { x: 1320, y: 494 },
      { axis: "horizontal", x: 700, y: 598, minimum: 500, maximum: 980 },
    );

    // L2:P6 evaluation block. ROW 5 is the only editable crossing into it.
    this.addPartition(760, 100, 22, 184, "LOCKED");
    this.addPartition(760, 610, 22, 652, "LOCKED");
    this.addDoorway(760, 234, true);
    const reviewGate = this.add.image(760, 234, "office-ref-turnstile")
      .setDisplaySize(82, 82).setDepth(9);
    const reviewGateBody = this.addWall(760, 234, 58, 72, 0);
    this.registerHideTarget([reviewGate], [reviewGateBody], "ROW_5");

    this.addPartition(900, 390, 260, 22, "LOCKED");
    this.addPartition(1240, 390, 300, 22, "LOCKED");
    this.addDoorway(1060, 390, false);

    this.createDeskPod(220, 170, "office-ref-leaderBack");
    this.createDeskPod(520, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(260, 760, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1160, 700);

    // Decorative office continues beyond the prototype play space.
    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1640, 220, "office-ref-coworkerBack");
    this.createDeskPod(1920, 220, "office-ref-leaderBack");
    this.createMeetingTable(1760, 560);
    this.addHideableFurniture(1940, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2Sheet1Layout() {
    this.configureRoute(
      { x: 120, y: 390 },
      { x: 1160, y: 390 },
      { x: 1240, y: 390 },
      { axis: "horizontal", x: 620, y: 650, minimum: 440, maximum: 780 },
    );

    // K5 confirmation gate separates the sorted queue from the request office.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(220, 170, "office-ref-leaderBack");
    this.createDeskPod(220, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 760, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1040, 700, "office-ref-filingCabinet", 72, 80, 62, 68);

    this.addPartition(1360, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1600, 220, "office-ref-coworkerBack");
    this.createDeskPod(1900, 220, "office-ref-leaderBack");
    this.createMeetingTable(1760, 560);
    this.addHideableFurniture(1940, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2Sheet2Layout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1240, y: 442 },
      { x: 1320, y: 442 },
      { axis: "horizontal", x: 520, y: 702, minimum: 360, maximum: 680 },
    );

    this.addPartition(760, 100, 22, 184, "LOCKED");
    this.addPartition(760, 610, 22, 652, "LOCKED");
    this.addDoorway(760, 234, true);

    this.createDeskPod(180, 170, "office-ref-leaderBack");
    this.createDeskPod(220, 700, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 850, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1080, 650);
    this.addHideableFurniture(1280, 760, "office-ref-filingCabinet", 72, 80, 62, 68);

    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1640, 220, "office-ref-coworkerBack");
    this.createDeskPod(1920, 220, "office-ref-leaderBack");
    this.createMeetingTable(1760, 560);
    this.addHideableFurniture(1940, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2Sheet3Layout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1320, y: 442 },
      { x: 1400, y: 442 },
      { axis: "horizontal", x: 520, y: 702, minimum: 360, maximum: 700 },
    );

    // K5 clearance checkpoint. FILTER temporarily opens this staffed gate.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(180, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(500, 820, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1110, 650);
    this.addHideableFurniture(1240, 790, "office-ref-filingCabinet", 72, 80, 62, 68);

    // The rest of the floor stays visible as a believable office, but is not playable yet.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.createMeetingTable(1840, 560);
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2Sheet4Layout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1320, y: 442 },
      { x: 1400, y: 442 },
      { axis: "horizontal", x: 520, y: 702, minimum: 360, maximum: 700 },
    );

    // K5 dispatch checkpoint. Opens only after the team leader clears P3.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(180, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(500, 820, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1110, 650);
    this.addHideableFurniture(1240, 790, "office-ref-filingCabinet", 72, 80, 62, 68);

    // The rest of the floor stays visible as a believable office, but is not playable yet.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.createMeetingTable(1840, 560);
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2FinalLayout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1320, y: 442 },
      { x: 1400, y: 442 },
      { axis: "horizontal", x: 520, y: 702, minimum: 360, maximum: 700 },
    );

    // K5 audit checkpoint. Opens once the COMPLIANT verdict is stored at Q3.
    this.addPartition(920, 100, 22, 184, "LOCKED");
    this.addPartition(920, 610, 22, 652, "LOCKED");
    this.addDoorway(920, 234, true);

    this.createDeskPod(180, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(520, 840, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1180, 660);
    this.addHideableFurniture(1320, 800, "office-ref-filingCabinet", 72, 80, 62, 68);

    // The far floor stays visible as a believable office, but is not playable yet.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.createMeetingTable(1840, 560);
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession3Sheet1Layout() {
    this.configureRoute(
      { x: 160, y: 620 },
      { x: 1200, y: 442 },
      { x: 1400, y: 442 },
      { axis: "horizontal", x: 520, y: 780, minimum: 360, maximum: 720 },
    );

    // K5 automatic door in the checkpoint wall. IF opens it when EMPLOYEE_A reaches G4.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(200, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);
    this.createMeetingTable(1120, 660);

    // The far floor stays a believable office, locked for this tutorial.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.createMeetingTable(1840, 560);
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession3Sheet2Layout() {
    this.configureRoute(
      { x: 160, y: 620 },
      { x: 1400, y: 442 },
      { x: 1560, y: 442 },
      { axis: "horizontal", x: 420, y: 800, minimum: 300, maximum: 640 },
    );

    // H5 service door (opens on the immediate IF) in the first checkpoint wall.
    this.addPartition(680, 100, 22, 184, "LOCKED");
    this.addPartition(680, 610, 22, 652, "LOCKED");
    this.addDoorway(680, 234, true);

    // N5 server-room door (opens on the delayed IF) in the second checkpoint wall.
    this.addPartition(1120, 100, 22, 184, "LOCKED");
    this.addPartition(1120, 610, 22, 652, "LOCKED");
    this.addDoorway(1120, 234, true);

    this.createDeskPod(200, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(940, 820, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1320, 680);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1680, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1840, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession3Sheet3Layout() {
    this.configureRoute(
      { x: 160, y: 442 },
      { x: 1200, y: 442 },
      { x: 1360, y: 442 },
      { axis: "horizontal", x: 500, y: 800, minimum: 340, maximum: 700 },
    );

    // L5 timed door in the checkpoint wall; the conveyor's IF opens it for 3s.
    this.addPartition(920, 100, 22, 184, "LOCKED");
    this.addPartition(920, 610, 22, 652, "LOCKED");
    this.addDoorway(920, 234, true);

    this.createDeskPod(220, 720, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 860, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1180, 680);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession3Sheet4Layout() {
    this.configureRoute(
      { x: 160, y: 640 },
      { x: 1360, y: 442 },
      { x: 1540, y: 442 },
      { axis: "horizontal", x: 520, y: 820, minimum: 360, maximum: 720 },
    );

    // N6 server-room door in the checkpoint wall; the COUNTIF IF opens it.
    this.addPartition(1180, 100, 22, 184, "LOCKED");
    this.addPartition(1180, 610, 22, 652, "LOCKED");
    this.addDoorway(1180, 234, true);

    this.createDeskPod(220, 780, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 880, "office-ref-bookshelf", 92, 106, 82, 96);

    // The far floor stays a believable office, locked for this tutorial.
    this.addPartition(1660, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1840, 240, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession3FinalLayout() {
    this.configureRoute(
      { x: 160, y: 640 },
      { x: 1360, y: 300 },
      { x: 1500, y: 442 },
      { axis: "horizontal", x: 520, y: 820, minimum: 360, maximum: 760 },
    );

    // Shutdown checkpoint wall; opens once the AND(...) condition first holds.
    this.addPartition(1220, 100, 22, 184, "LOCKED");
    this.addPartition(1220, 610, 22, 652, "LOCKED");
    this.addDoorway(1220, 234, true);

    this.createDeskPod(220, 780, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 900, "office-ref-bookshelf", 92, 106, 82, 96);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1700, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1880, 260, "office-ref-coworkerBack");
    this.addHideableFurniture(2000, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession4Sheet1Layout() {
    this.configureRoute(
      { x: 160, y: 600 },
      { x: 1160, y: 442 },
      { x: 1320, y: 442 },
      { axis: "horizontal", x: 520, y: 780, minimum: 360, maximum: 700 },
    );

    // K5 security door in the checkpoint wall; the PASTE event latches it open.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(220, 740, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 860, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1120, 660);

    // The far floor stays a believable office, locked for this tutorial.
    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1620, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession4Sheet2Layout() {
    this.configureRoute(
      { x: 160, y: 600 },
      { x: 1160, y: 442 },
      { x: 1320, y: 442 },
      { axis: "horizontal", x: 520, y: 780, minimum: 360, maximum: 700 },
    );

    // L5 security door in the checkpoint wall; the immediate IF latches it open.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(220, 740, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 860, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1120, 660);

    // The far floor stays a believable office, locked for this tutorial.
    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1620, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession4Sheet3Layout() {
    this.configureRoute(
      { x: 160, y: 640 },
      { x: 1240, y: 442 },
      { x: 1400, y: 494 },
      { axis: "vertical", x: 900, y: 640, minimum: 520, maximum: 760 },
    );

    // First wall: H6 doorway blocked by CABINET_07 (its body is created with the cabinet).
    this.addPartition(600, 130, 22, 260, "LOCKED");
    this.addPartition(600, 576, 22, 520, "LOCKED");
    this.addDoorway(600, 286, true);

    // Second wall: only a row-9 gap, watched by the audit scanner.
    this.addPartition(1080, 208, 22, 416, "LOCKED");
    this.addPartition(1080, 652, 22, 368, "LOCKED");

    this.createDeskPod(240, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(320, 900, "office-ref-plant", 56, 68, 44, 52);
    this.createMeetingTable(840, 700);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1560, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1740, 240, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession4Sheet4Layout() {
    this.configureRoute(
      { x: 160, y: 620 },
      { x: 1360, y: 200 },
      { x: 1520, y: 620 },
      { axis: "vertical", x: 980, y: 640, minimum: 300, maximum: 820 },
    );

    // Open audit floor: the FULL ROW REVIEW beam sweeps the whole height, so the
    // hazard is vertical timing rather than walls. A few desks mark the sections.
    this.createDeskPod(300, 200, "office-ref-coworkerBack");
    this.createDeskPod(720, 780, "office-ref-coworkerBack");
    this.createDeskPod(1120, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 480, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1000, 500, "office-ref-filingCabinet", 72, 80, 62, 68);

    // Far floor stays a believable office, locked for this puzzle.
    this.addPartition(1640, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1820, 260, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession4FinalLayout() {
    this.configureRoute(
      { x: 160, y: 640 },
      { x: 1400, y: 300 },
      { x: 1520, y: 620 },
      { axis: "vertical", x: 1120, y: 640, minimum: 300, maximum: 820 },
    );

    // Open final-audit floor; the Auditor's last FULL ROW REVIEW sweeps the height.
    this.createDeskPod(240, 200, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 760, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(760, 640);

    // Far floor stays a believable office, locked for this puzzle.
    this.addPartition(1640, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1820, 260, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession5Sheet1Layout() {
    this.configureRoute(
      { x: 160, y: 600 },
      { x: 1160, y: 442 },
      { x: 1320, y: 442 },
      { axis: "vertical", x: 480, y: 640, minimum: 300, maximum: 820 },
    );

    // L5 security door in the checkpoint wall; only opens for a restored identity.
    this.addPartition(960, 100, 22, 184, "LOCKED");
    this.addPartition(960, 610, 22, 652, "LOCKED");
    this.addDoorway(960, 234, true);

    this.createDeskPod(220, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);
    this.createMeetingTable(1120, 660);

    // The far floor stays a believable office, locked for this tutorial.
    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1620, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession5Sheet2Layout() {
    this.configureRoute(
      { x: 160, y: 600 },
      { x: 1080, y: 442 },
      { x: 1200, y: 442 },
      { axis: "vertical", x: 480, y: 640, minimum: 300, maximum: 820 },
    );

    // H4:J6 deletion facility wall; the SECURITY_SHUTTER doorway is the only crossing.
    this.addPartition(680, 100, 22, 184, "LOCKED");
    this.addPartition(680, 610, 22, 652, "LOCKED");
    this.addDoorway(680, 234, true);

    this.createDeskPod(220, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);
    this.createMeetingTable(1000, 660);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1320, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1500, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession5Sheet3Layout() {
    this.configureRoute(
      { x: 160, y: 620 },
      { x: 1120, y: 442 },
      { x: 1320, y: 442 },
      { axis: "vertical", x: 900, y: 640, minimum: 300, maximum: 820 },
    );

    // Central headcount door; opens only while EMPLOYEE_COUNT >= 2.
    this.addPartition(760, 100, 22, 184, "LOCKED");
    this.addPartition(760, 610, 22, 652, "LOCKED");
    this.addDoorway(760, 234, true);

    this.createDeskPod(220, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);
    this.createMeetingTable(1060, 660);

    // The far floor stays a believable office, locked for this tutorial.
    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1620, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession5Sheet4Layout() {
    this.configureRoute(
      { x: 160, y: 600 },
      { x: 1420, y: 442 },
      { x: 1560, y: 442 },
      { axis: "vertical", x: 600, y: 640, minimum: 320, maximum: 820 },
    );

    // Three dependent doors (J6, N5, Q7) in sequence; all FAIL OPEN on relay delete.
    for (const x of [700, 980, 1240]) {
      this.addPartition(x, 100, 22, 184, "LOCKED");
      this.addPartition(x, 610, 22, 652, "LOCKED");
      this.addDoorway(x, 234, true);
    }

    this.createDeskPod(220, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1680, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1860, 260, "office-ref-coworkerBack");
    this.addHideableFurniture(2000, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession5FinalLayout() {
    this.configureRoute(
      { x: 160, y: 640 },
      { x: 1300, y: 442 },
      { x: 1440, y: 442 },
      { axis: "vertical", x: 1000, y: 640, minimum: 320, maximum: 820 },
    );

    // Open restructuring floor; VP DROP's first review is the near-side hazard.
    this.createDeskPod(220, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(400, 880, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(860, 700);

    // Far floor stays a believable office, locked for this capstone.
    this.addPartition(1560, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1740, 260, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession6Sheet1Layout() {
    this.configureRoute(
      { x: 160, y: 600 },
      { x: 1180, y: 442 },
      { x: 1360, y: 442 },
      { axis: "vertical", x: 520, y: 800, minimum: 320, maximum: 820 },
    );

    // Gate 1 (opens after the range-1 PASTE) and gate 2 (opens after the range-2 SORT).
    this.addPartition(620, 100, 22, 184, "LOCKED");
    this.addPartition(620, 610, 22, 652, "LOCKED");
    this.addDoorway(620, 234, true);
    this.addPartition(1000, 100, 22, 184, "LOCKED");
    this.addPartition(1000, 610, 22, 652, "LOCKED");
    this.addDoorway(1000, 234, true);

    this.createDeskPod(220, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);

    // The far floor stays a believable office, locked for this tutorial.
    this.addPartition(1480, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1660, 260, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession6Sheet2Layout() {
    this.configureRoute(
      { x: 160, y: 600 },
      { x: 1140, y: 442 },
      { x: 1360, y: 442 },
      { axis: "vertical", x: 620, y: 800, minimum: 320, maximum: 820 },
    );

    // N5 remote door in the checkpoint wall; the sandbox IF opens it.
    this.addPartition(960, 100, 22, 184, "LOCKED");
    this.addPartition(960, 610, 22, 652, "LOCKED");
    this.addDoorway(960, 234, true);

    this.createDeskPod(220, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1480, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1660, 260, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession6Sheet3Layout() {
    this.configureRoute(
      { x: 160, y: 600 },
      { x: 1180, y: 442 },
      { x: 1460, y: 442 },
      { axis: "vertical", x: 520, y: 800, minimum: 320, maximum: 820 },
    );

    // Gate 1 (COLUMN F read-only wall) and gate 2 (guard corridor) — both DRAFT 3s.
    this.addPartition(620, 100, 22, 184, "LOCKED");
    this.addPartition(620, 610, 22, 652, "LOCKED");
    this.addDoorway(620, 234, true);
    this.addPartition(900, 100, 22, 184, "LOCKED");
    this.addPartition(900, 610, 22, 652, "LOCKED");
    this.addDoorway(900, 234, true);

    this.createDeskPod(220, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1580, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1760, 260, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 840, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession6Sheet4Layout() {
    // Lower deck = local checkpoint (B11 start, D10 prep, T11 submit).
    // Upper deck = save storage (J5 template, N6 slot, R3 key) behind ROW 8.
    this.configureRoute(
      { x: 150, y: 620 },
      { x: 1560, y: 620 },
      { x: 1960, y: 620 },
      { axis: "vertical", x: 120, y: 200, minimum: 120, maximum: 320 },
    );

    // Lower-deck flavor, kept clear of the central save corridor.
    this.createMeetingTable(560, 720);
    this.createDeskPod(240, 860, "office-ref-coworkerBack");
    this.addHideableFurniture(90, 640, "office-ref-plant", 56, 68, 44, 52);
    this.addHideableFurniture(1980, 860, "office-ref-filingCabinet", 72, 80, 62, 68);

    // Upper-deck save-storage props (top corners only).
    this.createDeskPod(240, 130, "office-ref-leaderBack");
    this.addHideableFurniture(1980, 150, "office-ref-serverRack", 72, 78, 60, 66);
  }

  private buildOperationsLayout() {
    const offset = (this.officeSheet.session - 1) * 8;
    this.configureRoute(
      { x: 200, y: 806 }, { x: 1640, y: 806 }, { x: 1880, y: 156 },
      { axis: "vertical", x: 760, y: 520, minimum: 416, maximum: 624 },
    );
    this.addPartition(600, 184, 24, 352);
    this.addPartition(600, 744, 24, 384);
    this.addPartition(1040, 364, 720, 22);
    this.addPartition(1600, 364, 240, 22);
    this.addPartition(1040, 676, 720, 22);
    this.addPartition(1600, 676, 240, 22);
    this.addDoorway(1440, 364, false);
    this.addDoorway(1440, 676, false);
    this.addDoorway(600, 520, true);
    const gate = this.add.image(600, 520, "office-ref-turnstile").setDisplaySize(82, 82).setDepth(8);
    const gateCollider = this.addWall(600, 520, 28, 84, 0);
    this.registerHideTarget([gate], [gateCollider]);
    this.createDeskPod(200, 260 + offset, "office-ref-coworkerBack");
    this.createDeskPod(440, 260 + offset, "office-ref-leaderBack");
    this.createDeskPod(200, 520 + offset, "office-ref-coworkerBack");
    this.createDeskPod(440, 520 + offset, "office-ref-coworkerBack");
    this.createMeetingTable(1680, 510);
  }

  private buildRecordsLayout() {
    const shift = (this.officeSheet.session - 1) * 16;
    this.configureRoute(
      { x: 160, y: 806 }, { x: 1760, y: 754 }, { x: 1920, y: 156 },
      { axis: "horizontal", x: 1110, y: 520, minimum: 890, maximum: 1390 },
    );
    this.addPartition(680, 156, 22, 296);
    this.addPartition(680, 500, 22, 280);
    this.addPartition(680, 832, 22, 184);
    this.addDoorway(680, 338, true);
    this.addDoorway(680, 666, true);
    this.addPartition(1086, 364, 772, 22);
    this.addPartition(1604, 364, 168, 22);
    this.addPartition(1086, 676, 772, 22);
    this.addPartition(1604, 676, 168, 22);
    this.addDoorway(1520, 364, false);
    this.addDoorway(1520, 676, false);
    this.createDeskPod(200, 252 + shift / 4, "office-ref-coworkerBack");
    this.createDeskPod(440, 252 + shift / 4, "office-ref-leaderBack");
    this.createDeskPod(200, 520 + shift / 3, "office-ref-coworkerBack");
    for (const x of [880 + shift, 1120, 1360 - shift]) {
      this.addHideableFurniture(x, 250, "office-ref-bookshelf", 92, 106, 82, 96);
      this.addHideableFurniture(x, 790, "office-ref-filingCabinet", 72, 80, 62, 68);
    }
  }

  private buildCheckpointLayout() {
    const shift = (this.officeSheet.session - 1) * 14;
    this.configureRoute(
      { x: 160, y: 780 }, { x: 1740, y: 780 }, { x: 1920, y: 156 },
      { axis: "vertical", x: 1220, y: 510, minimum: 250, maximum: 660 },
    );
    this.addPartition(560, 156, 22, 296);
    this.addPartition(560, 520, 22, 260);
    this.addPartition(560, 832, 22, 184);
    this.addPartition(1040, 156, 22, 296);
    this.addPartition(1040, 520, 22, 260);
    this.addPartition(1040, 832, 22, 184);
    this.addPartition(1500, 156, 22, 296);
    this.addPartition(1500, 520, 22, 260);
    this.addPartition(1500, 832, 22, 184);
    for (const x of [560, 1040, 1500]) {
      this.addDoorway(x, 338, true);
      this.addDoorway(x, 676, true);
    }
    this.createReceptionDesk(300, 400 + shift);
    for (const x of [800, 1280]) {
      const gate = this.add.image(x, 520, "office-ref-turnstile").setDisplaySize(80, 80).setDepth(5);
      const collider = this.addWall(x, 520, 32, 82, 0);
      this.registerHideTarget([gate], [collider]);
    }
    this.createDeskPod(1780, 430 + shift / 2, "office-ref-leaderBack");
  }

  private buildMeetingLayout() {
    const shift = (this.officeSheet.session - 1) * 12;
    this.configureRoute(
      { x: 180, y: 806 }, { x: 1840, y: 780 }, { x: 1920, y: 156 },
      { axis: "horizontal", x: 1160, y: 740, minimum: 860, maximum: 1500 },
    );
    this.addPartition(760, 182, 22, 348);
    this.addPartition(760, 578, 22, 250);
    this.addPartition(760, 856, 22, 144);
    this.addDoorway(760, 382, true);
    this.addDoorway(760, 718, true);
    for (const y of [364, 676]) {
      this.addPartition(875, y, 230, 22);
      this.addPartition(1360, y, 540, 22);
      this.addPartition(1885, y, 310, 22);
    }
    this.addDoorway(1040, 364, false);
    this.addDoorway(1680, 364, false);
    this.addDoorway(1040, 676, false);
    this.addDoorway(1680, 676, false);
    this.createDeskPod(220, 252 + shift / 3, "office-ref-coworkerBack");
    this.createDeskPod(500, 252 + shift / 3, "office-ref-leaderBack");
    this.createDeskPod(220, 540 + shift / 3, "office-ref-coworkerBack");
    this.createMeetingTable(1260 - shift, 500 + shift / 2);
    this.createMeetingTable(1740 + shift / 3, 540 - shift / 3);
  }

  private buildAuditLayout() {
    const shift = (this.officeSheet.session - 1) * 12;
    this.configureRoute(
      { x: 160, y: 806 }, { x: 1120, y: 240 }, { x: 1920, y: 156 },
      { axis: "horizontal", x: 1100, y: 728, minimum: 760, maximum: 1440 },
    );
    this.addPartition(500, 364, 840, 22);
    this.addPartition(1560, 364, 960, 22);
    this.addPartition(500, 676, 840, 22);
    this.addPartition(1560, 676, 960, 22);
    this.addDoorway(1040, 364, false);
    this.addDoorway(1040, 676, false);
    this.addPartition(680, 156, 22, 296);
    this.addPartition(680, 520, 22, 260);
    this.addPartition(680, 832, 22, 184);
    this.addPartition(1600, 156, 22, 296);
    this.addPartition(1600, 520, 22, 260);
    this.addPartition(1600, 832, 22, 184);
    this.addDoorway(680, 338, true);
    this.addDoorway(680, 676, true);
    this.addDoorway(1600, 338, true);
    this.addDoorway(1600, 676, true);
    this.createDeskPod(260, 250 + shift / 3, "office-ref-leaderBack");
    this.createDeskPod(260, 520 + shift / 3, "office-ref-coworkerBack");
    this.createMeetingTable(1120 - shift / 2, 520);
    this.createDeskPod(1840, 500 + shift / 3, "office-ref-coworkerBack");
    this.createManager(1380 + shift / 2, 520);
  }

  private configureRoute(
    player: { x: number; y: number },
    terminal: { x: number; y: number },
    exit: { x: number; y: number },
    guard: { axis: "horizontal" | "vertical"; x: number; y: number; minimum: number; maximum: number },
  ) {
    this.playerStart = player;
    this.terminalPosition = terminal;
    this.exitPosition = exit;
    this.guardAxis = guard.axis;
    this.guardStart = { x: guard.x, y: guard.y };
    this.guardMinimum = guard.minimum;
    this.guardMaximum = guard.maximum;
  }

  private addDoorway(x: number, y: number, vertical: boolean) {
    const doorway = this.add.image(x, y, "office-ref-doorway")
      .setDisplaySize(vertical ? 24 : 84, vertical ? 78 : 24)
      .setDepth(8);
    if (vertical) doorway.setAngle(90);
    this.registerHideTarget([doorway]);
  }

  private createMeetingTable(x: number, y: number) {
    const shadow = this.add.ellipse(x, y + 30, 274, 72, 0x16312c, 0.17);
    const table = this.add.image(x, y, "office-ref-conferenceTable")
      .setDisplaySize(260, 130).setDepth(3);
    const collider = this.addWall(x, y, 250, 112, 0);
    this.registerHideTarget([shadow, table], [collider]);
  }

  private createReceptionDesk(x: number, y: number) {
    this.createDeskPod(x, y, "office-ref-leaderBack");
    this.addHideableFurniture(x + 230, y + 40, "office-ref-scanner", 70, 78, 58, 66);
  }

  private placeSessionProps() {
    const props: Record<number, readonly [string, number, number][]> = {
      1: [["office-ref-copier", 1980, 820], ["office-ref-filingCabinet", 1980, 710]],
      2: [["office-ref-scanner", 1980, 820], ["office-ref-sensorPad", 1980, 710]],
      3: [["office-ref-projector", 1980, 820], ["office-ref-chargeNode", 1980, 710]],
      4: [["office-ref-saveSlot", 1980, 820], ["office-ref-filingCabinet", 1980, 710]],
      5: [["office-ref-serverRack", 1980, 820], ["office-ref-cctv", 1980, 710]],
      6: [["office-ref-rootLock", 1980, 820], ["office-ref-serverRack", 1980, 710]],
    };
    for (const [texture, x, y] of props[this.officeSheet.session] ?? []) {
      this.addHideableFurniture(x, y, texture, 72, 78, 60, 66);
    }
    this.addHideableFurniture(90, 650, "office-ref-plant", 56, 68, 44, 52);
    this.addHideableFurniture(90, 110, "office-ref-waterCooler", 54, 72, 44, 58);
  }

  private createManager(x: number, y: number) {
    const textureBySession = [
      "office-ref-managerVlookup",
      "office-ref-chiefCountif",
      "office-ref-directorIferror",
      "office-ref-auditorCtrl",
      "office-ref-vpDrop",
      "office-ref-managerVlookup",
    ];
    const manager = this.add.image(
      x,
      y,
      textureBySession[this.officeSheet.session - 1] ?? "office-ref-managerVlookup",
    )
      .setDisplaySize(62, 88).setDepth(9);
    const collider = this.addWall(x, y + 8, 48, 58, 0);
    this.registerHideTarget([manager], [collider]);
  }

  private createDeskPod(x: number, y: number, employeeTexture: string) {
    const shadow = this.add.ellipse(x, y + 54, 166, 44, 0x17312c, 0.14);
    const desk = this.add.image(x, y - 30, "office-ref-desk")
      .setDisplaySize(150, 76).setDepth(2);
    const monitor = this.add.image(x, y - 53, "office-ref-monitor")
      .setDisplaySize(42, 38).setDepth(3);
    const employee = this.add.image(x, y + 30, employeeTexture)
      .setDisplaySize(60, 82).setDepth(4);
    const chair = this.add.image(x, y + 66, "office-ref-chair")
      .setDisplaySize(58, 58).setDepth(5);
    const deskCollider = this.addWall(x, y - 12, 152, 74, 0);
    const chairCollider = this.addWall(x, y + 68, 54, 50, 0);
    this.registerHideTarget(
      [shadow, desk, monitor, employee, chair],
      [deskCollider, chairCollider],
    );
  }

  private createPlayer() {
    this.playerShadow = this.add.ellipse(this.playerStart.x, this.playerStart.y + 33, 46, 15, 0x102720, 0.24)
      .setDepth(19);
    this.player = this.physics.add.sprite(this.playerStart.x, this.playerStart.y, "office-ref-playerWalkFront1")
      .setScale(0.2)
      .setCollideWorldBounds(true)
      .setDepth(20);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(92, 108).setOffset(43, 205);
    if (this.walls) this.physics.add.collider(this.player, this.walls);
  }

  private createGuard() {
    if (this.isSession1Sheet3()) return;
    this.guardShadow = this.add.ellipse(this.guardStart.x, this.guardStart.y + 33, 48, 15, 0x102720, 0.24)
      .setDepth(17);
    this.guard = this.physics.add.sprite(this.guardStart.x, this.guardStart.y, "office-ref-guardWalkFront1")
      .setScale(0.2)
      .setDepth(18);
    const body = this.guard.body as Phaser.Physics.Arcade.Body;
    body.setSize(180, 190).setOffset(166, 282);
    body.setVelocity(0);
    this.registerHideTarget(
      [this.guard, this.guardShadow],
      [this.guard],
      this.isSession1Sheet2() ? "ROW_6" : undefined,
    );
    if (this.isSession1Sheet2()) {
      this.secondGuardShadow = this.add.ellipse(
        this.secondGuardStart.x,
        this.secondGuardStart.y + 33,
        48,
        15,
        0x102720,
        0.24,
      ).setDepth(17);
      this.secondGuard = this.physics.add.sprite(
        this.secondGuardStart.x,
        this.secondGuardStart.y,
        "office-ref-guardWalkLeft1",
      ).setScale(0.2).setDepth(18);
      const secondBody = this.secondGuard.body as Phaser.Physics.Arcade.Body;
      secondBody.setSize(180, 190).setOffset(166, 282).setVelocity(0);
      this.registerHideTarget(
        [this.secondGuard, this.secondGuardShadow],
        [this.secondGuard],
      );
    }
  }

  private createMissionObjects() {
    if (this.isSession1Sheet2()) {
      this.createSession1Sheet2MissionObjects();
      return;
    }
    if (this.isSession1Sheet3()) {
      this.createSession1Sheet3MissionObjects();
      return;
    }
    if (this.isSession1Sheet4()) {
      this.createSession1Sheet4MissionObjects();
      return;
    }
    if (this.isSession1Final()) {
      this.createSession1FinalMissionObjects();
      return;
    }
    if (this.isSession2Sheet1()) {
      this.createSession2Sheet1MissionObjects();
      return;
    }
    if (this.isSession2Sheet2()) {
      this.createSession2Sheet2MissionObjects();
      return;
    }
    if (this.isSession2Sheet3()) {
      this.createSession2Sheet3MissionObjects();
      return;
    }
    if (this.isSession2Sheet4()) {
      this.createSession2Sheet4MissionObjects();
      return;
    }
    if (this.isSession2Final()) {
      this.createSession2FinalMissionObjects();
      return;
    }
    if (this.isSession3Sheet1()) {
      this.createSession3Sheet1MissionObjects();
      return;
    }
    if (this.isSession3Sheet2()) {
      this.createSession3Sheet2MissionObjects();
      return;
    }
    if (this.isSession3Sheet3()) {
      this.createSession3Sheet3MissionObjects();
      return;
    }
    if (this.isSession3Sheet4()) {
      this.createSession3Sheet4MissionObjects();
      return;
    }
    if (this.isSession3Final()) {
      this.createSession3FinalMissionObjects();
      return;
    }
    if (this.isSession4Sheet1()) {
      this.createSession4Sheet1MissionObjects();
      return;
    }
    if (this.isSession4Sheet2()) {
      this.createSession4Sheet2MissionObjects();
      return;
    }
    if (this.isSession4Sheet3()) {
      this.createSession4Sheet3MissionObjects();
      return;
    }
    if (this.isSession4Sheet4()) {
      this.createSession4Sheet4MissionObjects();
      return;
    }
    if (this.isSession4Final()) {
      this.createSession4FinalMissionObjects();
      return;
    }
    if (this.isSession5Sheet1()) {
      this.createSession5Sheet1MissionObjects();
      return;
    }
    if (this.isSession5Sheet2()) {
      this.createSession5Sheet2MissionObjects();
      return;
    }
    if (this.isSession5Sheet3()) {
      this.createSession5Sheet3MissionObjects();
      return;
    }
    if (this.isSession5Sheet4()) {
      this.createSession5Sheet4MissionObjects();
      return;
    }
    if (this.isSession5Final()) {
      this.createSession5FinalMissionObjects();
      return;
    }
    if (this.isSession6Sheet1()) {
      this.createSession6Sheet1MissionObjects();
      return;
    }
    if (this.isSession6Sheet2()) {
      this.createSession6Sheet2MissionObjects();
      return;
    }
    if (this.isSession6Sheet3()) {
      this.createSession6Sheet3MissionObjects();
      return;
    }
    if (this.isSession6Sheet4()) {
      this.createSession6Sheet4MissionObjects();
      return;
    }
    this.terminalHighlight = this.add.image(this.terminalPosition.x, this.terminalPosition.y, "office-ref-itemHighlight")
      .setDisplaySize(94, 94)
      .setTint(0xffd66e)
      .setAlpha(0.44)
      .setDepth(7);
    this.tweens.add({
      targets: this.terminalHighlight,
      alpha: 0.2,
      scaleX: this.terminalHighlight.scaleX * 1.06,
      scaleY: this.terminalHighlight.scaleY * 1.06,
      duration: 760,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
    this.terminal = this.add.image(this.terminalPosition.x, this.terminalPosition.y, "office-ref-terminal")
      .setDisplaySize(74, 92).setDepth(8);
    const terminalCollider = this.addWall(
      this.terminalPosition.x,
      this.terminalPosition.y,
      66,
      82,
      0,
    );
    this.registerHideTarget(
      [this.terminalHighlight, this.terminal],
      [terminalCollider],
    );

    this.exitDoor = this.add.image(this.exitPosition.x, this.exitPosition.y, "office-ref-exitLocked")
      .setDisplaySize(86, 112).setDepth(8);
    const exitCollider = this.addWall(this.exitPosition.x, this.exitPosition.y, 76, 100, 0);
    this.registerHideTarget([this.exitDoor], [exitCollider]);

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession1Sheet2MissionObjects() {
    const contractPosition = { x: 840, y: 130 };
    this.contractHighlight = this.add.image(
      contractPosition.x,
      contractPosition.y,
      "office-ref-itemHighlight",
    ).setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.42).setDepth(7);
    this.contractDocument = this.add.image(
      contractPosition.x,
      contractPosition.y,
      "office-ref-contractDocument",
    ).setDisplaySize(50, 58).setDepth(8);

    this.rechargeHighlight = this.add.image(360, 78, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0x71d8cb).setAlpha(0.32).setDepth(7);
    this.rechargeNode = this.add.image(360, 78, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(360, 78, 48, 48, 0);
    this.registerHideTarget(
      [this.rechargeHighlight, this.rechargeNode],
      [rechargeBody],
    );

    this.terminalHighlight = this.add.image(
      this.terminalPosition.x,
      this.terminalPosition.y,
      "office-ref-itemHighlight",
    ).setDisplaySize(86, 86).setTint(0xffd66e).setAlpha(0.36).setDepth(7);
    this.terminal = this.add.image(
      this.terminalPosition.x,
      this.terminalPosition.y,
      "office-ref-saveSlot",
    ).setDisplaySize(64, 72).setDepth(8);
    const outboxBody = this.addWall(
      this.terminalPosition.x,
      this.terminalPosition.y,
      52,
      62,
      0,
    );
    this.registerHideTarget([this.terminalHighlight, this.terminal], [outboxBody]);

    this.exitDoor = this.add.image(
      this.exitPosition.x,
      this.exitPosition.y,
      "office-ref-exitLocked",
    ).setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(this.exitPosition.x, this.exitPosition.y, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody]);
    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession1Sheet3MissionObjects() {
    this.sheet3TrainingHighlight = this.add.image(440, 390, "office-ref-itemHighlight")
      .setDisplaySize(84, 84).setTint(0x71d8cb).setAlpha(0.36).setDepth(7);
    this.sheet3TrainingTerminal = this.add.image(440, 390, "office-ref-terminal")
      .setDisplaySize(62, 76).setDepth(8);
    const trainingBody = this.addWall(440, 390, 52, 64, 0);
    this.registerHideTarget(
      [this.sheet3TrainingHighlight, this.sheet3TrainingTerminal],
      [trainingBody],
      "LOCKED",
    );

    this.sheet3PasteStation = this.add.image(560, 390, "office-ref-sensorPad")
      .setDisplaySize(66, 54).setDepth(8);
    const pasteBody = this.addWall(560, 390, 56, 42, 0);
    this.registerHideTarget([this.sheet3PasteStation], [pasteBody], "LOCKED");

    this.sheet3BadgeHighlight = this.add.image(600, 130, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.sheet3LeaderBadge = this.add.image(600, 130, "office-ref-keycard")
      .setDisplaySize(48, 42).setDepth(8);

    this.sheet3SecurityDoor = this.add.image(840, 286, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.sheet3SecurityDoorBody = this.addWall(840, 286, 58, 88, 0);

    this.sheet3ApprovalHighlight = this.add.image(1080, 130, "office-ref-itemHighlight")
      .setDisplaySize(78, 78).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.sheet3ApprovalDocument = this.add.image(1080, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.terminalPosition = { x: 1080, y: 78 };
    this.terminalHighlight = this.add.image(1080, 78, "office-ref-itemHighlight")
      .setDisplaySize(72, 72).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.terminal = this.add.image(1080, 78, "office-ref-saveSlot")
      .setDisplaySize(54, 62).setDepth(8);
    const outboxBody = this.addWall(1080, 78, 46, 50, 0);
    this.registerHideTarget([this.terminalHighlight, this.terminal], [outboxBody], "LOCKED");

    this.sheet3BadgeTray = this.add.image(1000, 350, "office-ref-sensorPad")
      .setDisplaySize(66, 54).setTint(0x7fc7a5).setDepth(8);
    const trayBody = this.addWall(1000, 350, 56, 42, 0);
    this.registerHideTarget([this.sheet3BadgeTray], [trayBody], "LOCKED");

    this.add.image(1240, 442, "office-ref-scanner")
      .setDisplaySize(64, 76).setDepth(8);
    this.exitPosition = { x: 1320, y: 442 };
    this.exitDoor = this.add.image(1320, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession1Sheet4MissionObjects() {
    const pulse = (image: Phaser.GameObjects.Image) => {
      this.tweens.add({
        targets: image,
        alpha: 0.2,
        scaleX: image.scaleX * 1.06,
        scaleY: image.scaleY * 1.06,
        duration: 760,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1,
      });
    };

    const printerHighlight = this.add.image(520, 390, "office-ref-itemHighlight")
      .setDisplaySize(86, 86).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    pulse(printerHighlight);
    this.sheet4Printer = this.add.image(520, 390, "office-ref-copier")
      .setDisplaySize(70, 88).setDepth(8);
    const printerBody = this.addWall(520, 390, 58, 76, 0);
    this.registerHideTarget([printerHighlight, this.sheet4Printer], [printerBody], "LOCKED");

    const cabinetHighlight = this.add.image(360, 338, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.38).setDepth(7);
    pulse(cabinetHighlight);
    this.sheet4Cabinet = this.add.image(360, 338, "office-ref-filingCabinet")
      .setDisplaySize(66, 74).setDepth(8);
    const cabinetBody = this.addWall(360, 338, 54, 62, 0);
    this.registerHideTarget([cabinetHighlight, this.sheet4Cabinet], [cabinetBody], "LOCKED");

    this.sheet4PrinterTarget = this.add.image(1000, 390, "office-ref-sensorPad")
      .setDisplaySize(66, 54).setTint(0x7fc7a5).setDepth(8);
    const printerTargetBody = this.addWall(1000, 390, 54, 42, 0);
    this.registerHideTarget([this.sheet4PrinterTarget], [printerTargetBody], "LOCKED");

    this.sheet4CabinetTarget = this.add.image(840, 182, "office-ref-sensorPad")
      .setDisplaySize(66, 54).setTint(0x8fb4c7).setDepth(8);
    const cabinetTargetBody = this.addWall(840, 182, 54, 42, 0);
    this.registerHideTarget([this.sheet4CabinetTarget], [cabinetTargetBody], "LOCKED");

    this.sheet4AdminDoor = this.add.image(920, 286, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.sheet4AdminDoorBody = this.addWall(920, 286, 58, 88, 0);

    this.sheet4EmergencyRelease = this.add.image(920, 354, "office-ref-emergencyRelease")
      .setDisplaySize(52, 58).setDepth(8);
    const releaseBody = this.addWall(920, 354, 42, 48, 0);
    this.registerHideTarget([this.sheet4EmergencyRelease], [releaseBody], "LOCKED");

    this.sheet4Facilities = [
      this.add.image(360, 650, "office-ref-coworkerFront").setDisplaySize(56, 78).setDepth(10),
      this.add.image(520, 650, "office-ref-coworkerFront").setDisplaySize(56, 78).setDepth(10),
    ];

    this.sheet4Cctvs = [
      this.add.image(1040, 182, "office-ref-cctv").setDisplaySize(62, 62).setDepth(9),
      this.add.image(1160, 390, "office-ref-cctv").setDisplaySize(62, 62).setDepth(9),
    ];
    for (const cctv of this.sheet4Cctvs) {
      this.registerHideTarget([cctv], [], "COLUMN_N");
    }

    this.sheet4ColleagueHighlight = this.add.image(1160, 130, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    pulse(this.sheet4ColleagueHighlight);
    this.sheet4Colleague = this.add.image(1160, 130, "office-ref-coworkerFront")
      .setDisplaySize(58, 82).setDepth(10);
    this.terminal = this.sheet4Colleague;
    this.terminalHighlight = this.sheet4ColleagueHighlight;

    this.exitDoor = this.add.image(1320, 494, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 494, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession1FinalMissionObjects() {
    this.finalProjectHighlight = this.add.image(440, 130, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.finalProjectBonus = this.add.image(440, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.finalRechargeNode = this.add.image(360, 390, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(360, 390, 48, 48, 0);
    this.registerHideTarget([this.finalRechargeNode], [rechargeBody], "LOCKED");

    const evaluationRows = [
      { y: 78, label: "ATTENDANCE", value: "+20", tint: 0xdcebdc },
      { y: 130, label: "TASK COMPLETION", value: "+22", tint: 0xdcebdc },
      { y: 182, label: "POTENTIAL", value: "+15", tint: 0xdcebdc },
      { y: 234, label: "PROBATION PENALTY", value: "-15", tint: 0xf0c5bd },
      { y: 286, label: "BORROWED RESULT", value: "0", tint: 0xd8e4e0 },
    ];
    for (const row of evaluationRows) {
      const background = this.add.rectangle(1060, row.y, 300, 40, row.tint, 0.9)
        .setStrokeStyle(1, 0x78968c).setDepth(6);
      const label = this.add.text(920, row.y, row.label, {
        color: "#23463d",
        fontFamily: "monospace",
        fontSize: "16px",
      }).setOrigin(0, 0.5).setDepth(7);
      const value = this.add.text(1184, row.y, row.value, {
        color: row.value.startsWith("-") ? "#9a3f39" : "#285b45",
        fontFamily: "monospace",
        fontSize: "18px",
        fontStyle: "bold",
      }).setOrigin(1, 0.5).setDepth(7);
      if (row.y === 234) {
        this.registerHideTarget([background, label, value], [], "ROW_5");
      }
    }

    this.finalBorrowTarget = this.add.image(1160, 286, "office-ref-sensorPad")
      .setDisplaySize(62, 48).setTint(0x7fc7a5).setDepth(9);

    this.finalSubmitTerminal = this.add.image(1240, 130, "office-ref-terminal")
      .setDisplaySize(64, 80).setDepth(10);
    this.terminal = this.finalSubmitTerminal;
    this.terminalHighlight = this.add.image(1240, 130, "office-ref-itemHighlight")
      .setDisplaySize(86, 86).setTint(0xffd66e).setAlpha(0.34).setDepth(8);

    this.finalManager = this.add.image(840, 130, "office-ref-managerVlookup")
      .setDisplaySize(62, 88).setDepth(10);
    const managerBody = this.addWall(840, 138, 48, 58, 0);
    this.registerHideTarget([this.finalManager], [managerBody], "LOCKED");

    this.finalCctvs = [
      this.add.image(960, 442, "office-ref-cctv").setDisplaySize(62, 62).setDepth(9),
      this.add.image(1260, 650, "office-ref-cctv").setDisplaySize(62, 62).setDepth(9),
    ];
    for (const cctv of this.finalCctvs) this.registerHideTarget([cctv], [], "LOCKED");

    this.exitDoor = this.add.image(1320, 494, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 494, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.finalScoreLabel = this.add.text(880, 334, "", {
      backgroundColor: "#f4f7ee",
      color: "#17382f",
      fontFamily: "monospace",
      fontSize: "20px",
      padding: { x: 12, y: 8 },
    }).setDepth(30);
    this.finalManagerLabel = this.add.text(600, 334, "", {
      backgroundColor: "#273f39",
      color: "#f2d875",
      fontFamily: "monospace",
      fontSize: "17px",
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5, 0).setDepth(30);
    this.updateFinalScoreDisplay();

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2Sheet1MissionObjects() {
    this.s2s1TrainingHighlight = this.add.image(280, 338, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s2s1TrainingTerminal = this.add.image(280, 338, "office-ref-terminal")
      .setDisplaySize(62, 76).setDepth(8);
    const trainingBody = this.addWall(280, 338, 52, 64, 0);
    this.registerHideTarget(
      [this.s2s1TrainingHighlight, this.s2s1TrainingTerminal],
      [trainingBody],
      "LOCKED",
    );

    this.s2s1SortStation = this.add.image(440, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const sortStationBody = this.addWall(440, 338, 56, 42, 0);
    this.registerHideTarget([this.s2s1SortStation], [sortStationBody], "LOCKED");

    const queueData = [
      { name: "TEAM_LEADER", rank: 3 },
      { name: "STAFF_B", rank: 2 },
      { name: "INTERN", rank: 1 },
      { name: "STAFF_A", rank: 2 },
      { name: "UNKNOWN", rank: null },
    ];
    this.s2s1QueueEntries = queueData.map((entry, originalIndex) => {
      const background = this.add.rectangle(0, 0, 74, 76, 0xf3f6ef, 0.96)
        .setStrokeStyle(2, 0x78968c);
      const name = this.add.text(0, -14, entry.name, {
        color: "#24463d",
        fontFamily: "monospace",
        fontSize: entry.name.length > 9 ? "10px" : "12px",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const rank = this.add.text(0, 15, `RANK ${entry.rank ?? ""}`, {
        color: entry.rank === null ? "#9b6b62" : "#527267",
        fontFamily: "monospace",
        fontSize: "11px",
      }).setOrigin(0.5);
      const container = this.add.container(440 + originalIndex * 80, 130, [background, name, rank])
        .setDepth(8);
      return { ...entry, container, originalIndex };
    });

    this.s2s1Gate = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2s1GateBody = this.addWall(840, 234, 58, 88, 0);

    this.s2s1RequestHighlight = this.add.image(1080, 130, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s2s1Request = this.add.image(1080, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s2s1Outbox = this.add.image(1160, 390, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1160, 390, 52, 62, 0);
    this.terminal = this.s2s1Outbox;
    this.terminalHighlight = this.add.image(1160, 390, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s2s1Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1240, 390, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1240, 390, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2Sheet2MissionObjects() {
    this.s2s2SortStation = this.add.image(360, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const sortStationBody = this.addWall(360, 338, 56, 42, 0);
    this.registerHideTarget([this.s2s2SortStation], [sortStationBody], "LOCKED");

    const queueData = [
      { name: "SECURITY_A", departmentCode: 3 },
      { name: "OPERATIONS", departmentCode: 2 },
      { name: "HR_A", departmentCode: 1 },
      { name: "SECURITY_B", departmentCode: 3 },
      { name: "HR_B", departmentCode: 1 },
      { name: "UNKNOWN", departmentCode: null },
    ];
    this.s2s2QueueEntries = queueData.map((entry, originalIndex) => {
      const background = this.add.rectangle(0, 0, 74, 46, 0xf3f6ef, 0.96)
        .setStrokeStyle(2, 0x78968c);
      const name = this.add.text(0, -8, entry.name, {
        color: entry.name.startsWith("SECURITY") ? "#7a413a" : "#24463d",
        fontFamily: "monospace",
        fontSize: entry.name.length > 9 ? "9px" : "11px",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const code = this.add.text(0, 10, `DEPT ${entry.departmentCode ?? ""}`, {
        color: entry.departmentCode === null ? "#9b6b62" : "#527267",
        fontFamily: "monospace",
        fontSize: "9px",
      }).setOrigin(0.5);
      const column = originalIndex % 3;
      const row = Math.floor(originalIndex / 3);
      const container = this.add.container(440 + column * 80, 130 + row * 52, [background, name, code])
        .setDepth(8);
      return { ...entry, container, originalIndex };
    });

    this.s2s2Gate = this.add.image(760, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2s2GateBody = this.addWall(760, 234, 58, 88, 0);

    this.s2s2Cctv = this.add.image(720, 390, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);
    this.registerHideTarget([this.s2s2Cctv], [], "LOCKED");

    this.s2s2RequestHighlight = this.add.image(1080, 130, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s2s2Request = this.add.image(1080, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s2s2Outbox = this.add.image(1240, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1240, 442, 52, 62, 0);
    this.terminal = this.s2s2Outbox;
    this.terminalHighlight = this.add.image(1240, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s2s2Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1320, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2Sheet3MissionObjects() {
    this.s2s3TrainingTerminal = this.add.image(280, 390, "office-ref-terminal")
      .setDisplaySize(64, 80).setTint(0x91cbb4).setDepth(8);
    const trainingBody = this.addWall(280, 390, 54, 70, 0);
    this.registerHideTarget([this.s2s3TrainingTerminal], [trainingBody], "LOCKED");

    this.s2s3FilterStation = this.add.image(600, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x71d8cb).setDepth(8);
    const filterStationBody = this.addWall(600, 338, 56, 42, 0);
    this.registerHideTarget([this.s2s3FilterStation], [filterStationBody], "LOCKED");

    const queueData = [
      { name: "HR_A", clearance: 2 },
      { name: "SECURITY_A", clearance: 3 },
      { name: "STAFF_A", clearance: 1 },
      { name: "STAFF_B", clearance: 2 },
      { name: "EXPIRED_BADGE", clearance: null },
      { name: "VISITOR_BOX", clearance: 0 },
    ];
    this.s2s3QueueEntries = queueData.map((entry, index) => ({
      ...entry,
      container: this.createClearanceCard(
        440 + (index % 3) * 112,
        130 + Math.floor(index / 3) * 58,
        entry.name,
        entry.clearance,
      ),
      qualified: (entry.clearance ?? -1) >= 2,
    }));
    this.s2s3LateStaff = this.createClearanceCard(664, 188, "LATE_STAFF", 1)
      .setVisible(false);

    this.s2s3Gate = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2s3GateBody = this.addWall(840, 234, 58, 88, 0);

    this.s2s3RechargeNode = this.add.image(280, 78, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(280, 78, 48, 48, 0);
    this.registerHideTarget([this.s2s3RechargeNode], [rechargeBody], "LOCKED");

    this.s2s3Cctv = this.add.image(1030, 546, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s2s3PatchHighlight = this.add.image(1160, 130, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s2s3Patch = this.add.image(1160, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s2s3Outbox = this.add.image(1320, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1320, 442, 52, 62, 0);
    this.terminal = this.s2s3Outbox;
    this.terminalHighlight = this.add.image(1320, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s2s3Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1400, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2Sheet4MissionObjects() {
    this.s2s4DispatchHighlight = this.add.image(280, 390, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s2s4DispatchTerminal = this.add.image(280, 390, "office-ref-terminal")
      .setDisplaySize(64, 80).setDepth(8);
    const dispatchBody = this.addWall(280, 390, 54, 70, 0);
    this.terminal = this.s2s4DispatchTerminal;
    this.registerHideTarget(
      [this.s2s4DispatchHighlight, this.s2s4DispatchTerminal],
      [dispatchBody],
      "LOCKED",
    );

    this.s2s4WriteConsole = this.add.image(600, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const writeConsoleBody = this.addWall(600, 338, 56, 42, 0);
    this.registerHideTarget([this.s2s4WriteConsole], [writeConsoleBody], "LOCKED");

    const queueData: Array<{ name: string; role: "TEAM_LEADER" | "FACILITIES"; priority: number }> = [
      { name: "BUDGET_APPROVAL", role: "TEAM_LEADER", priority: 60 },
      { name: "VACATION_APPROVAL", role: "TEAM_LEADER", priority: 50 },
      { name: "DEPARTMENT_FIX", role: "TEAM_LEADER", priority: 10 },
      { name: "PRINTER_REPAIR", role: "FACILITIES", priority: 5 },
    ];
    this.s2s4QueueEntries = queueData.map((entry, originalIndex) => ({
      ...entry,
      originalIndex,
      container: this.createTaskCard(
        420 + originalIndex * 112,
        150,
        entry.name,
        entry.role,
        entry.priority,
      ),
    }));

    this.s2s4ProcessHighlight = this.add.image(600, 214, "office-ref-itemHighlight")
      .setDisplaySize(78, 78).setTint(0xffd66e).setAlpha(0.32).setDepth(7);
    this.s2s4ProcessMarker = this.add.image(600, 214, "office-ref-approvalDocument")
      .setDisplaySize(46, 54).setDepth(8);

    this.s2s4Leader = this.add.image(this.s2s4LeaderHome.x, this.s2s4LeaderHome.y, "office-ref-guardFront")
      .setDisplaySize(58, 82).setDepth(18);

    this.s2s4Gate = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2s4GateBody = this.addWall(840, 234, 58, 88, 0);

    this.s2s4Cctv = this.add.image(1030, 546, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s2s4ViolationLabel = this.add.text(600, 640, "POLICY_VIOLATIONS 7 · 목표 2", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "16px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.exitDoor = this.add.image(1400, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2FinalMissionObjects() {
    this.s2fRechargeNode = this.add.image(280, 78, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(280, 78, 48, 48, 0);
    this.registerHideTarget([this.s2fRechargeNode], [rechargeBody], "LOCKED");

    this.s2fAuditStation = this.add.image(300, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const auditStationBody = this.addWall(300, 338, 56, 42, 0);
    this.terminal = this.s2fAuditStation;
    this.registerHideTarget([this.s2fAuditStation], [auditStationBody], "LOCKED");

    const rowData: Array<{
      id: number;
      date: "TODAY" | "YESTERDAY";
      status: "COMPLIANT" | "VIOLATION";
      owner: string;
    }> = [
      { id: 1, date: "TODAY", status: "COMPLIANT", owner: "HR_A" },
      { id: 2, date: "TODAY", status: "COMPLIANT", owner: "STAFF_A" },
      { id: 3, date: "TODAY", status: "VIOLATION", owner: "PLAYER" },
      { id: 4, date: "TODAY", status: "COMPLIANT", owner: "OPS_A" },
      { id: 5, date: "YESTERDAY", status: "VIOLATION", owner: "OLD_GUEST" },
      { id: 6, date: "TODAY", status: "COMPLIANT", owner: "STAFF_B" },
      { id: 7, date: "TODAY", status: "COMPLIANT", owner: "OPS_B" },
    ];
    this.s2fRows = rowData.map((row, index) => ({
      ...row,
      visible: true,
      container: this.createAuditRow(500, 110 + index * 52, row),
    }));

    this.s2fGate = this.add.image(920, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2fGateBody = this.addWall(920, 234, 58, 88, 0);

    this.s2fChief = this.add.image(1120, 520, "office-ref-chiefCountif")
      .setDisplaySize(62, 88).setDepth(18);
    this.s2fChiefLabel = this.add.text(1120, 452, "CHIEF · IDLE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(19);

    this.s2fCctv = this.add.image(1040, 620, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s2fSubmitHighlight = this.add.image(720, 234, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.s2fSubmitTerminal = this.add.image(720, 234, "office-ref-saveSlot")
      .setDisplaySize(64, 74).setDepth(8);
    const submitBody = this.addWall(720, 234, 54, 64, 0);
    this.registerHideTarget([this.s2fSubmitHighlight, this.s2fSubmitTerminal], [submitBody], "LOCKED");

    this.s2fVerdictLabel = this.add.text(500, 500, "ACCESS_VERDICT = QUARANTINE · SAMPLE VIOLATION 2", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.exitDoor = this.add.image(1400, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createAuditRow(
    x: number,
    y: number,
    row: { id: number; date: "TODAY" | "YESTERDAY"; status: "COMPLIANT" | "VIOLATION"; owner: string },
  ) {
    const violation = row.status === "VIOLATION";
    const background = this.add.rectangle(0, 0, 208, 46, 0xf3f6ef, 0.96)
      .setStrokeStyle(2, violation ? 0xb06a5e : 0x6f9d86);
    const idLabel = this.add.text(-92, 0, `R${row.id}`, {
      color: "#24463d",
      fontFamily: "monospace",
      fontSize: "12px",
      fontStyle: "bold",
    }).setOrigin(0, 0.5);
    const dateLabel = this.add.text(-58, 0, row.date, {
      color: row.date === "TODAY" ? "#3f6157" : "#9b6b62",
      fontFamily: "monospace",
      fontSize: "10px",
    }).setOrigin(0, 0.5);
    const statusLabel = this.add.text(30, 0, row.status, {
      color: violation ? "#a5453a" : "#2c7a55",
      fontFamily: "monospace",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0, 0.5);
    const ownerLabel = this.add.text(96, 0, row.owner, {
      color: "#527267",
      fontFamily: "monospace",
      fontSize: "9px",
    }).setOrigin(1, 0.5);
    return this.add.container(x, y, [background, idLabel, dateLabel, statusLabel, ownerLabel]).setDepth(8);
  }

  private layoutAuditRows() {
    let slot = 0;
    for (const row of this.s2fRows) {
      if (row.visible) {
        row.container.setVisible(true);
        this.tweens.add({
          targets: row.container,
          x: 500,
          y: 110 + slot * 52,
          alpha: 1,
          duration: 420,
          ease: "Sine.InOut",
        });
        slot += 1;
      } else {
        this.tweens.add({
          targets: row.container,
          alpha: 0,
          duration: 260,
          ease: "Sine.In",
          onComplete: () => row.container.setVisible(false),
        });
      }
    }
  }

  private createSession3Sheet1MissionObjects() {
    this.s3s1IfHighlight = this.add.image(280, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s3s1IfTerminal = this.add.image(280, 442, "office-ref-terminal")
      .setDisplaySize(62, 78).setDepth(8);
    const ifTerminalBody = this.addWall(280, 442, 52, 66, 0);
    this.terminal = this.s3s1IfTerminal;
    this.registerHideTarget([this.s3s1IfHighlight, this.s3s1IfTerminal], [ifTerminalBody], "LOCKED");

    this.s3s1InstallConsole = this.add.image(600, 560, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleBody = this.addWall(600, 560, 56, 42, 0);
    this.registerHideTarget([this.s3s1InstallConsole], [consoleBody], "LOCKED");

    this.s3s1CoffeeHighlight = this.add.image(440, 560, "office-ref-itemHighlight")
      .setDisplaySize(70, 70).setTint(0xffd66e).setAlpha(0.32).setDepth(7);
    this.s3s1CoffeeButton = this.add.image(440, 560, "office-ref-scanner")
      .setDisplaySize(58, 66).setDepth(8);
    const coffeeBody = this.addWall(440, 560, 48, 54, 0);
    this.registerHideTarget([this.s3s1CoffeeHighlight, this.s3s1CoffeeButton], [coffeeBody], "LOCKED");

    // G4 condition cell and the yellow/blue IF wiring.
    this.s3s1ConditionCell = this.add.rectangle(700, 200, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.14)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(6);
    this.s3s1TriggerLine = this.add.line(0, 0, 460, 200, 700, 200, 0xe4c65c, 0.85)
      .setOrigin(0, 0).setLineWidth(3).setDepth(6);
    this.s3s1ResultLine = this.add.line(0, 0, 700, 220, 840, 234, 0x6fa8d8, 0.85)
      .setOrigin(0, 0).setLineWidth(3).setDepth(6);

    this.s3s1Employee = this.add.image(this.s3s1EmployeeHome.x, this.s3s1EmployeeHome.y, "office-ref-coworkerFront")
      .setDisplaySize(58, 80).setDepth(16);

    this.s3s1Door = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s1DoorBody = this.addWall(840, 234, 58, 88, 0);

    this.s3s1StatusLabel = this.add.text(600, 300, "IF WAITING · CURRENT RESULT=FALSE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s3s1LogHighlight = this.add.image(1120, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s3s1Log = this.add.image(1120, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s3s1Outbox = this.add.image(1200, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1200, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1200, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s3s1Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1400, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession3Sheet2MissionObjects() {
    // First IF area (immediate TRUE): jammed printer + install console + H5 door.
    this.s3s2Printer = this.add.image(300, 300, "office-ref-copier")
      .setDisplaySize(72, 88).setTint(0xe0b48a).setDepth(8);
    const printerBody = this.addWall(300, 300, 60, 74, 0);
    this.registerHideTarget([this.s3s2Printer], [printerBody], "LOCKED");

    this.s3s2ConsoleA = this.add.image(400, 560, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleABody = this.addWall(400, 560, 56, 42, 0);
    this.terminal = this.s3s2ConsoleA;
    this.registerHideTarget([this.s3s2ConsoleA], [consoleABody], "LOCKED");

    this.s3s2Door1 = this.add.image(680, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s2Door1Body = this.addWall(680, 234, 58, 88, 0);

    // Second IF area (delayed TRUE): charge node, console B, worker, repair button, N5 door.
    this.s3s2RechargeNode = this.add.image(800, 320, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(800, 320, 48, 48, 0);
    this.registerHideTarget([this.s3s2RechargeNode], [rechargeBody], "LOCKED");

    this.s3s2ConsoleB = this.add.image(860, 560, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleBBody = this.addWall(860, 560, 56, 42, 0);
    this.registerHideTarget([this.s3s2ConsoleB], [consoleBBody], "LOCKED");

    this.s3s2Worker = this.add.image(this.s3s2WorkerHome.x, this.s3s2WorkerHome.y, "office-ref-coworkerFront")
      .setDisplaySize(58, 80).setDepth(16);

    this.s3s2ConditionCell = this.add.rectangle(1000, 220, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.14)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(6);
    this.s3s2ResultLine = this.add.line(0, 0, 1000, 234, 1120, 234, 0x6fa8d8, 0.85)
      .setOrigin(0, 0).setLineWidth(3).setDepth(6);

    this.s3s2RepairHighlight = this.add.image(860, 700, "office-ref-itemHighlight")
      .setDisplaySize(70, 70).setTint(0xffd66e).setAlpha(0.32).setDepth(7);
    this.s3s2RepairButton = this.add.image(860, 700, "office-ref-scanner")
      .setDisplaySize(58, 66).setDepth(8);
    const repairBody = this.addWall(860, 700, 48, 54, 0);
    this.registerHideTarget([this.s3s2RepairHighlight, this.s3s2RepairButton], [repairBody], "LOCKED");

    this.s3s2Door2 = this.add.image(1120, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s2Door2Body = this.addWall(1120, 234, 58, 88, 0);

    this.s3s2Cctv = this.add.image(900, 470, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s3s2StatusLabel = this.add.text(560, 330, "IF#1 READY · IF#2 WAITING", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    // Submission area past N5.
    this.s3s2TemplateHighlight = this.add.image(1320, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s3s2Template = this.add.image(1320, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s3s2Outbox = this.add.image(1400, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1400, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1400, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s3s2Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1560, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1560, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession3Sheet3MissionObjects() {
    // Conveyor F4:J4 with the document and the J4 sensor, all hidden together as ROW_4.
    const conveyor = this.add.rectangle(600, this.s3s3RowY, 420, 30, 0x8a99a2, 0.55)
      .setStrokeStyle(2, 0x5f7079).setDepth(4);
    this.s3s3Sensor = this.add.rectangle(760, this.s3s3RowY, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.12)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(5);
    this.s3s3Document = this.add.image(this.s3s3CellX[0], this.s3s3RowY, "office-ref-contractDocument")
      .setDisplaySize(40, 48).setDepth(8);
    this.registerHideTarget([conveyor, this.s3s3Sensor, this.s3s3Document], [], "ROW_4");

    this.s3s3IfHighlight = this.add.image(400, 560, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s3s3IfConsole = this.add.image(400, 560, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleBody = this.addWall(400, 560, 56, 42, 0);
    this.terminal = this.s3s3IfConsole;
    this.registerHideTarget([this.s3s3IfHighlight, this.s3s3IfConsole], [consoleBody], "LOCKED");

    this.s3s3Door = this.add.image(920, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s3DoorBody = this.addWall(920, 234, 58, 88, 0);
    this.s3s3ResultLine = this.add.line(0, 0, 760, this.s3s3RowY, 920, 234, 0x6fa8d8, 0.7)
      .setOrigin(0, 0).setLineWidth(3).setDepth(6);

    this.s3s3StatusLabel = this.add.text(600, 300, "IF WAITING · DOCUMENT @ F4", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s3s3Cctv = this.add.image(1040, 560, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s3s3TemplateHighlight = this.add.image(1120, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s3s3Template = this.add.image(1120, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s3s3Outbox = this.add.image(1200, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1200, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1200, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s3s3Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1360, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1360, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession3Sheet4MissionObjects() {
    this.s3s4IfHighlight = this.add.image(680, 338, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s3s4IfConsole = this.add.image(680, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleBody = this.addWall(680, 338, 56, 42, 0);
    this.terminal = this.s3s4IfConsole;
    this.registerHideTarget([this.s3s4IfHighlight, this.s3s4IfConsole], [consoleBody], "LOCKED");

    this.s3s4MacroHighlight = this.add.image(360, 560, "office-ref-itemHighlight")
      .setDisplaySize(74, 74).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.s3s4MacroButton = this.add.image(360, 560, "office-ref-scanner")
      .setDisplaySize(60, 68).setDepth(8);
    const macroBody = this.addWall(360, 560, 50, 56, 0);
    this.registerHideTarget([this.s3s4MacroHighlight, this.s3s4MacroButton], [macroBody], "LOCKED");

    // MEETING_ROOM K2:M4 visual and four OPERATIONS seats.
    this.add.rectangle(940, 190, 280, 190, 0x71d8cb, 0.06)
      .setStrokeStyle(2, 0x5aa79c, 0.6).setDepth(3);
    this.add.text(940, 92, "MEETING_ROOM K2:M4", {
      color: "#3f7a70", fontFamily: "monospace", fontSize: "13px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(4);
    const seats = [
      { x: 872, y: 168 }, { x: 1008, y: 168 },
      { x: 872, y: 240 }, { x: 1008, y: 240 },
    ];
    const homes = [
      { x: 240, y: 250 }, { x: 240, y: 450 },
      { x: 560, y: 740 }, { x: 780, y: 760 },
    ];
    this.s3s4Workers = homes.map((home, index) => ({
      image: this.add.image(home.x, home.y, "office-ref-coworkerFront")
        .setDisplaySize(56, 78).setDepth(16),
      seat: seats[index],
    }));

    this.s3s4Leader = this.add.image(1080, 660, "office-ref-leaderBack")
      .setDisplaySize(58, 82).setDepth(16);

    this.s3s4CountLabel = this.add.text(940, 300, "COUNTIF(OPERATIONS) = 0 / 4", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s3s4StatusLabel = this.add.text(680, 430, "IF WAITING · MACRO 대기", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s3s4Door = this.add.image(1180, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s4DoorBody = this.addWall(1180, 234, 58, 88, 0);

    this.s3s4Cctvs = [
      this.add.image(900, 560, "office-ref-cctv").setDisplaySize(60, 60).setDepth(9),
      this.add.image(1300, 560, "office-ref-cctv").setDisplaySize(60, 60).setDepth(9),
    ];

    this.s3s4SignatureHighlight = this.add.image(1380, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s3s4Signature = this.add.image(1380, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s3s4Outbox = this.add.image(1400, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1400, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1400, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s3s4Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1540, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1540, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession3FinalMissionObjects() {
    this.s3finTerminalHighlight = this.add.image(760, 442, "office-ref-itemHighlight")
      .setDisplaySize(86, 86).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s3finTerminal = this.add.image(760, 442, "office-ref-serverRack")
      .setDisplaySize(70, 90).setDepth(8);
    const terminalBody = this.addWall(760, 442, 60, 78, 0);
    this.terminal = this.s3finTerminal;
    this.registerHideTarget([this.s3finTerminalHighlight, this.s3finTerminal], [terminalBody], "LOCKED");

    this.s3finMacroHighlight = this.add.image(400, 560, "office-ref-itemHighlight")
      .setDisplaySize(74, 74).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.s3finMacroButton = this.add.image(400, 560, "office-ref-scanner")
      .setDisplaySize(60, 68).setDepth(8);
    const macroBody = this.addWall(400, 560, 50, 56, 0);
    this.registerHideTarget([this.s3finMacroHighlight, this.s3finMacroButton], [macroBody], "LOCKED");

    this.s3finSwitch = this.add.image(620, 300, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const switchBody = this.addWall(620, 300, 56, 42, 0);
    this.registerHideTarget([this.s3finSwitch], [switchBody], "LOCKED");

    this.s3finRechargeNode = this.add.image(940, 442, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(940, 442, 48, 48, 0);
    this.registerHideTarget([this.s3finRechargeNode], [rechargeBody], "LOCKED");

    this.s3finLoopCell = this.add.image(1020, 300, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0xcaa7d8).setDepth(8);
    const loopBody = this.addWall(1020, 300, 56, 42, 0);
    this.registerHideTarget([this.s3finLoopCell], [loopBody], "LOCKED");

    this.s3finDirector = this.add.image(1120, 660, "office-ref-directorIferror")
      .setDisplaySize(62, 88).setDepth(16);
    this.s3finDirectorLabel = this.add.text(1120, 592, "DIRECTOR · IDLE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(19);

    this.s3finStatusLabel = this.add.text(760, 640, "", {
      backgroundColor: "#132b27",
      color: "#cfe7d2",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 12, y: 8 },
      lineSpacing: 4,
    }).setOrigin(0.5).setDepth(12);
    this.updateSession3FinalStatus();

    this.s3finGate = this.add.image(1220, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3finGateBody = this.addWall(1220, 234, 58, 88, 0);

    this.s3finCctvs = [
      this.add.image(860, 540, "office-ref-cctv").setDisplaySize(60, 60).setDepth(9),
      this.add.image(1360, 560, "office-ref-cctv").setDisplaySize(60, 60).setDepth(9),
    ];

    this.s3finSubmitHighlight = this.add.image(1360, 300, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.s3finSubmit = this.add.image(1360, 300, "office-ref-saveSlot")
      .setDisplaySize(64, 74).setDepth(8);
    const submitBody = this.addWall(1360, 300, 54, 64, 0);
    this.registerHideTarget([this.s3finSubmitHighlight, this.s3finSubmit], [submitBody], "LOCKED");

    this.exitDoor = this.add.image(1500, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1500, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private updateSession3FinalStatus() {
    if (!this.s3finStatusLabel) return;
    const auto = this.s3finAutomation ? "TRUE" : "FALSE";
    const route = this.s3finRouteReady ? "TRUE" : "FALSE";
    this.s3finStatusLabel.setText(
      `AUTOMATION_ENABLED = ${auto}\n`
      + `PENDING_TASKS = ${this.s3finPending}\n`
      + `LOOP_DEPTH = ${this.s3finLoopDepth}\n`
      + `ROUTE_READY = ${route}`,
    ).setColor(
      !this.s3finAutomation && this.s3finPending === 0 && this.s3finLoopDepth === 0
        ? "#bfe6c4"
        : "#cfe7d2",
    );
  }

  private createSession4Sheet1MissionObjects() {
    this.s4s1UndoHighlight = this.add.image(400, 338, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s4s1UndoTerminal = this.add.image(400, 338, "office-ref-terminal")
      .setDisplaySize(62, 78).setDepth(8);
    const undoBody = this.addWall(400, 338, 52, 66, 0);
    this.terminal = this.s4s1UndoTerminal;
    this.registerHideTarget([this.s4s1UndoHighlight, this.s4s1UndoTerminal], [undoBody], "LOCKED");

    this.s4s1CartHighlight = this.add.image(260, 180, "office-ref-itemHighlight")
      .setDisplaySize(78, 78).setTint(0xffd66e).setAlpha(0.36).setDepth(7);
    this.s4s1Cart = this.add.image(260, 180, "office-ref-filingCabinet")
      .setDisplaySize(64, 72).setDepth(8);
    const cartBody = this.addWall(260, 180, 54, 62, 0);
    this.registerHideTarget([this.s4s1CartHighlight, this.s4s1Cart], [cartBody], "LOCKED");

    this.s4s1Sensor = this.add.image(620, 442, "office-ref-sensorPad")
      .setDisplaySize(72, 56).setTint(0xcaa7d8).setDepth(6);
    const sensorBody = this.addWall(620, 442, 60, 44, 0);
    this.registerHideTarget([this.s4s1Sensor], [sensorBody], "LOCKED");

    this.s4s1Door = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s4s1DoorBody = this.addWall(840, 234, 58, 88, 0);

    this.s4s1StatusLabel = this.add.text(600, 300, "UNDO 잠김 · PASTE 사건 없음", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s4s1LogHighlight = this.add.image(1080, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s4s1Log = this.add.image(1080, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s4s1Outbox = this.add.image(1160, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1160, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1160, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s4s1Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1320, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession4Sheet2MissionObjects() {
    this.s4s2IfHighlight = this.add.image(420, 338, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s4s2IfConsole = this.add.image(420, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleBody = this.addWall(420, 338, 56, 42, 0);
    this.terminal = this.s4s2IfConsole;
    this.registerHideTarget([this.s4s2IfHighlight, this.s4s2IfConsole], [consoleBody], "LOCKED");

    this.s4s2BadgeSensor = this.add.image(300, 180, "office-ref-scanner")
      .setDisplaySize(60, 68).setTint(0x9ad0b4).setDepth(8);
    const badgeBody = this.addWall(300, 180, 50, 56, 0);
    this.registerHideTarget([this.s4s2BadgeSensor], [badgeBody], "LOCKED");

    this.s4s2BoxHighlight = this.add.image(260, 460, "office-ref-itemHighlight")
      .setDisplaySize(78, 78).setTint(0xffd66e).setAlpha(0.36).setDepth(7);
    this.s4s2Box = this.add.image(260, 460, "office-ref-filingCabinet")
      .setDisplaySize(64, 72).setDepth(8);
    const boxBody = this.addWall(260, 460, 54, 62, 0);
    this.registerHideTarget([this.s4s2BoxHighlight, this.s4s2Box], [boxBody], "LOCKED");

    this.s4s2DecoyCell = this.add.rectangle(560, 200, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.12)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(5);
    this.add.text(560, 200, "D4", {
      color: "#7a6a3a", fontFamily: "monospace", fontSize: "12px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);

    this.s4s2Door = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s4s2DoorBody = this.addWall(840, 234, 58, 88, 0);

    this.s4s2Auditor = this.add.image(1000, 640, "office-ref-auditorCtrl")
      .setDisplaySize(62, 88).setDepth(16);
    this.s4s2AuditLabel = this.add.text(700, 300, "AUDIT_TARGET = NONE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s4s2StatusLabel = this.add.text(420, 430, "IF 대기 · CLIPBOARD 비어 있음", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s4s2IndexHighlight = this.add.image(1080, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s4s2Index = this.add.image(1080, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s4s2Outbox = this.add.image(1160, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1160, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1160, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s4s2Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1320, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession4Sheet3MissionObjects() {
    this.s4s3CompareHighlight = this.add.image(300, 640, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s4s3CompareTerminal = this.add.image(300, 640, "office-ref-terminal")
      .setDisplaySize(62, 78).setDepth(8);
    const compareBody = this.addWall(300, 640, 52, 66, 0);
    this.terminal = this.s4s3CompareTerminal;
    this.registerHideTarget([this.s4s3CompareHighlight, this.s4s3CompareTerminal], [compareBody], "LOCKED");

    this.s4s3IfHighlight = this.add.image(400, 338, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s4s3IfConsole = this.add.image(400, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const ifBody = this.addWall(400, 338, 56, 42, 0);
    this.registerHideTarget([this.s4s3IfHighlight, this.s4s3IfConsole], [ifBody], "LOCKED");

    this.s4s3ReviewHighlight = this.add.image(520, 620, "office-ref-itemHighlight")
      .setDisplaySize(70, 70).setTint(0xffd66e).setAlpha(0.32).setDepth(7);
    this.s4s3ReviewButton = this.add.image(520, 620, "office-ref-scanner")
      .setDisplaySize(58, 66).setDepth(8);
    const reviewBody = this.addWall(520, 620, 48, 54, 0);
    this.registerHideTarget([this.s4s3ReviewHighlight, this.s4s3ReviewButton], [reviewBody], "LOCKED");

    // Past-position magenta ghost at K5, and the current CABINET_07 blocking H6.
    this.s4s3CabinetGhost = this.add.image(900, 234, "office-ref-filingCabinet")
      .setDisplaySize(60, 68).setTint(0xd070d0).setAlpha(0.4).setDepth(4);
    this.s4s3Cabinet = this.add.image(600, 286, "office-ref-filingCabinet")
      .setDisplaySize(62, 72).setDepth(9);
    this.s4s3CabinetBody = this.addWall(600, 286, 58, 74, 0);

    this.s4s3Auditor = this.add.image(960, 660, "office-ref-auditorCtrl")
      .setDisplaySize(62, 88).setDepth(16);
    this.s4s3AuditLabel = this.add.text(720, 340, "AUDIT_TARGET = NONE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    // Row 9 audit scanner in the second wall's gap; HIDE ROW 9 folds it away.
    this.s4s3Scanner = this.add.rectangle(1080, 442, CELL_WIDTH, CELL_HEIGHT + 8, 0xff6b6b, 0.16)
      .setStrokeStyle(2, 0xd85a5a, 0.8).setDepth(6);
    this.registerHideTarget([this.s4s3Scanner], [], "ROW_9");

    this.s4s3StatusLabel = this.add.text(400, 430, "COMPARE 대기 · IF 미설치", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s4s3LogHighlight = this.add.image(1240, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s4s3Log = this.add.image(1240, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s4s3Outbox = this.add.image(1280, 494, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1280, 494, 52, 62, 0);
    this.terminalHighlight = this.add.image(1280, 494, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s4s3Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1400, 494, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 494, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession4Sheet4MissionObjects() {
    this.s4s4Highlight = this.add.image(300, 620, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s4s4Terminal = this.add.image(300, 620, "office-ref-terminal")
      .setDisplaySize(62, 78).setDepth(8);
    const termBody = this.addWall(300, 620, 52, 66, 0);
    this.terminal = this.s4s4Terminal;
    this.registerHideTarget([this.s4s4Highlight, this.s4s4Terminal], [termBody], "LOCKED");

    this.s4s4Beam = this.add.rectangle(820, this.s4s4BeamY, 1560, 34, 0xd070d0, 0.2)
      .setStrokeStyle(2, 0xb050b0, 0.7).setDepth(11);

    this.s4s4BeamLabel = this.add.text(WORLD_WIDTH / 2, 96, "FULL ROW REVIEW · IDLE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(13);

    this.s4s4StatusLabel = this.add.text(300, 540, "SELF HIDE 잠김 · D9 연결 필요", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s4s4LogHighlight = this.add.image(1360, 200, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s4s4Log = this.add.image(1360, 200, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s4s4Outbox = this.add.image(1440, 620, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1440, 620, 52, 62, 0);
    this.terminalHighlight = this.add.image(1440, 620, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s4s4Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1520, 620, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1520, 620, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession4FinalMissionObjects() {
    this.s4finCompareAHi = this.add.image(300, 640, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0x71d8cb).setAlpha(0.36).setDepth(7);
    this.s4finCompareA = this.add.image(300, 640, "office-ref-terminal")
      .setDisplaySize(60, 76).setDepth(8);
    const compareABody = this.addWall(300, 640, 52, 64, 0);
    this.terminal = this.s4finCompareA;
    this.registerHideTarget([this.s4finCompareAHi, this.s4finCompareA], [compareABody], "LOCKED");

    this.s4finCompareBHi = this.add.image(300, 240, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0x71d8cb).setAlpha(0.36).setDepth(7);
    this.s4finCompareB = this.add.image(300, 240, "office-ref-terminal")
      .setDisplaySize(60, 76).setDepth(8);
    const compareBBody = this.addWall(300, 240, 52, 64, 0);
    this.registerHideTarget([this.s4finCompareBHi, this.s4finCompareB], [compareBBody], "LOCKED");

    // Compare table with the four recovered originals.
    this.add.rectangle(560, 440, 220, 186, 0x71d8cb, 0.06)
      .setStrokeStyle(2, 0x5aa79c, 0.6).setDepth(3);
    ["ORIGINAL_CHANGE_LOG", "REVISION_INDEX", "PREVIOUS_FLOORPLAN", "WITNESS_STATEMENT"]
      .forEach((name, index) => {
        this.add.text(560, 384 + index * 38, name, {
          color: "#3f7a70", fontFamily: "monospace", fontSize: "10px", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(4);
      });

    this.s4finForgedHi = this.add.image(700, 200, "office-ref-itemHighlight")
      .setDisplaySize(74, 74).setTint(0xd87a7a).setAlpha(0.36).setDepth(7);
    this.s4finForged = this.add.image(700, 200, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setTint(0xe0a0a0).setDepth(8);

    this.s4finSlotHi = this.add.image(820, 440, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.s4finSlot = this.add.image(820, 440, "office-ref-saveSlot")
      .setDisplaySize(60, 70).setDepth(8);
    const slotBody = this.addWall(820, 440, 50, 60, 0);
    this.registerHideTarget([this.s4finSlotHi, this.s4finSlot], [slotBody], "LOCKED");

    this.s4finIfHi = this.add.image(1000, 440, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0x71d8cb).setAlpha(0.36).setDepth(7);
    this.s4finIfConsole = this.add.image(1000, 440, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const ifBody = this.addWall(1000, 440, 56, 42, 0);
    this.registerHideTarget([this.s4finIfHi, this.s4finIfConsole], [ifBody], "LOCKED");

    this.s4finAuditor = this.add.image(1120, 660, "office-ref-auditorCtrl")
      .setDisplaySize(62, 88).setDepth(16);

    this.s4finFieldsLabel = this.add.text(760, 296, "비교 대기 · N7에 FORGED_APPROVAL PASTE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "13px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s4finVerdictLabel = this.add.text(760, 560, "REVISION_ACCEPTED = (미판정)", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s4finStatusLabel = this.add.text(300, 540, "COMPARE ×2 → PASTE → IF → UNDO → SELF HIDE", {
      backgroundColor: "#132b27",
      color: "#cfe7d2",
      fontFamily: "monospace",
      fontSize: "13px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s4finBeam = this.add.rectangle(820, this.s4finBeamY, 1560, 34, 0xd070d0, 0.2)
      .setStrokeStyle(2, 0xb050b0, 0.7).setDepth(11).setVisible(false);
    this.s4finBeamLabel = this.add.text(WORLD_WIDTH / 2, 96, "", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(13).setVisible(false);

    this.s4finOutbox = this.add.image(1400, 620, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1400, 620, 52, 62, 0);
    this.terminalHighlight = this.add.image(1400, 620, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s4finOutbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1520, 620, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1520, 620, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession5Sheet1MissionObjects() {
    this.s5s1Highlight = this.add.image(300, 600, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xd88ad8).setAlpha(0.38).setDepth(7);
    this.s5s1Terminal = this.add.image(300, 600, "office-ref-terminal")
      .setDisplaySize(62, 78).setTint(0xc9a0d0).setDepth(8);
    const termBody = this.addWall(300, 600, 52, 66, 0);
    this.terminal = this.s5s1Terminal;
    this.registerHideTarget([this.s5s1Highlight, this.s5s1Terminal], [termBody], "LOCKED");

    // Central HR search corridor: a magenta detection band.
    this.s5s1HrBand = this.add.rectangle(700, WORLD_HEIGHT / 2, 180, WORLD_HEIGHT - 120, 0xd070d0, 0.1)
      .setStrokeStyle(2, 0xb050b0, 0.5).setDepth(6);
    this.add.text(700, 120, "HR SEARCH\nAND(NAME,DEPARTMENT)", {
      align: "center", color: "#9a5aa0", fontFamily: "monospace", fontSize: "11px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);
    this.s5s1Vp = this.add.image(700, 740, "office-ref-vpDrop")
      .setDisplaySize(62, 88).setDepth(16);

    this.s5s1Door = this.add.image(960, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s5s1DoorBody = this.addWall(960, 234, 58, 88, 0);

    this.s5s1DamageLabel = this.add.text(300, 520, "손상도 0 / 100", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s5s1StatusLabel = this.add.text(700, 300, "IDENTITY 정상 · HR 검색에 노출", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s5s1LogHighlight = this.add.image(1160, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s5s1Log = this.add.image(1160, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s5s1Outbox = this.add.image(1240, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1240, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1240, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s5s1Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1320, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession5Sheet2MissionObjects() {
    this.s5s2Highlight = this.add.image(300, 620, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xd88ad8).setAlpha(0.38).setDepth(7);
    this.s5s2Terminal = this.add.image(300, 620, "office-ref-terminal")
      .setDisplaySize(62, 78).setTint(0xc9a0d0).setDepth(8);
    const termBody = this.addWall(300, 620, 52, 66, 0);
    this.terminal = this.s5s2Terminal;
    this.registerHideTarget([this.s5s2Highlight, this.s5s2Terminal], [termBody], "LOCKED");

    // H4:J6 time-stop range with the three devices.
    this.s5s2RangeRect = this.add.rectangle(680, 234, 200, 200, 0x71b0d8, 0.08)
      .setStrokeStyle(2, 0x5a90b0, 0.55).setDepth(6);
    this.add.text(680, 128, "H4:J6 DELETION RANGE", {
      color: "#4a7a90", fontFamily: "monospace", fontSize: "11px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);

    this.s5s2Arm = this.add.image(600, 168, "office-ref-emergencyRelease")
      .setDisplaySize(52, 60).setTint(0xd0a070).setDepth(8);
    this.s5s2Cctv = this.add.image(760, 300, "office-ref-cctv")
      .setDisplaySize(60, 60).setDepth(9);

    this.s5s2Shutter = this.add.image(680, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s5s2ShutterBody = this.addWall(680, 234, 58, 88, 0);

    this.s5s2DamageLabel = this.add.text(300, 520, "손상도 0 / 100", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s5s2StatusLabel = this.add.text(680, 384, "설비 가동 중 · SHUTTER 주기", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s5s2LogHighlight = this.add.image(1000, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s5s2Log = this.add.image(1000, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s5s2Outbox = this.add.image(1080, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1080, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1080, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s5s2Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1200, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1200, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession5Sheet3MissionObjects() {
    this.s5s3Highlight = this.add.image(300, 620, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xd88ad8).setAlpha(0.38).setDepth(7);
    this.s5s3Terminal = this.add.image(300, 620, "office-ref-terminal")
      .setDisplaySize(62, 78).setTint(0xc9a0d0).setDepth(8);
    const termBody = this.addWall(300, 620, 52, 66, 0);
    this.terminal = this.s5s3Terminal;
    this.registerHideTarget([this.s5s3Highlight, this.s5s3Terminal], [termBody], "LOCKED");

    this.s5s3Employee = this.add.image(300, 210, "office-ref-coworkerFront")
      .setDisplaySize(58, 80).setDepth(8);
    this.add.text(300, 150, "C3 EMPLOYEE\n(TYPE 원본)", {
      align: "center", color: "#4a7a70", fontFamily: "monospace", fontSize: "10px",
    }).setOrigin(0.5).setDepth(8);

    this.s5s3Box = this.add.image(540, 320, "office-ref-filingCabinet")
      .setDisplaySize(64, 72).setDepth(8);
    this.add.text(540, 264, "F5 ARCHIVE_BOX_07", {
      color: "#8a6a5a", fontFamily: "monospace", fontSize: "10px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    this.s5s3Door = this.add.image(760, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s5s3DoorBody = this.addWall(760, 234, 58, 88, 0);

    this.s5s3Vp = this.add.image(900, 400, "office-ref-vpDrop")
      .setDisplaySize(62, 88).setDepth(16);
    this.add.text(900, 320, "VP DROP\n삭제 검토", {
      align: "center", color: "#9a5a5a", fontFamily: "monospace", fontSize: "10px",
    }).setOrigin(0.5).setDepth(8);

    this.s5s3DamageLabel = this.add.text(300, 520, "손상도 0 / 100", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s5s3StatusLabel = this.add.text(560, 430, "F5 TYPE=ARCHIVE_BOX · 문 잠김 · VP 대상=PLAYER", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "13px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s5s3LogHighlight = this.add.image(1120, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s5s3Log = this.add.image(1120, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s5s3Outbox = this.add.image(1200, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1200, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1200, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s5s3Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1320, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession5Sheet4MissionObjects() {
    this.s5s4Highlight = this.add.image(300, 620, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xd88ad8).setAlpha(0.38).setDepth(7);
    this.s5s4Terminal = this.add.image(300, 620, "office-ref-terminal")
      .setDisplaySize(62, 78).setTint(0xc9a0d0).setDepth(8);
    const termBody = this.addWall(300, 620, 52, 66, 0);
    this.terminal = this.s5s4Terminal;
    this.registerHideTarget([this.s5s4Highlight, this.s5s4Terminal], [termBody], "LOCKED");

    // ROW_LOCK_RELAY (deletable) and a LOCKED backup server (forbidden decoy).
    this.s5s4Relay = this.add.image(460, 360, "office-ref-serverRack")
      .setDisplaySize(64, 80).setTint(0x86c0a0).setDepth(8);
    this.add.text(460, 300, "ROW_LOCK_RELAY\nDEPENDENTS J6/N5/Q7", {
      align: "center", color: "#4a7a70", fontFamily: "monospace", fontSize: "10px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);
    this.s5s4Server = this.add.image(460, 180, "office-ref-rootLock")
      .setDisplaySize(64, 78).setDepth(8);
    this.add.text(460, 128, "BACKUP_SERVER (LOCKED)", {
      color: "#9a5a5a", fontFamily: "monospace", fontSize: "10px",
    }).setOrigin(0.5).setDepth(8);

    this.s5s4Door1 = this.add.image(700, 234, "office-ref-exitLocked").setDisplaySize(72, 96).setDepth(9);
    this.s5s4Door1Body = this.addWall(700, 234, 58, 88, 0);
    this.s5s4Door2 = this.add.image(980, 234, "office-ref-exitLocked").setDisplaySize(72, 96).setDepth(9);
    this.s5s4Door2Body = this.addWall(980, 234, 58, 88, 0);
    this.s5s4Door3 = this.add.image(1240, 234, "office-ref-exitLocked").setDisplaySize(72, 96).setDepth(9);
    this.s5s4Door3Body = this.addWall(1240, 234, 58, 88, 0);

    this.s5s4DamageLabel = this.add.text(300, 520, "손상도 0 / 100", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s5s4StatusLabel = this.add.text(460, 470, "J6/N5/Q7 잠김 · RELAY 참조 유지", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "13px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s5s4LogHighlight = this.add.image(1420, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s5s4Log = this.add.image(1420, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s5s4Outbox = this.add.image(1480, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1480, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1480, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s5s4Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1560, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1560, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession5FinalMissionObjects() {
    this.s5finErrorHighlight = this.add.image(300, 640, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xd88ad8).setAlpha(0.38).setDepth(7);
    this.s5finErrorTerminal = this.add.image(300, 640, "office-ref-terminal")
      .setDisplaySize(62, 78).setTint(0xc9a0d0).setDepth(8);
    const errBody = this.addWall(300, 640, 52, 66, 0);
    this.terminal = this.s5finErrorTerminal;
    this.registerHideTarget([this.s5finErrorHighlight, this.s5finErrorTerminal], [errBody], "LOCKED");

    // VP DROP's first deletion review zone (near side).
    this.s5finReviewZone = this.add.rectangle(560, WORLD_HEIGHT / 2, 200, WORLD_HEIGHT - 160, 0xd05050, 0.08)
      .setStrokeStyle(2, 0xb04040, 0.5).setDepth(6);
    this.s5finVp = this.add.image(560, 380, "office-ref-vpDrop").setDisplaySize(62, 88).setDepth(16);
    this.add.text(560, 300, "VP DROP\n첫 삭제 심사", {
      align: "center", color: "#9a5a5a", fontFamily: "monospace", fontSize: "10px",
    }).setOrigin(0.5).setDepth(8);

    this.s5finCompareHighlight = this.add.image(860, 460, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0x71d8cb).setAlpha(0.36).setDepth(7);
    this.s5finCompareTerminal = this.add.image(860, 460, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const cmpBody = this.addWall(860, 460, 56, 42, 0);
    this.registerHideTarget([this.s5finCompareHighlight, this.s5finCompareTerminal], [cmpBody], "LOCKED");

    // Four employee-copy rows; exactly one is CANONICAL_MATCH=TRUE.
    const rowData = [
      { name: "EMP_A", canonical: false },
      { name: "EMP_B", canonical: false },
      { name: "EMP_C", canonical: true },
      { name: "EMP_D", canonical: false },
    ];
    this.s5finRows = rowData.map((row, index) => {
      const bg = this.add.rectangle(0, 0, 150, 50, 0xf3f6ef, 0.96)
        .setStrokeStyle(2, row.canonical ? 0x6f9d86 : 0x9f8a78);
      const nameLabel = this.add.text(0, -9, row.name, {
        color: "#24463d", fontFamily: "monospace", fontSize: "12px", fontStyle: "bold",
      }).setOrigin(0.5);
      const matchLabel = this.add.text(0, 11, `CANONICAL_MATCH ${row.canonical ? "TRUE" : "FALSE"}`, {
        color: row.canonical ? "#2c7a55" : "#9b7a6a", fontFamily: "monospace", fontSize: "8px",
      }).setOrigin(0.5);
      const container = this.add.container(860, 190 + index * 66, [bg, nameLabel, matchLabel]).setDepth(8);
      return { container, canonical: row.canonical };
    });

    this.s5finPointerHighlight = this.add.image(1140, 300, "office-ref-itemHighlight")
      .setDisplaySize(78, 78).setTint(0xd87a7a).setAlpha(0.34).setDepth(7);
    this.s5finPointer = this.add.image(1140, 300, "office-ref-rootLock")
      .setDisplaySize(60, 74).setDepth(8);
    this.add.text(1140, 244, "U3 TERMINATION_POINTER", {
      color: "#9a5a5a", fontFamily: "monospace", fontSize: "10px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    this.s5finDamageLabel = this.add.text(300, 540, "손상도 0 / 100", {
      backgroundColor: "#2a2320", color: "#f0c9a6", fontFamily: "monospace", fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s5finStatusLabel = this.add.text(560, 250, "VP DROP 첫 심사 · 오류 하나로 방어", {
      backgroundColor: "#2a2320", color: "#f0c9a6", fontFamily: "monospace", fontSize: "13px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s5finVerdictLabel = this.add.text(860, 494, "CANONICAL_ROW = (미확정)", {
      backgroundColor: "#2a2320", color: "#f0c9a6", fontFamily: "monospace", fontSize: "13px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s5finOutbox = this.add.image(1300, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1300, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1300, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s5finOutbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1440, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1440, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f", color: "#f7f3d4", fontFamily: "sans-serif", fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession6Sheet1MissionObjects() {
    // Moving cyan LOCAL EXCEPTION RANGE (starts over range 1).
    this.s6s1RangeRect = this.add.rectangle(370, 440, 320, 220, 0x35d0c8, 0.08)
      .setStrokeStyle(2, 0x2fb0a8, 0.7).setDepth(5);

    this.s6s1BoxHighlight = this.add.image(280, 440, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0xffd66e).setAlpha(0.36).setDepth(7);
    this.s6s1Box = this.add.image(280, 440, "office-ref-filingCabinet")
      .setDisplaySize(62, 70).setDepth(8);
    this.terminal = this.s6s1Box;
    this.add.text(280, 388, "D8 서류 상자", {
      color: "#8a6a5a", fontFamily: "monospace", fontSize: "10px",
    }).setOrigin(0.5).setDepth(8);

    this.s6s1Sensor = this.add.image(480, 440, "office-ref-sensorPad")
      .setDisplaySize(66, 52).setTint(0x7fc7a5).setDepth(8);
    this.add.text(480, 392, "F8 요청 센서", {
      color: "#4a7a70", fontFamily: "monospace", fontSize: "10px",
    }).setOrigin(0.5).setDepth(8);

    this.s6s1Gate1 = this.add.image(620, 234, "office-ref-exitLocked").setDisplaySize(72, 96).setDepth(9);
    this.s6s1Gate1Body = this.addWall(620, 234, 58, 88, 0);

    this.s6s1SortStation = this.add.image(760, 360, "office-ref-sensorPad")
      .setDisplaySize(66, 52).setTint(0x7fc7a5).setDepth(8);
    const sortStationBody = this.addWall(760, 360, 56, 42, 0);
    this.registerHideTarget([this.s6s1SortStation], [sortStationBody], "LOCKED");
    const reqData = [
      { name: "REQ_C", requestId: 2 },
      { name: "REQ_A", requestId: 3 },
      { name: "REQ_B", requestId: 1 },
    ];
    this.s6s1Rows = reqData.map((entry, index) => {
      const bg = this.add.rectangle(0, 0, 150, 46, 0xf3f6ef, 0.96).setStrokeStyle(2, 0x78968c);
      const nameLabel = this.add.text(0, -8, entry.name, {
        color: "#24463d", fontFamily: "monospace", fontSize: "11px", fontStyle: "bold",
      }).setOrigin(0.5);
      const idLabel = this.add.text(0, 10, `REQUEST_ID ${entry.requestId}`, {
        color: "#527267", fontFamily: "monospace", fontSize: "9px",
      }).setOrigin(0.5);
      const container = this.add.container(760, 470 + index * 60, [bg, nameLabel, idLabel]).setDepth(8);
      return { container, requestId: entry.requestId, originalIndex: index };
    });

    this.s6s1Gate2 = this.add.image(1000, 234, "office-ref-exitLocked").setDisplaySize(72, 96).setDepth(9);
    this.s6s1Gate2Body = this.addWall(1000, 234, 58, 88, 0);

    // Range-3 read-only wall on ROW 3; HIDE ROW 3 folds it for 5s.
    const row3Wall = this.addWall(1180, 130, 260, 32, 1);
    this.registerHideTarget([row3Wall], [row3Wall], "ROW_3");
    this.add.text(1180, 130, "ROW 3 READ-ONLY", {
      color: "#f4f7ee", fontFamily: "monospace", fontSize: "10px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(7);

    this.s6s1KeyHighlight = this.add.image(1180, 66, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0xffd66e).setAlpha(0.42).setDepth(7);
    this.s6s1Key = this.add.image(1180, 66, "office-ref-keycard").setDisplaySize(52, 40).setDepth(8);
    this.add.text(1180, 30, "Q2 SELECT_PERMISSION_KEY", {
      color: "#c9a24a", fontFamily: "monospace", fontSize: "10px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    this.s6s1StatusLabel = this.add.text(400, 300, "RANGE 1 (B7:F10) · COPY D8 → PASTE F8", {
      backgroundColor: "#2a2320", color: "#f0c9a6", fontFamily: "monospace", fontSize: "13px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.exitDoor = this.add.image(1360, 442, "office-ref-exitLocked").setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1360, 442, 58, 86, 0);
    this.terminalHighlight = this.add.image(1360, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f", color: "#f7f3d4", fontFamily: "sans-serif", fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private moveSession6Sheet1Range(phase: number) {
    if (!this.s6s1RangeRect) return;
    if (phase === 2) {
      this.s6s1RangeRect.setPosition(760, 520).setSize(280, 260);
    } else if (phase === 3) {
      this.s6s1RangeRect.setPosition(1180, 130).setSize(300, 120);
    }
  }

  private createSession6Sheet2MissionObjects() {
    // FORMULA sandbox E8:G10 (the only place formulas confirm).
    this.s6s2SandboxRect = this.add.rectangle(480, 420, 220, 220, 0x35d0c8, 0.08)
      .setStrokeStyle(2, 0x2fb0a8, 0.7).setDepth(5);
    this.add.text(480, 322, "FORMULA SANDBOX E8:G10", {
      color: "#2f8078", fontFamily: "monospace", fontSize: "11px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);
    this.s6s2Sandbox = this.add.image(480, 440, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const sandboxBody = this.addWall(480, 440, 56, 42, 0);
    this.registerHideTarget([this.s6s2Sandbox], [sandboxBody], "LOCKED");

    this.s6s2LinkHighlight = this.add.image(480, 580, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0x71d8cb).setAlpha(0.36).setDepth(7);
    this.s6s2LinkTerminal = this.add.image(480, 580, "office-ref-terminal")
      .setDisplaySize(60, 76).setDepth(8);
    const linkBody = this.addWall(480, 580, 52, 64, 0);
    this.terminal = this.s6s2LinkTerminal;
    this.registerHideTarget([this.s6s2LinkHighlight, this.s6s2LinkTerminal], [linkBody], "LOCKED");
    this.add.text(480, 630, "E9 연결 단말기", {
      color: "#4a7a70", fontFamily: "monospace", fontSize: "10px",
    }).setOrigin(0.5).setDepth(8);

    // Remote employee range J3:K5, headcount sensor J3:K3, and door N5.
    this.s6s2Sensor = this.add.rectangle(760, 208, 170, 128, 0xf2d875, 0.1)
      .setStrokeStyle(2, 0xd8b24a, 0.7).setDepth(5);
    this.add.text(760, 132, "J3:K3 인원 센서 (상위 2)", {
      color: "#9a7a3a", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);
    const empData = [
      { name: "EMP_X", priority: 3 },
      { name: "EMP_Y", priority: 1 },
      { name: "EMP_Z", priority: 2 },
    ];
    this.s6s2Rows = empData.map((entry, index) => {
      const bg = this.add.rectangle(0, 0, 150, 46, 0xf3f6ef, 0.96).setStrokeStyle(2, 0x78968c);
      const nameLabel = this.add.text(0, -8, entry.name, {
        color: "#24463d", fontFamily: "monospace", fontSize: "11px", fontStyle: "bold",
      }).setOrigin(0.5);
      const prioLabel = this.add.text(0, 10, `ACCESS_PRIORITY ${entry.priority}`, {
        color: "#527267", fontFamily: "monospace", fontSize: "8px",
      }).setOrigin(0.5);
      const container = this.add.container(760, 180 + index * 60, [bg, nameLabel, prioLabel]).setDepth(8);
      return { container, priority: entry.priority, originalIndex: index };
    });

    this.s6s2Door = this.add.image(960, 234, "office-ref-exitLocked").setDisplaySize(72, 96).setDepth(9);
    this.s6s2DoorBody = this.addWall(960, 234, 58, 88, 0);

    this.s6s2StatusLabel = this.add.text(480, 300, "샌드박스 밖 함수 불가 · E9 연결 필요", {
      backgroundColor: "#2a2320", color: "#f0c9a6", fontFamily: "monospace", fontSize: "12px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s6s2KeyHighlight = this.add.image(1140, 180, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0xffd66e).setAlpha(0.42).setDepth(7);
    this.s6s2Key = this.add.image(1140, 180, "office-ref-keycard").setDisplaySize(52, 40).setDepth(8);
    this.add.text(1140, 138, "R3 FORMULA_PERMISSION_KEY", {
      color: "#c9a24a", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    this.s6s2Outbox = this.add.image(1240, 442, "office-ref-saveSlot").setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1240, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1240, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s6s2Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1360, 442, "office-ref-exitLocked").setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1360, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f", color: "#f7f3d4", fontFamily: "sans-serif", fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession6Sheet3MissionObjects() {
    this.s6s3Gate1 = this.add.image(620, 234, "office-ref-exitLocked").setDisplaySize(72, 96).setDepth(9);
    this.s6s3Gate1Body = this.addWall(620, 234, 58, 88, 0);
    this.add.text(620, 150, "COLUMN F\nREAD-ONLY", {
      align: "center", color: "#9a5aa0", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(9);

    this.s6s3Gate2 = this.add.image(900, 234, "office-ref-exitLocked").setDisplaySize(72, 96).setDepth(9);
    this.s6s3Gate2Body = this.addWall(900, 234, 58, 88, 0);
    this.s6s3Guards = [
      this.add.image(760, 320, "office-ref-guardFront").setDisplaySize(52, 72).setDepth(8),
      this.add.image(810, 360, "office-ref-guardFront").setDisplaySize(52, 72).setDepth(8),
      this.add.image(760, 400, "office-ref-guardFront").setDisplaySize(52, 72).setDepth(8),
    ];
    this.add.text(790, 250, "H4:K5 경비 대기열", {
      color: "#7a413a", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    // Phase 3: WRITE BUFFER N5:P7 (permanent), token source M6, paste slot O6.
    this.s6s3BufferRect = this.add.rectangle(1200, 320, 200, 200, 0x35d0c8, 0.08)
      .setStrokeStyle(2, 0x2fb0a8, 0.7).setDepth(5);
    this.add.text(1200, 226, "LOCAL WRITE BUFFER N5:P7", {
      color: "#2f8078", fontFamily: "monospace", fontSize: "10px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);
    this.s6s3PasteSlot = this.add.rectangle(1200, 320, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.14)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(6);
    this.add.text(1200, 320, "O6", {
      color: "#7a6a3a", fontFamily: "monospace", fontSize: "11px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(7);

    this.s6s3TokenHighlight = this.add.image(1040, 180, "office-ref-itemHighlight")
      .setDisplaySize(74, 74).setTint(0xffd66e).setAlpha(0.36).setDepth(7);
    this.s6s3Token = this.add.image(1040, 180, "office-ref-approvalDocument").setDisplaySize(48, 56).setDepth(8);
    this.terminal = this.s6s3Token;
    this.add.text(1040, 140, "M6 WRITE_TOKEN_TEMPLATE", {
      color: "#8a6a5a", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    this.s6s3KeyHighlight = this.add.image(1360, 200, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0xffd66e).setAlpha(0.42).setDepth(7).setVisible(false);
    this.s6s3Key = this.add.image(1360, 200, "office-ref-keycard").setDisplaySize(52, 40).setDepth(8).setVisible(false);

    this.s6s3StatusLabel = this.add.text(400, 300, "DRAFT 규칙 · 버퍼 밖 결과는 3초 후 복원", {
      backgroundColor: "#2a2320", color: "#f0c9a6", fontFamily: "monospace", fontSize: "12px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);

    this.s6s3Outbox = this.add.image(1360, 442, "office-ref-saveSlot").setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1360, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1360, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s6s3Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1460, 442, "office-ref-exitLocked").setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1460, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f", color: "#f7f3d4", fontFamily: "sans-serif", fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession6Sheet4MissionObjects() {
    // ROW 8 barrier separating the local checkpoint from the save storage.
    this.add.rectangle(WORLD_WIDTH / 2, 390, WORLD_WIDTH, CELL_HEIGHT, 0x9a5aa0, 0.06).setDepth(4);
    this.s6s4Barrier = this.add.image(WORLD_WIDTH / 2, 390, "office-ref-partitionWall")
      .setDisplaySize(WORLD_WIDTH - 40, 24).setDepth(7);
    this.s6s4BarrierBody = this.addWall(WORLD_WIDTH / 2, 390, WORLD_WIDTH - 40, 26, 0);
    this.add.text(WORLD_WIDTH / 2, 360, "ROW 8 · 저장 보관소 장벽", {
      color: "#9a5aa0", fontFamily: "monospace", fontSize: "11px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    // D10 prep terminal — CALC +2 and starts the 12s LOAD_LAST_FINAL cycle.
    this.s6s4PrepHighlight = this.add.image(280, 494, "office-ref-itemHighlight")
      .setDisplaySize(86, 86).setTint(0xffd66e).setAlpha(0.4).setDepth(6);
    this.s6s4PrepTerminal = this.add.image(280, 494, "office-ref-terminal").setDisplaySize(60, 74).setDepth(8);
    const prepBody = this.addWall(280, 512, 52, 40, 0);
    this.registerHideTarget([this.s6s4PrepTerminal], [prepBody], "LOCKED");
    this.add.text(280, 448, "D10 준비 단말기\nCALC +2", {
      align: "center", color: "#5a7a70", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    // J5 signature template (COPY source, upper deck).
    this.s6s4TemplateHighlight = this.add.image(760, 210, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0xffd66e).setAlpha(0.4).setDepth(6);
    this.s6s4Template = this.add.image(760, 210, "office-ref-approvalDocument").setDisplaySize(48, 56).setDepth(8);
    this.add.text(760, 168, "J5 ROOT_SIGNATURE_TEMPLATE", {
      color: "#8a6a5a", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    // N6 local save slot (PASTE + INSTALL IF target, upper deck).
    this.s6s4SaveSlotRect = this.add.rectangle(1080, 286, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.14)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(5);
    this.s6s4SlotHighlight = this.add.image(1080, 286, "office-ref-itemHighlight")
      .setDisplaySize(88, 88).setTint(0xffd66e).setAlpha(0.32).setDepth(6);
    this.s6s4SaveSlot = this.add.image(1080, 286, "office-ref-saveSlot").setDisplaySize(58, 68).setDepth(8);
    this.add.text(1080, 238, "N6 LOCAL_SAVE_SLOT", {
      color: "#7a6a3a", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    // R3 SAVE_PERMISSION_KEY — hidden until the IF approval signs it.
    this.s6s4KeyHighlight = this.add.image(1400, 130, "office-ref-itemHighlight")
      .setDisplaySize(78, 78).setTint(0xffd66e).setAlpha(0.44).setDepth(6).setVisible(false);
    this.s6s4Key = this.add.image(1400, 130, "office-ref-keycard").setDisplaySize(52, 40).setDepth(8).setVisible(false);
    this.add.text(1400, 92, "R3 SAVE_PERMISSION_KEY", {
      color: "#8a6a5a", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    // T11 permission terminal (submit R3) + EXIT, lower deck.
    this.s6s4Outbox = this.add.image(1560, 620, "office-ref-saveSlot").setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1560, 620, 52, 62, 0);
    this.terminalHighlight = this.add.image(1560, 620, "office-ref-itemHighlight")
      .setDisplaySize(84, 84).setTint(0xffd66e).setAlpha(0.34).setDepth(6);
    this.registerHideTarget([this.terminalHighlight, this.s6s4Outbox], [outboxBody], "LOCKED");
    this.add.text(1560, 570, "T11 권한 단말기", {
      color: "#5a7a70", fontFamily: "monospace", fontSize: "9px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    this.exitDoor = this.add.image(1960, 620, "office-ref-exitLocked").setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1960, 620, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    // CEO save console flavor + LOAD warning label.
    this.add.image(WORLD_WIDTH / 2, 90, "office-ref-managerVlookup").setDisplaySize(56, 80).setDepth(8);
    this.add.text(WORLD_WIDTH / 2, 138, "CEO · LOAD_LAST_FINAL()", {
      color: "#7a413a", fontFamily: "monospace", fontSize: "10px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(8);

    this.s6s4StatusLabel = this.add.text(WORLD_WIDTH / 2, 470, "D10 준비 단말기를 활성화해 저장 주기를 시작", {
      backgroundColor: "#2a2320", color: "#f0c9a6", fontFamily: "monospace", fontSize: "12px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(12);
    this.s6s4GhostLabel = this.add.text(WORLD_WIDTH / 2, 300, "", {
      backgroundColor: "#3a2030", color: "#ffd0e4", fontFamily: "monospace", fontSize: "13px", fontStyle: "bold",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(40).setVisible(false);

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f", color: "#f7f3d4", fontFamily: "sans-serif", fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createTaskCard(
    x: number,
    y: number,
    name: string,
    role: "TEAM_LEADER" | "FACILITIES",
    priority: number,
  ) {
    const teamLeader = role === "TEAM_LEADER";
    const background = this.add.rectangle(0, 0, 104, 62, 0xf3f6ef, 0.96)
      .setStrokeStyle(2, teamLeader ? 0x6f9d86 : 0x9f7468);
    const nameLabel = this.add.text(0, -16, name, {
      color: "#24463d",
      fontFamily: "monospace",
      fontSize: name.length > 12 ? "9px" : "10px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const roleLabel = this.add.text(0, 2, role, {
      color: teamLeader ? "#527267" : "#9b6b62",
      fontFamily: "monospace",
      fontSize: "9px",
    }).setOrigin(0.5);
    const priorityLabel = this.add.text(0, 18, `PRIORITY ${priority}`, {
      color: "#3f6157",
      fontFamily: "monospace",
      fontSize: "9px",
    }).setOrigin(0.5);
    return this.add.container(x, y, [background, nameLabel, roleLabel, priorityLabel]).setDepth(8);
  }

  private createClearanceCard(x: number, y: number, name: string, clearance: number | null) {
    const background = this.add.rectangle(0, 0, 104, 50, 0xf3f6ef, 0.96)
      .setStrokeStyle(2, (clearance ?? -1) >= 2 ? 0x6f9d86 : 0x9f7468);
    const nameLabel = this.add.text(0, -9, name, {
      color: "#24463d",
      fontFamily: "monospace",
      fontSize: name.length > 11 ? "9px" : "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const clearanceLabel = this.add.text(0, 11, `CLEARANCE ${clearance ?? "-"}`, {
      color: clearance === null ? "#9b6b62" : "#527267",
      fontFamily: "monospace",
      fontSize: "9px",
    }).setOrigin(0.5);
    return this.add.container(x, y, [background, nameLabel, clearanceLabel]).setDepth(8);
  }

  private createFormulaPanel() {
    const backdrop = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 760, 300, 0x132b27, 0.96)
      .setStrokeStyle(4, 0x61d8ca);
    const title = this.add.text(700, 348, "CELL EDIT MODE · SELECT TARGET", {
      color: "#61d8ca", fontFamily: "monospace", fontSize: "24px", fontStyle: "bold",
    });
    this.formulaTitle = title;
    this.formulaLabel = this.add.text(700, 396, "fx  =HIDE(COLUMN_F)", {
      backgroundColor: "#f4f7ee", color: "#17382f", fontFamily: "monospace",
      fontSize: "28px", padding: { x: 18, y: 13 },
    });
    this.inspectionLabel = this.add.text(700, 463, "F열 · OBJECTS 2 · RESULT UNKNOWN", {
      color: "#a9c7bd", fontFamily: "monospace", fontSize: "18px",
    });
    this.executeLabel = this.add.text(700, 508, "A–Z 열 선택 · 1–18 행 입력 · ENTER 미리보기\nSPACE 편집 취소", {
      color: "#d8e6df", fontFamily: "sans-serif", fontSize: "18px", lineSpacing: 8,
    });
    this.formulaPanel = this.add.container(0, 0, [
      backdrop,
      title,
      this.formulaLabel,
      this.inspectionLabel,
      this.executeLabel,
    ])
      .setDepth(100).setVisible(false);
  }

  private createInput() {
    if (!this.input.keyboard) return;
    this.keys = this.input.keyboard.addKeys({
      up: "W", down: "S", left: "A", right: "D",
      edit: "SPACE", execute: "ENTER", interact: "E", copy: "C", paste: "V", undo: "Z",
    }) as OfficeKeys;
    this.input.keyboard.on("keydown", this.handleEditTyping, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.handleEditTyping, this);
    });
  }

  private handleEditTyping(event: KeyboardEvent) {
    if (!this.editMode) return;
    // Custom-edit sheets drive their own panels; only generic ROW/COLUMN HIDE
    // sheets (and S3S3 while HIDE-selecting) accept A-Z / digit selection.
    if (
      this.isSession2Sheet1() || this.isSession2Sheet2() || this.isSession2Sheet3()
      || this.isSession2Sheet4() || this.isSession2Final()
      || this.isSession3Sheet1() || this.isSession3Sheet2()
      || (this.isSession3Sheet3() && this.s3s3IfEditing)
      || this.isSession3Sheet4()
      || this.isSession3Final()
      || this.isSession4Sheet2()
      || (this.isSession4Sheet3() && this.s4s3IfEditing)
      || this.isSession4Final()
      || this.isSession5Sheet1()
      || this.isSession5Sheet2()
      || this.isSession5Sheet3()
      || this.isSession5Sheet4()
      || this.isSession5Final()
      || (this.isSession6Sheet1() && this.s6s1SortEditing)
      || this.isSession6Sheet2()
      || this.isSession6Sheet3()
      || this.isSession6Sheet4()
    ) return;
    const key = event.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      this.selectedEditTarget = { kind: "column", index: key.charCodeAt(0) - 65 };
      this.rowInput = "";
      this.previewArmed = false;
      this.updateEditSelection();
      return;
    }
    if (!/^\d$/.test(key)) return;

    const now = this.time.now;
    if (now - this.rowInputAt > 1000) this.rowInput = "";
    this.rowInputAt = now;
    const candidate = `${this.rowInput}${key}`.replace(/^0+/, "");
    const row = Number(candidate);
    if (row >= 1 && row <= WORLD_ROWS) {
      this.rowInput = candidate;
      this.selectedEditTarget = { kind: "row", index: row - 1 };
    } else {
      const singleRow = Number(key);
      this.rowInput = singleRow >= 1 ? key : "";
      if (singleRow >= 1) {
        this.selectedEditTarget = { kind: "row", index: singleRow - 1 };
      }
    }
    this.previewArmed = false;
    this.updateEditSelection();
  }

  private updateMovement() {
    if (!this.player || !this.keys) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    if (this.editMode || this.s4s4Hidden || this.s4finHidden) {
      this.stopWalker(this.player, "player", this.playerFacing);
      this.syncShadow(this.player, this.playerShadow);
      return;
    }

    const x = (this.keys.left.isDown ? -1 : 0) + (this.keys.right.isDown ? 1 : 0);
    const y = (this.keys.up.isDown ? -1 : 0) + (this.keys.down.isDown ? 1 : 0);
    body.setVelocity(x * PLAYER_SPEED, y * PLAYER_SPEED).velocity.normalize().scale(
      x || y ? PLAYER_SPEED : 0,
    );
    if (Math.abs(x) > Math.abs(y)) {
      this.playerFacing = x < 0 ? "left" : "right";
    } else if (y !== 0) {
      this.playerFacing = y < 0 ? "back" : "front";
    }
    if (x !== 0 || y !== 0) {
      this.player.play(`office-ref-player-walk-${this.playerFacing}`, true);
    } else {
      this.stopWalker(this.player, "player", this.playerFacing);
    }
    this.syncShadow(this.player, this.playerShadow);
    const column = String.fromCharCode(
      65 + Phaser.Math.Clamp(Math.floor(this.player.x / CELL_WIDTH), 0, WORLD_COLUMNS - 1),
    );
    const row = Phaser.Math.Clamp(
      Math.floor(this.player.y / CELL_HEIGHT) + 1,
      1,
      WORLD_ROWS,
    );
    useGameStore.getState().setPlayerPosition(`${column}${row}`);
  }

  private updateGuard(time: number, delta: number) {
    if (!this.player) return;
    this.guardDirection = this.updateGuardActor(
      this.guard,
      this.guardShadow,
      this.guardAxis,
      this.guardMinimum,
      this.guardMaximum,
      this.guardDirection,
      time,
      delta,
    );
    this.secondGuardDirection = this.updateGuardActor(
      this.secondGuard,
      this.secondGuardShadow,
      this.secondGuardAxis,
      this.secondGuardMinimum,
      this.secondGuardMaximum,
      this.secondGuardDirection,
      time,
      delta,
    );
    this.updateSheet2Cctv(time);
    this.updateSheet4Cctv(time);
    this.updateSession1FinalSecurity(time);
    this.updateSession1FinalManager(time);
    this.updateSession2Sheet2Cctv(time);
    this.updateSession2Sheet3Cctv(time);
    this.updateSession2Sheet3Filter(time);
    this.updateSession2Sheet4(time);
    this.updateSession2Final(time);
    this.updateSession3Sheet2Cctv(time);
    this.updateSession3Sheet3(time, delta);
    this.updateSession3Sheet4Cctv(time);
    this.updateSession3Final(time, delta);
    this.updateSession4Sheet2(time);
    this.updateSession4Sheet3(time);
    this.updateSession4Sheet4(time, delta);
    this.updateSession4Final(time, delta);
    this.updateSession5Sheet1(time);
    this.updateSession5Sheet2(time, delta);
    this.updateSession5Sheet3(time);
    this.updateSession5Final(time);
    this.updateSession6Sheet2(time);
    this.updateSession6Sheet3(time);
    this.updateSession6Sheet4(time);
  }

  private updateGuardActor(
    guard: Phaser.Physics.Arcade.Sprite | undefined,
    shadow: Phaser.GameObjects.Ellipse | undefined,
    axis: "horizontal" | "vertical",
    minimum: number,
    maximum: number,
    direction: 1 | -1,
    time: number,
    delta: number,
  ): 1 | -1 {
    if (
      !guard ||
      !this.player ||
      !guard.visible ||
      !(guard.body as Phaser.Physics.Arcade.Body).enable
    ) return direction;
    const coordinate = axis === "vertical" ? guard.y : guard.x;
    if (coordinate >= maximum) direction = -1;
    if (coordinate <= minimum) direction = 1;
    const patrolSpeed = this.editMode ? 14 : 70;
    const nextCoordinate = Phaser.Math.Clamp(
      coordinate + direction * patrolSpeed * (delta / 1000),
      minimum,
      maximum,
    );
    if (axis === "vertical") guard.setY(nextCoordinate);
    else guard.setX(nextCoordinate);
    (guard.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    const facing: WalkDirection = axis === "vertical"
      ? (direction > 0 ? "front" : "back")
      : (direction > 0 ? "right" : "left");
    guard.play(`office-ref-guard-walk-${facing}`, true);
    guard.anims.timeScale = this.editMode ? 0.35 : 1;
    this.syncShadow(guard, shadow);

    const along = axis === "vertical"
      ? (this.player.y - guard.y) * direction
      : (this.player.x - guard.x) * direction;
    const across = axis === "vertical"
      ? Math.abs(this.player.x - guard.x)
      : Math.abs(this.player.y - guard.y);
    if (along > -22 && along < 260 && across < 62) this.triggerAlert(time, "GUARD");
    return direction;
  }

  private updateSheet2Cctv(time: number) {
    if (!this.isSession1Sheet2() || !this.player || !this.sheet2Cctv?.visible) return;
    const inCameraLane = this.player.x > 780 && this.player.x < 1160
      && Math.abs(this.player.y - this.sheet2Cctv.y) < 70;
    if (inCameraLane) this.triggerAlert(time, "CCTV");
  }

  private updateSheet4Cctv(time: number) {
    if (!this.isSession1Sheet4() || !this.player || this.sheet4CctvDisabled) return;
    const [northCamera, eastCamera] = this.sheet4Cctvs;
    const northLane = northCamera?.visible
      && this.player.x > 920
      && this.player.x < 1260
      && Math.abs(this.player.y - northCamera.y) < 68;
    const eastLane = eastCamera?.visible
      && this.player.x > 1080
      && this.player.x < 1370
      && Math.abs(this.player.y - eastCamera.y) < 72;
    if (northLane || eastLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession1FinalSecurity(time: number) {
    if (!this.isSession1Final() || !this.player) return;
    const [reviewCamera, exitCamera] = this.finalCctvs;
    const reviewLane = reviewCamera?.visible
      && this.player.x > 820
      && this.player.x < 1020
      && Math.abs(this.player.y - reviewCamera.y) < 64;
    const exitLane = exitCamera?.visible
      && this.player.x > 1120
      && this.player.x < 1370
      && Math.abs(this.player.y - exitCamera.y) < 72;
    if (reviewLane || exitLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession1FinalManager(time: number) {
    if (!this.isSession1Final() || !this.finalManagerLabel) return;
    if (this.terminalChecked) {
      this.finalManagerLabel.setText("PASS STORED · RECOVERY DISABLED").setColor("#9be0b4");
      return;
    }
    const actions = [
      "UNHIDE(ALL)",
      "REMOVE_DUPLICATES()",
      "LOCK_RANDOM_CELL()",
      "ADD_WORK()",
    ] as const;
    const nextAction = actions[this.finalManagerActionIndex % actions.length];
    const remaining = Math.max(0, Math.ceil((this.finalManagerNextActionAt - time) / 1000));
    if (remaining !== this.finalLastManagerSecond) {
      this.finalLastManagerSecond = remaining;
      this.finalManagerLabel
        .setText(`MANAGER · ${nextAction} · ${remaining}s`)
        .setColor(remaining <= 2 ? "#ff9b88" : "#f2d875");
    }
    if (time < this.finalManagerNextActionAt) return;

    if (nextAction === "UNHIDE(ALL)") {
      this.hideUntil = 0;
      this.restoreActiveHideTargets();
    } else if (nextAction === "REMOVE_DUPLICATES()") {
      this.finalBonusPasted = false;
      this.finalBorrowedResult?.destroy();
      this.finalBorrowedResult = undefined;
      this.finalBorrowTarget?.setVisible(true).clearTint();
    } else if (nextAction === "LOCK_RANDOM_CELL()") {
      this.finalBonusLockedUntil = time + 6000;
      this.finalProjectBonus?.setTint(0xc46f6f);
      this.time.delayedCall(6000, () => this.finalProjectBonus?.clearTint());
    } else {
      this.finalWorkPenalty = 5;
      this.time.delayedCall(6000, () => {
        if (this.terminalChecked) return;
        this.finalWorkPenalty = 0;
        this.updateFinalScoreDisplay();
      });
    }

    this.finalManagerActionIndex += 1;
    this.finalManagerNextActionAt = time + 8000;
    this.finalLastManagerSecond = -1;
    this.finalManager?.setTint(0xff9b88);
    this.time.delayedCall(260, () => this.finalManager?.clearTint());
    this.updateFinalScoreDisplay();
    useGameStore.getState().setSelectedCell("K3", `=${nextAction}`);
  }

  private updateSession2Sheet2Cctv(time: number) {
    if (!this.isSession2Sheet2() || !this.player || !this.s2s2Cctv?.visible) return;
    const inCameraLane = this.player.x > 420
      && this.player.x < 700
      && Math.abs(this.player.y - this.s2s2Cctv.y) < 64;
    if (inCameraLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession2Sheet3Cctv(time: number) {
    if (!this.isSession2Sheet3() || !this.player || !this.s2s3Cctv?.visible) return;
    const inCameraLane = this.player.x > 930
      && this.player.x < 1240
      && Math.abs(this.player.y - this.s2s3Cctv.y) < 62;
    if (inCameraLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession2Sheet3Filter(time: number) {
    if (!this.isSession2Sheet3() || !this.s2s3FilterActive) return;
    if (!this.s2s3LateStaffSpawned && time >= this.s2s3LateStaffAt) {
      this.s2s3LateStaffSpawned = true;
      this.s2s3LateStaff?.setVisible(true).setAlpha(1);
      useGameStore.getState().setSelectedCell(
        "J4",
        "=FILTER.RECHECK(LATE_STAFF,CLEARANCE=1) // EXCLUDED",
      );
      this.time.delayedCall(420, () => {
        if (!this.s2s3FilterActive) return;
        this.s2s3LateStaff?.setVisible(false);
      });
    }
    if (time < this.s2s3FilterUntil) return;

    this.s2s3FilterActive = false;
    this.s2s3QueueEntries.forEach((entry) => entry.container.setVisible(true).setAlpha(1));
    this.s2s3LateStaff?.setVisible(true).setAlpha(1);
    this.s2s3Gate?.setTexture("office-ref-exitLocked");
    if (this.s2s3GateBody) {
      this.movePlayerOutside(this.s2s3GateBody);
      const gateBody = this.arcadeBody(this.s2s3GateBody);
      if (gateBody) gateBody.enable = true;
    }
    useGameStore.getState().setSelectedCell("K5", "=AUDIT_ESCORT.EXPIRED() // GATE CLOSED");
  }

  private updateSession2Sheet4(time: number) {
    if (!this.isSession2Sheet4() || !this.player) return;
    if (this.s2s4Cctv?.visible) {
      const inCameraLane = this.player.x > 930
        && this.player.x < 1240
        && Math.abs(this.player.y - this.s2s4Cctv.y) < 62;
      if (inCameraLane) this.triggerAlert(time, "CCTV");
    }
    // 20초 WRITE ACCESS 창이 끝나면 재연결이 필요하다. 적용된 편집은 유지된다.
    if (this.s2s4WriteUnlocked && !this.s2s4Sorted && time >= this.s2s4WriteUntil) {
      this.s2s4WriteUnlocked = false;
      this.s2s4DispatchHighlight?.clearTint().setTint(0xd97979);
      useGameStore.getState().setSelectedCell("E8", "=WRITE_ACCESS.EXPIRED() // 재연결 필요");
    }
  }

  private updateSession3Sheet3(time: number, delta: number) {
    if (!this.isSession3Sheet3() || !this.player) return;
    if (this.s3s3Cctv?.visible) {
      const inCameraLane = this.player.x > 960
        && this.player.x < 1160
        && Math.abs(this.player.y - this.s3s3Cctv.y) < 60;
      if (inCameraLane) this.triggerAlert(time, "CCTV");
    }

    // Conveyor advances the document 1 cell/sec, but pauses while ROW_4 is HIDDEN.
    if (
      this.s3s3ConveyorStarted
      && !this.s3s3DocAtSensor
      && this.hideUntil <= time
    ) {
      this.s3s3DocTimer += delta;
      if (this.s3s3DocTimer >= 1000 && this.s3s3DocIndex < this.s3s3CellX.length - 1) {
        this.s3s3DocTimer -= 1000;
        this.s3s3DocIndex += 1;
        this.s3s3Document?.setX(this.s3s3CellX[this.s3s3DocIndex]);
        const cellName = ["F4", "G4", "H4", "I4", "J4"][this.s3s3DocIndex];
        if (this.s3s3DocIndex >= this.s3s3CellX.length - 1) {
          this.s3s3DocAtSensor = true;
          this.openSession3Sheet3Door(time);
        } else {
          this.s3s3StatusLabel?.setText(`IF WAITING · DOCUMENT @ ${cellName}`).setColor("#f0c9a6");
        }
      }
    }

    // Timed L5 window: pass within 3s or the conveyor resets for another attempt.
    if (this.s3s3DoorOpenUntil > 0 && !this.s3s3Passed) {
      if (this.player.x > 960) {
        this.s3s3Passed = true;
        this.s3s3DoorOpenUntil = 0;
        this.terminalChecked = true;
        this.s3s3StatusLabel?.setText("L5 통과 · TRIGGER_TEMPLATE 확보").setColor("#bfe6c4");
        useGameStore.getState().updateKeeper({ terminalChecked: true });
        useGameStore.getState().setSelectedCell("L5", "=IF(DOCUMENT.IN(J4),DOOR_L5.OPEN_FOR(3)) // PASSED");
      } else if (time >= this.s3s3DoorOpenUntil) {
        this.resetSession3Sheet3Conveyor();
      }
    }
  }

  private openSession3Sheet3Door(time: number) {
    this.s3s3DoorOpenUntil = time + 3000;
    this.s3s3Door?.setTexture("office-ref-exitOpen");
    const doorBody = this.s3s3DoorBody ? this.arcadeBody(this.s3s3DoorBody) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s3s3ResultLine?.setStrokeStyle(3, 0x6fe08c, 0.95);
    this.s3s3StatusLabel?.setText("IF TRUE · L5 OPEN 3초 · 지금 통과").setColor("#cfe7d2");
    useGameStore.getState().setSelectedCell("J4", "=IF(DOCUMENT.IN(J4),DOOR_L5.OPEN_FOR(3)) // TRUE");
  }

  private resetSession3Sheet3Conveyor() {
    this.s3s3DoorOpenUntil = 0;
    this.s3s3DocAtSensor = false;
    this.s3s3DocIndex = 0;
    this.s3s3DocTimer = 0;
    this.s3s3Document?.setX(this.s3s3CellX[0]);
    this.s3s3Door?.setTexture("office-ref-exitLocked");
    const doorBody = this.s3s3DoorBody ? this.arcadeBody(this.s3s3DoorBody) : undefined;
    if (doorBody) {
      this.movePlayerOutside(this.s3s3DoorBody!);
      doorBody.enable = true;
    }
    this.s3s3ResultLine?.setStrokeStyle(3, 0x6fa8d8, 0.7);
    this.s3s3StatusLabel?.setText("첫 개방 놓침 · 문서 F4 복귀 · 재시도").setColor("#f0c9a6");
    useGameStore.getState().setSelectedCell("L5", "=DOOR_L5.CLOSED() // 재시도");
  }

  private updateSession3Final(time: number, delta: number) {
    if (!this.isSession3Final() || !this.player) return;
    for (const cctv of this.s3finCctvs) {
      if (!cctv.visible) continue;
      if (Math.abs(this.player.x - cctv.x) < 96 && Math.abs(this.player.y - cctv.y) < 56) {
        this.triggerAlert(time, "CCTV");
        break;
      }
    }

    // IF#1: while armed and ROUTE_READY, automation stays disabled (re-fires if the
    // Director reconnects it).
    if (this.s3finIf1Installed && this.s3finRouteReady && this.s3finAutomation) {
      this.s3finAutomation = false;
      this.updateSession3FinalStatus();
      useGameStore.getState().setSelectedCell("Q3", "=IF(ROUTE_READY=TRUE,AUTOMATION_ENABLED.FALSE) // FALSE");
    }

    // Existing PENDING_TASKS complete one every 2s once automation is off.
    if (!this.s3finAutomation && this.s3finPending > 0) {
      this.s3finPendingTimer += delta;
      if (this.s3finPendingTimer >= 2000) {
        this.s3finPendingTimer -= 2000;
        this.s3finPending -= 1;
        this.updateSession3FinalStatus();
        useGameStore.getState().setSelectedCell("R8", `=PENDING_TASKS // ${this.s3finPending}`);
      }
    } else {
      this.s3finPendingTimer = 0;
    }

    // IF#2: when PENDING_TASKS hits 0, reset LOOP_DEPTH to 0.
    if (this.s3finIf2Installed && this.s3finPending === 0 && this.s3finLoopDepth > 0) {
      this.s3finLoopDepth = 0;
      this.updateSession3FinalStatus();
      useGameStore.getState().setSelectedCell("R3", "=IF(PENDING_TASKS=0,LOOP_DEPTH.RESET_TO_0) // 0");
    }

    // Latch the checkpoint open the first time the shutdown condition holds.
    const allClear = !this.s3finAutomation && this.s3finPending === 0 && this.s3finLoopDepth === 0;
    if (allClear && !this.s3finGateOpened) {
      this.s3finGateOpened = true;
      this.s3finGate?.setTexture("office-ref-exitOpen");
      const gateBody = this.s3finGateBody ? this.arcadeBody(this.s3finGateBody) : undefined;
      if (gateBody) gateBody.enable = false;
      this.s3finSubmitHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell(
        "S3",
        "=AND(AUTOMATION_ENABLED=FALSE,PENDING_TASKS=0,LOOP_DEPTH=0) // TRUE",
      );
    }

    this.updateSession3FinalDirector(time);
  }

  private updateSession3FinalDirector(time: number) {
    if (!this.s3finDirectorLabel) return;
    if (this.s3finSubmitted) {
      this.s3finDirectorLabel.setText("PASS STORED · IFERROR OFF").setColor("#9be0b4");
      return;
    }
    const actions = ["RECONNECT()", "DUPLICATE_TASKS()", "LOCK_ROUTE()", "CLEAR_LINKS()"] as const;
    const nextAction = actions[this.s3finDirectorActionIndex % actions.length];
    const remaining = Math.max(0, Math.ceil((this.s3finDirectorNextAt - time) / 1000));
    if (remaining !== this.s3finDirectorLastSecond) {
      this.s3finDirectorLastSecond = remaining;
      this.s3finDirectorLabel
        .setText(`DIRECTOR · ${nextAction} · ${remaining}s`)
        .setColor(remaining <= 2 ? "#ff9b88" : "#f2d875");
    }
    if (time < this.s3finDirectorNextAt) return;

    if (nextAction === "RECONNECT()") {
      this.s3finAutomation = true; // IF#1 re-disables it next frame if installed
    } else if (nextAction === "DUPLICATE_TASKS()") {
      this.s3finPending += 2;
    } else if (nextAction === "CLEAR_LINKS()") {
      this.s3finLinked = false;
      this.s3finTerminalHighlight?.clearTint().setTint(0xd97979);
    }
    // LOCK_ROUTE() is announced tension only: ROUTE_READY's TRUE record is permanent.
    this.updateSession3FinalStatus();
    this.s3finDirectorActionIndex += 1;
    this.s3finDirectorNextAt = time + 12000;
    this.s3finDirectorLastSecond = -1;
    this.s3finDirector?.setTint(0xff9b88);
    this.time.delayedCall(260, () => this.s3finDirector?.clearTint());
    useGameStore.getState().setSelectedCell("T3", `=IFERROR.${nextAction}`);
  }

  private updateSession5Sheet2(time: number, delta: number) {
    if (!this.isSession5Sheet2() || !this.player || !this.s5s2Shutter) return;

    // Freeze expiry.
    if (this.s5s2Frozen && time >= this.s5s2FrozenUntil) {
      this.s5s2Frozen = false;
      this.s5s2FrozenLastSecond = -1;
      this.s5s2StatusLabel?.setText("설비 주기 재개 · SHUTTER 순환").setColor("#f0c9a6");
    }
    // While frozen, device time is paused (accumulate the frozen span).
    if (this.s5s2Frozen) {
      this.s5s2FrozenAccum += delta;
      const remaining = Math.max(0, Math.ceil((this.s5s2FrozenUntil - time) / 1000));
      if (remaining !== this.s5s2FrozenLastSecond) {
        this.s5s2FrozenLastSecond = remaining;
        this.s5s2StatusLabel?.setText(`#DIV/0! 정지 ${remaining}s · SHUTTER/CCTV/ARM 정지`).setColor("#9ad0d8");
      }
    }

    // Device state from effective (unfrozen) time.
    const effT = time - this.s5s2FrozenAccum;
    this.s5s2ShutterOpen = effT % 5000 < 2000; // 2s open / 3s closed
    const cctvActive = effT % 3000 < 1500;

    // Shutter visual + collider.
    this.s5s2Shutter.setTexture(this.s5s2ShutterOpen ? "office-ref-exitOpen" : "office-ref-exitLocked");
    const shutterBody = this.s5s2ShutterBody ? this.arcadeBody(this.s5s2ShutterBody) : undefined;
    if (shutterBody) {
      if (this.s5s2ShutterOpenPrev && !this.s5s2ShutterOpen && this.s5s2ShutterBody) {
        this.movePlayerOutside(this.s5s2ShutterBody);
      }
      shutterBody.enable = !this.s5s2ShutterOpen;
    }
    this.s5s2ShutterOpenPrev = this.s5s2ShutterOpen;

    // Rotating CCTV: flips facing and only detects on its active phase.
    this.s5s2Cctv?.setFlipX(effT % 3000 >= 1500);
    if (
      cctvActive
      && !this.s5s2Frozen
      && this.player.x > 620
      && this.player.x < 740
      && this.player.y > 180
      && this.player.y < 300
    ) {
      this.triggerAlert(time, "CCTV");
    }

    // Deletion arm pulse (visual only in this prototype).
    this.s5s2Arm?.setAlpha(this.s5s2Frozen ? 0.5 : (effT % 4000 < 500 ? 1 : 0.8));
  }

  private updateSession6Sheet3(time: number) {
    if (!this.isSession6Sheet3() || !this.player) return;

    // Crossing a DRAFT gate before it reverts advances the phase permanently.
    if (this.s6s3DraftKind === "hide" && this.s6s3Phase === 1 && this.player.x > 660) {
      this.s6s3Phase = 2;
      this.s6s3DraftKind = "none";
      this.s6s3DraftLastSecond = -1;
      this.s6s3StatusLabel?.setText("COLUMN F 통과 · H4:K5 경비 대기열 SORT (DRAFT 3s)").setColor("#cfe7d2");
    }
    if (this.s6s3DraftKind === "sort" && this.s6s3Phase === 2 && this.player.x > 940) {
      this.s6s3Phase = 3;
      this.s6s3DraftKind = "none";
      this.s6s3DraftLastSecond = -1;
      this.s6s3StatusLabel?.setText("경비 구간 통과 · WRITE BUFFER O6에 PASTE").setColor("#cfe7d2");
    }

    // DRAFT expiry: if not crossed, the result reverts (no CALC refund).
    if (this.s6s3DraftKind !== "none" && time >= this.s6s3DraftUntil) {
      if (this.s6s3DraftKind === "hide" && this.s6s3Phase === 1) {
        this.s6s3Gate1?.setTexture("office-ref-exitLocked");
        const g1 = this.s6s3Gate1Body ? this.arcadeBody(this.s6s3Gate1Body) : undefined;
        if (g1) { this.movePlayerOutside(this.s6s3Gate1Body!); g1.enable = true; }
        this.s6s3StatusLabel?.setText("DRAFT HIDE 복원 · COLUMN F 재시도").setColor("#f0c9a6");
      } else if (this.s6s3DraftKind === "sort" && this.s6s3Phase === 2) {
        this.s6s3Gate2?.setTexture("office-ref-exitLocked");
        const g2 = this.s6s3Gate2Body ? this.arcadeBody(this.s6s3Gate2Body) : undefined;
        if (g2) { this.movePlayerOutside(this.s6s3Gate2Body!); g2.enable = true; }
        this.s6s3Guards.forEach((g, i) => g.setPosition([760, 810, 760][i], [320, 360, 400][i]));
        this.s6s3StatusLabel?.setText("DRAFT SORT 복원 · 경비 대기열 재시도").setColor("#f0c9a6");
      }
      this.s6s3DraftKind = "none";
      this.s6s3DraftLastSecond = -1;
    }
    if (this.s6s3DraftKind !== "none") {
      const remaining = Math.max(0, ((this.s6s3DraftUntil - time) / 1000)).toFixed(1);
      const sec = Math.ceil((this.s6s3DraftUntil - time) / 1000);
      if (sec !== this.s6s3DraftLastSecond) {
        this.s6s3DraftLastSecond = sec;
        this.s6s3StatusLabel?.setText(`DRAFT ${remaining}s · 복원 전에 통과`).setColor("#c9a0d0");
      }
    }
  }

  private updateSession6Sheet4(time: number) {
    if (!this.isSession6Sheet4() || !this.player) return;
    if (!this.s6s4CycleActive) return;

    const remainingMs = this.s6s4CycleUntil - time;

    // 3s before the overwrite: ghost-blink the pending unsaved changes.
    if (remainingMs <= 3000 && !this.s6s4GhostActive) {
      this.s6s4GhostActive = true;
      this.s6s4GhostLabel?.setVisible(true);
    }
    if (this.s6s4GhostActive) {
      const blinkOn = Math.floor(time / 220) % 2 === 0;
      this.s6s4GhostLabel
        ?.setVisible(blinkOn)
        .setText(`LOAD_LAST_FINAL ${Math.max(0, remainingMs / 1000).toFixed(1)}s · 변경 초기화`);
      this.s6s4PastedDoc?.setAlpha(blinkOn ? 1 : 0.3);
      this.s6s4SaveSlotRect?.setStrokeStyle(2, blinkOn ? 0xffffff : 0xd8b24a, 0.9);
    }

    const sec = Math.ceil(remainingMs / 1000);
    if (sec !== this.s6s4CycleLastSecond) {
      this.s6s4CycleLastSecond = sec;
      if (!this.s6s4GhostActive) {
        this.s6s4StatusLabel
          ?.setText(`LOAD_LAST_FINAL 주기 ${Math.max(0, sec)}s · 서명 전 저장 승인 완료`)
          .setColor("#c9a0d0");
      }
    }

    if (remainingMs <= 0) this.performSession6Sheet4Load();
  }

  private performSession6Sheet4Load() {
    this.s6s4LoadCount += 1;
    this.s6s4CycleActive = false;
    this.s6s4CycleLastSecond = -1;
    this.s6s4GhostActive = false;
    this.s6s4GhostLabel?.setVisible(false);
    this.s6s4Prepared = false;

    // Restore ROW 8 barrier (last-saved baseline).
    if (this.s6s4RowHidden) {
      this.s6s4RowHidden = false;
      this.s6s4Barrier?.setVisible(true);
      const body = this.s6s4BarrierBody ? this.arcadeBody(this.s6s4BarrierBody) : undefined;
      if (body) body.enable = true;
    }

    // Revert COPY / PASTE / IF and the local slot visuals.
    this.s6s4TemplateCopied = false;
    this.s6s4TemplateHighlight?.clearTint().setTint(0xffd66e);
    this.s6s4Pasted = false;
    this.s6s4IfInstalled = false;
    this.s6s4PastedDoc?.destroy();
    this.s6s4PastedDoc = undefined;
    this.s6s4SaveSlotRect?.setFillStyle(0xf2d875, 0.14).setStrokeStyle(2, 0xd8b24a, 0.8);
    this.s6s4Key?.setVisible(false);
    this.s6s4KeyHighlight?.setVisible(false);
    this.s6s4KeyCarrying = false;

    // CALC and player back to the sheet-start checkpoint (B11).
    this.calc = 5;
    useGameStore.getState().updateKeeper({ calc: this.calc });
    if (this.player) {
      this.player.setPosition(this.playerStart.x, this.playerStart.y);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0);
      body.updateFromGameObject();
    }
    if (this.editMode) this.setEditMode(false);

    this.s6s4StatusLabel
      ?.setText(`LOAD_LAST_FINAL 실행 (${this.s6s4LoadCount}회) · B11 복귀 · D10 재활성화`)
      .setColor("#f0a0b0");
    useGameStore.getState().setSelectedCell("A1", "=LOAD_LAST_FINAL() // 변경 초기화");
  }

  private updateSession6Sheet2(time: number) {
    if (!this.isSession6Sheet2()) return;
    if (this.s6s2Linked && time >= this.s6s2LinkUntil) {
      this.s6s2Linked = false;
      this.s6s2LinkLastSecond = -1;
      this.s6s2LinkHighlight?.clearTint().setTint(0xd97979);
      this.s6s2StatusLabel?.setText("LINKED RANGE 만료 · E9 재연결 (설치된 IF는 유지)").setColor("#f0c9a6");
    }
    if (this.s6s2Linked) {
      const remaining = Math.max(0, Math.ceil((this.s6s2LinkUntil - time) / 1000));
      if (remaining !== this.s6s2LinkLastSecond) {
        this.s6s2LinkLastSecond = remaining;
        this.s6s2StatusLabel?.setText(`LINKED RANGE ${remaining}s · 샌드박스에서 IF/SORT`).setColor("#9ad0d8");
      }
    }
  }

  private updateSession5Final(time: number) {
    if (!this.isSession5Final() || !this.player) return;

    // Error-defense #NAME? expiry.
    if (this.s5finNameError && time >= this.s5finNameErrorUntil) {
      this.s5finNameError = false;
      this.s5finNameLastSecond = -1;
      this.player.clearTint();
    }
    if (this.s5finNameError) {
      const remaining = Math.max(0, Math.ceil((this.s5finNameErrorUntil - time) / 1000));
      if (remaining !== this.s5finNameLastSecond) {
        this.s5finNameLastSecond = remaining;
        this.s5finStatusLabel?.setText(`#NAME? 방어 ${remaining}s · 심사 제외 · 비교 구역으로`).setColor("#c9a0d0");
      }
    }

    // First review: mark passed once the player reaches the compare zone.
    if (!this.s5finFirstReviewPassed && this.player.x > 720) {
      this.s5finFirstReviewPassed = true;
      this.s5finStatusLabel?.setText("첫 심사 통과 · 비교 구역 안전 · FILTER로 정본 확정").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("N7", "=FIRST_REVIEW.PASSED()");
    }

    // VP DROP deletes the exposed player in the review zone unless an error defends.
    if (
      !this.s5finFirstReviewPassed
      && !this.s5finNameError
      && this.s5finReviewZone
      && Math.abs(this.player.x - this.s5finReviewZone.x) < this.s5finReviewZone.width / 2
    ) {
      this.triggerAlert(time, "GUARD");
      this.s5finStatusLabel?.setText("#DROP! VP 첫 심사 적중 · 오류 방어 필요").setColor("#ff9b88");
    }
  }

  private updateSession5Sheet3(time: number) {
    if (!this.isSession5Sheet3() || !this.player || !this.s5s3Door) return;

    // #VALUE! expiry: the box reverts to ARCHIVE_BOX, so the door closes and the
    // un-confirmed deletion cancels as INVALID TARGET.
    if (this.s5s3BoxEmployee && time >= this.s5s3BoxEmployeeUntil) {
      this.s5s3BoxEmployee = false;
      this.s5s3BoxLastSecond = -1;
      this.s5s3Box?.clearTint();
      this.s5s3StatusLabel?.setText("효과 종료 · 삭제 INVALID TARGET · 문 잠김").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("F5", "=TYPE.RESTORE(ARCHIVE_BOX) // DELETE INVALID TARGET");
    }
    if (this.s5s3BoxEmployee) {
      const remaining = Math.max(0, Math.ceil((this.s5s3BoxEmployeeUntil - time) / 1000));
      if (remaining !== this.s5s3BoxLastSecond) {
        this.s5s3BoxLastSecond = remaining;
        this.s5s3StatusLabel
          ?.setText(`F5 TYPE=EMPLOYEE ${remaining}s · 문 개방 · VP 대상=BOX(999)`)
          .setColor("#c9a0d0");
      }
    }

    // Headcount door: open while the box counts as the second employee.
    this.s5s3Door.setTexture(this.s5s3BoxEmployee ? "office-ref-exitOpen" : "office-ref-exitLocked");
    const doorBody = this.s5s3DoorBody ? this.arcadeBody(this.s5s3DoorBody) : undefined;
    if (doorBody) {
      if (!this.s5s3BoxEmployee && this.s5s3DoorBody) this.movePlayerOutside(this.s5s3DoorBody);
      doorBody.enable = !this.s5s3BoxEmployee;
    }

    // VP DROP targets the player unless the box decoy is active.
    if (
      !this.s5s3BoxEmployee
      && this.player.x > 780
      && this.player.x < 1000
      && this.player.y > 180
      && this.player.y < 560
    ) {
      this.triggerAlert(time, "GUARD");
      this.s5s3StatusLabel?.setText("#DROP! VP가 PLAYER 지정 · 시작 위치 복귀").setColor("#ff9b88");
    }
  }

  private updateSession5Sheet1(time: number) {
    if (!this.isSession5Sheet1() || !this.player) return;

    // #NAME? expiry restores NAME / RANK / DEPARTMENT / SECURITY_CLEARANCE.
    if (this.s5s1NameError && time >= this.s5s1NameErrorUntil) {
      this.s5s1NameError = false;
      this.s5s1NameErrorLastSecond = -1;
      this.player.clearTint();
      this.s5s1StatusLabel?.setText("IDENTITY 복원 · L5 정상 개방 가능 · HR 노출").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("D8", "=IDENTITY.RESTORED()");
    }
    if (this.s5s1NameError) {
      const remaining = Math.max(0, Math.ceil((this.s5s1NameErrorUntil - time) / 1000));
      if (remaining !== this.s5s1NameErrorLastSecond) {
        this.s5s1NameErrorLastSecond = remaining;
        this.s5s1StatusLabel
          ?.setText(`#NAME? 적용 · NAME/DEPT/CLEARANCE 공백 ${remaining}s · HR 검색 FALSE`)
          .setColor("#c9a0d0");
      }
    }

    // Central HR search: matches an intact identity and raises a VP DROP alert.
    if (
      this.s5s1HrBand
      && !this.s5s1NameError
      && Math.abs(this.player.x - this.s5s1HrBand.x) < this.s5s1HrBand.width / 2
    ) {
      this.triggerAlert(time, "GUARD");
      this.s5s1StatusLabel?.setText("#SEARCH! VP_DROP · HR AND()=TRUE · 시작 위치 복귀").setColor("#ff9b88");
    }
  }

  private updateSession4Final(time: number, delta: number) {
    if (!this.isSession4Final() || !this.player) return;

    // Self-HIDE expiry.
    if (this.s4finHidden && time >= this.s4finHideUntil) {
      this.s4finHidden = false;
      this.player.setAlpha(1);
      useGameStore.getState().updateKeeper({ hideActive: false, hideRemaining: 0 });
    }
    if (this.s4finHidden) {
      const remaining = Math.max(0, Math.ceil((this.s4finHideUntil - time) / 1000));
      useGameStore.getState().updateKeeper({ hideActive: true, hideRemaining: remaining });
    }

    // The Auditor's one-shot FULL ROW REVIEW sweeps once after the IF is undone.
    if (!this.s4finBeamActive || this.s4finBeamDone || !this.s4finBeam) return;
    const BEAM_BOTTOM = WORLD_HEIGHT - 52;
    const SPEED = 150;
    this.s4finBeamY += (SPEED * delta) / 1000;
    if (this.s4finBeamY >= BEAM_BOTTOM) {
      this.s4finBeamY = BEAM_BOTTOM;
      this.s4finBeamDone = true;
      this.s4finBeam.setVisible(false);
      this.s4finBeamLabel?.setText("FULL ROW REVIEW 종료 · V11 제출").setColor("#9be0b4");
    }
    this.s4finBeam.setY(this.s4finBeamY);

    const rowDelta = this.player.y - this.s4finBeamY;
    if (this.s4finBeamLabel && !this.s4finBeamDone) {
      if (this.s4finHidden) {
        this.s4finBeamLabel.setText("FINAL AUDIT · 대상 행 HIDDEN · 통과").setColor("#9be0b4");
      } else if (rowDelta > 0 && rowDelta < 300) {
        this.s4finBeamLabel
          .setText(`FINAL AUDIT ↓ 내 행 접근 ${Math.ceil(rowDelta / SPEED)}s · SELF HIDE(SPACE)`)
          .setColor("#ff9b88");
      } else {
        this.s4finBeamLabel.setText("FINAL FULL ROW REVIEW · 회피하라").setColor("#f2d875");
      }
    }
    if (!this.s4finHidden && !this.s4finBeamCounted && Math.abs(rowDelta) < 24) {
      this.s4finBeamCounted = true;
      const state = useGameStore.getState();
      state.updateKeeper({ alerts: state.keeperAlerts + 1 });
      state.setSelectedCell(this.cellAt(this.player.x, this.player.y), "#AUDIT! FINAL FULL_ROW_REVIEW HIT");
      this.player.setTint(0xff7777);
      this.time.delayedCall(280, () => this.player?.clearTint());
    }
  }

  private updateSession4Sheet4(time: number, delta: number) {
    if (!this.isSession4Sheet4() || !this.player || !this.s4s4Beam) return;
    const BEAM_TOP = 52;
    const BEAM_BOTTOM = WORLD_HEIGHT - 52;
    const SPEED = 150;

    // Self-HIDE expiry: the player and HANDS restore to the same cell.
    if (this.s4s4Hidden && time >= this.s4s4HideUntil) {
      this.s4s4Hidden = false;
      this.player.setAlpha(1);
      this.s4s4StatusLabel?.setText(`SELF HIDE 복원 · 같은 셀 안전 · 사용 ${this.s4s4SelfHideCount}회`).setColor("#cfe7d2");
      useGameStore.getState().updateKeeper({ hideActive: false, hideRemaining: 0 });
    }
    if (this.s4s4Hidden) {
      const remaining = Math.max(0, Math.ceil((this.s4s4HideUntil - time) / 1000));
      useGameStore.getState().updateKeeper({ hideActive: true, hideRemaining: remaining });
    }

    // Grace period before the first sweep so the player can reach D9.
    if (this.s4s4BeamPauseUntil === 0) {
      this.s4s4BeamPauseUntil = time + 3000;
      return;
    }

    // Advance the sweep.
    if (this.s4s4BeamPauseUntil > time) {
      // paused at the bottom between sweeps
    } else if (this.s4s4BeamY >= BEAM_BOTTOM) {
      this.s4s4BeamY = BEAM_TOP;
      this.s4s4CountedThisSweep = false;
    } else {
      this.s4s4BeamY += (SPEED * delta) / 1000;
      if (this.s4s4BeamY >= BEAM_BOTTOM) {
        this.s4s4BeamY = BEAM_BOTTOM;
        this.s4s4BeamPauseUntil = time + 1600;
      }
    }
    this.s4s4Beam.setY(this.s4s4BeamY);

    // Announce + judgment against the player's row.
    const rowDelta = this.player.y - this.s4s4BeamY;
    if (this.s4s4BeamLabel) {
      if (this.s4s4Hidden) {
        this.s4s4BeamLabel.setText("FULL ROW REVIEW · 대상 행 HIDDEN · 통과").setColor("#9be0b4");
      } else if (rowDelta > 0 && rowDelta < 300) {
        this.s4s4BeamLabel
          .setText(`FULL ROW REVIEW ↓ 내 행 접근 ${Math.ceil(rowDelta / SPEED)}s · SELF HIDE(SPACE)`)
          .setColor("#ff9b88");
      } else {
        this.s4s4BeamLabel.setText("FULL ROW REVIEW · 빔 순회 중").setColor("#f2d875");
      }
    }
    if (!this.s4s4Hidden && !this.s4s4CountedThisSweep && Math.abs(rowDelta) < 24) {
      this.s4s4CountedThisSweep = true;
      const state = useGameStore.getState();
      state.updateKeeper({ alerts: state.keeperAlerts + 1 });
      state.setSelectedCell(this.cellAt(this.player.x, this.player.y), "#AUDIT! FULL_ROW_REVIEW HIT (ALERT+1)");
      this.player.setTint(0xff7777);
      this.time.delayedCall(280, () => this.player?.clearTint());
    }
  }

  private updateSession4Sheet3(time: number) {
    if (!this.isSession4Sheet3() || !this.player) return;
    // Row 9 audit scanner: alerts while visible; HIDE ROW 9 folds it away.
    if (
      this.s4s3Scanner?.visible
      && this.player.x > 1040
      && this.player.x < 1120
      && Math.abs(this.player.y - 442) < 44
    ) {
      this.triggerAlert(time, "CCTV");
    }

    if (!this.s4s3AuditLabel || !this.s4s3Reviewed || this.s4s3AuditDone || this.s4s3AuditUntil <= 0) return;
    const remaining = Math.max(0, Math.ceil((this.s4s3AuditUntil - time) / 1000));
    if (remaining !== this.s4s3AuditLastSecond) {
      this.s4s3AuditLastSecond = remaining;
      this.s4s3AuditLabel
        .setText(`AUDIT_TARGET = CABINET_07 · 복구 ${remaining}s`)
        .setColor(remaining <= 2 ? "#ff9b88" : "#f2d875");
    }
    if (time < this.s4s3AuditUntil) return;

    // Auditor restores CABINET_07 to its past K5 position (external event).
    this.s4s3AuditDone = true;
    this.s4s3AuditUntil = 0;
    this.s4s3CabinetGhost?.setVisible(false);
    this.tweens.add({
      targets: this.s4s3Cabinet,
      x: 900,
      y: 234,
      duration: 1000,
      ease: "Sine.InOut",
    });
    const cabinetBody = this.s4s3CabinetBody ? this.arcadeBody(this.s4s3CabinetBody) : undefined;
    if (cabinetBody) cabinetBody.enable = false;
    this.s4s3AuditLabel.setText("AUDIT CLEAR · CABINET_07 → K5 · H6 개방").setColor("#bfe6c4");
    this.s4s3StatusLabel?.setText("H6 통로 개방 · K5 캐비닛은 CCTV 엄폐물").setColor("#bfe6c4");
    useGameStore.getState().setSelectedCell("K5", "=AUDITOR.CTRL_Z(CABINET_07) // RESTORED K5");
  }

  private updateSession4Sheet2(time: number) {
    if (!this.isSession4Sheet2() || !this.s4s2AuditLabel) return;
    if (this.s4s2AuditTarget === "none" || this.s4s2AuditUntil <= 0) return;
    const remaining = Math.max(0, Math.ceil((this.s4s2AuditUntil - time) / 1000));
    if (remaining !== this.s4s2AuditLastSecond) {
      this.s4s2AuditLastSecond = remaining;
      this.s4s2AuditLabel
        .setText(`AUDIT_TARGET = ${this.s4s2AuditTarget} · 복구 ${remaining}s`)
        .setColor(remaining <= 2 ? "#ff9b88" : "#f2d875");
    }
    if (time < this.s4s2AuditUntil) return;

    if (this.s4s2AuditTarget === "D4") {
      // The decoy is the last-changed object, so the Auditor restores it to EMPTY.
      this.s4s2DecoyBox?.destroy();
      this.s4s2DecoyBox = undefined;
      this.s4s2DecoyRestored = true;
      this.s4s2AuditTarget = "none";
      this.s4s2AuditUntil = 0;
      this.s4s2AuditLabel.setText("AUDIT CLEAR · DECOY RESTORED(EMPTY) · L5 유지").setColor("#bfe6c4");
      this.s4s2StatusLabel?.setText("미끼 복구됨 · L5 문은 열린 채 보존").setColor("#bfe6c4");
      useGameStore.getState().setSelectedCell("D4", "=AUDITOR.CTRL_Z(D4) // RESTORED EMPTY");
    } else {
      // Player missed the transfer: the door is restored. Refund the IF to allow a retry.
      this.s4s2DoorOpen = false;
      this.s4s2Door?.setTexture("office-ref-exitLocked");
      if (this.s4s2DoorBody) {
        const doorBody = this.arcadeBody(this.s4s2DoorBody);
        this.movePlayerOutside(this.s4s2DoorBody);
        if (doorBody) doorBody.enable = true;
      }
      this.s4s2IfInstalled = false;
      this.s4s2IfPreviewed = false;
      this.s4s2IfConsole?.clearTint().setTint(0x7fc7a5);
      this.calc = Math.min(7, this.calc + 3);
      this.s4s2AuditTarget = "none";
      this.s4s2AuditUntil = 0;
      this.s4s2AuditLabel.setText("AUDIT FIRED · L5 RESTORED · IF 재설치 재시도").setColor("#ff9b88");
      this.s4s2StatusLabel?.setText("L5 복구됨 · 미끼 PASTE 전에 시간 초과").setColor("#f0c9a6");
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("L5", "=AUDITOR.CTRL_Z(L5) // DOOR RESTORED");
    }
  }

  private updateSession3Sheet4Cctv(time: number) {
    if (!this.isSession3Sheet4() || !this.player) return;
    for (const cctv of this.s3s4Cctvs) {
      if (!cctv.visible) continue;
      if (
        Math.abs(this.player.x - cctv.x) < 96
        && Math.abs(this.player.y - cctv.y) < 58
      ) {
        this.triggerAlert(time, "CCTV");
        return;
      }
    }
  }

  private updateSession3Sheet2Cctv(time: number) {
    if (!this.isSession3Sheet2() || !this.player || !this.s3s2Cctv?.visible) return;
    const inCameraLane = this.player.x > 720
      && this.player.x < 1120
      && Math.abs(this.player.y - this.s3s2Cctv.y) < 60;
    if (inCameraLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession2Final(time: number) {
    if (!this.isSession2Final() || !this.player) return;
    if (this.s2fCctv?.visible) {
      const inCameraLane = this.player.x > 940
        && this.player.x < 1260
        && Math.abs(this.player.y - this.s2fCctv.y) < 62;
      if (inCameraLane) this.triggerAlert(time, "CCTV");
    }

    // FILTER 8초 창이 끝나기 전에 Q3 제출을 못하면 표본이 무너진다.
    if (
      this.s2fFiltered
      && !this.s2fSubmitted
      && this.s2fSampleUntil > 0
      && time >= this.s2fSampleUntil
    ) {
      this.revertSession2FinalAudit("FILTER_WINDOW_EXPIRED");
    }

    if (!this.s2fChiefLabel) return;
    if (this.s2fSubmitted) {
      this.s2fChiefLabel.setText("VERDICT STORED · COUNTIF OFF").setColor("#9be0b4");
      return;
    }
    const actions = ["SHOW_ALL()", "SORT_BY(ROW_ID)", "LOCK_FIELD()", "APPEND_RECHECK()"] as const;
    const nextAction = actions[this.s2fChiefActionIndex % actions.length];
    const remaining = Math.max(0, Math.ceil((this.s2fChiefNextAt - time) / 1000));
    if (remaining !== this.s2fChiefLastSecond) {
      this.s2fChiefLastSecond = remaining;
      this.s2fChiefLabel
        .setText(`CHIEF · ${nextAction} · ${remaining}s`)
        .setColor(remaining <= 2 ? "#ff9b88" : "#f2d875");
    }
    if (time < this.s2fChiefNextAt) return;

    // 감사표 복구 순환. 미제출 상태의 FILTER/SORT 작업을 되돌린다.
    if (this.s2fFiltered || this.s2fSorted) {
      this.revertSession2FinalAudit(nextAction);
    }
    this.s2fChiefActionIndex += 1;
    this.s2fChiefNextAt = time + 10000;
    this.s2fChiefLastSecond = -1;
    this.s2fChief?.setTint(0xff9b88);
    this.time.delayedCall(260, () => this.s2fChief?.clearTint());
    useGameStore.getState().setSelectedCell("N7", `=${nextAction}`);
  }

  private revertSession2FinalAudit(reason: string) {
    if (this.s2fSubmitted) return;
    let refund = 0;
    if (this.s2fFiltered) refund += 3;
    if (this.s2fSorted) refund += 2;
    if (refund > 0) {
      this.calc = Math.min(7, this.calc + refund);
      useGameStore.getState().updateKeeper({ calc: this.calc });
    }
    this.s2fFiltered = false;
    this.s2fFilterPreviewed = false;
    this.s2fSorted = false;
    this.s2fSortPreviewed = false;
    this.s2fSampleValid = false;
    this.s2fSampleUntil = 0;
    this.s2fRows.sort((left, right) => left.id - right.id);
    this.s2fRows.forEach((row) => {
      row.visible = true;
    });
    this.layoutAuditRows();
    this.s2fAuditStation?.clearTint().setTint(0x7fc7a5);
    this.s2fVerdictLabel
      ?.setText("ACCESS_VERDICT = QUARANTINE · SAMPLE VIOLATION 2")
      .setColor("#f0c9a6");
    if (this.editMode) this.setEditMode(false);
    useGameStore.getState().setSelectedCell("L2", `=RESTORE(AUDIT_ROWS) // ${reason}`);
  }

  private triggerAlert(time: number, source: "CCTV" | "GUARD") {
    if (!this.player || time - this.lastAlertAt <= 1200) return;
    this.lastAlertAt = time;
    const state = useGameStore.getState();
    state.updateKeeper({ alerts: state.keeperAlerts + 1 });
    state.setSelectedCell(
      this.cellAt(this.player.x, this.player.y),
      `#POLICY! ${source} DETECTION`,
    );
    this.player.setPosition(this.playerStart.x, this.playerStart.y);
    this.player.setTint(0xff7777);
    this.time.delayedCall(280, () => this.player?.clearTint());
  }

  private updateInteractionPrompt() {
    if (!this.player || !this.prompt || !this.terminal || !this.exitDoor) return;
    if (this.isSession1Sheet2()) {
      this.updateSession1Sheet2Prompt();
      return;
    }
    if (this.isSession1Sheet3()) {
      this.updateSession1Sheet3Prompt();
      return;
    }
    if (this.isSession1Sheet4()) {
      this.updateSession1Sheet4Prompt();
      return;
    }
    if (this.isSession1Final()) {
      this.updateSession1FinalPrompt();
      return;
    }
    if (this.isSession2Sheet1()) {
      this.updateSession2Sheet1Prompt();
      return;
    }
    if (this.isSession2Sheet2()) {
      this.updateSession2Sheet2Prompt();
      return;
    }
    if (this.isSession2Sheet3()) {
      this.updateSession2Sheet3Prompt();
      return;
    }
    if (this.isSession2Sheet4()) {
      this.updateSession2Sheet4Prompt();
      return;
    }
    if (this.isSession2Final()) {
      this.updateSession2FinalPrompt();
      return;
    }
    if (this.isSession3Sheet1()) {
      this.updateSession3Sheet1Prompt();
      return;
    }
    if (this.isSession3Sheet2()) {
      this.updateSession3Sheet2Prompt();
      return;
    }
    if (this.isSession3Sheet3()) {
      this.updateSession3Sheet3Prompt();
      return;
    }
    if (this.isSession3Sheet4()) {
      this.updateSession3Sheet4Prompt();
      return;
    }
    if (this.isSession3Final()) {
      this.updateSession3FinalPrompt();
      return;
    }
    if (this.isSession4Sheet1()) {
      this.updateSession4Sheet1Prompt();
      return;
    }
    if (this.isSession4Sheet2()) {
      this.updateSession4Sheet2Prompt();
      return;
    }
    if (this.isSession4Sheet3()) {
      this.updateSession4Sheet3Prompt();
      return;
    }
    if (this.isSession4Sheet4()) {
      this.updateSession4Sheet4Prompt();
      return;
    }
    if (this.isSession4Final()) {
      this.updateSession4FinalPrompt();
      return;
    }
    if (this.isSession5Sheet1()) {
      this.updateSession5Sheet1Prompt();
      return;
    }
    if (this.isSession5Sheet2()) {
      this.updateSession5Sheet2Prompt();
      return;
    }
    if (this.isSession5Sheet3()) {
      this.updateSession5Sheet3Prompt();
      return;
    }
    if (this.isSession5Sheet4()) {
      this.updateSession5Sheet4Prompt();
      return;
    }
    if (this.isSession5Final()) {
      this.updateSession5FinalPrompt();
      return;
    }
    if (this.isSession6Sheet1()) {
      this.updateSession6Sheet1Prompt();
      return;
    }
    if (this.isSession6Sheet2()) {
      this.updateSession6Sheet2Prompt();
      return;
    }
    if (this.isSession6Sheet3()) {
      this.updateSession6Sheet3Prompt();
      return;
    }
    if (this.isSession6Sheet4()) {
      this.updateSession6Sheet4Prompt();
      return;
    }
    const terminalDistance = Phaser.Math.Distance.BetweenPoints(this.player, this.terminal);
    const exitDistance = Phaser.Math.Distance.BetweenPoints(this.player, this.exitDoor);
    if (this.terminal.visible && terminalDistance < 105) {
      this.prompt.setText(this.terminalChecked ? "목표 확인 완료 · 출입문으로 이동" : `E · ${this.officeSheet.workbook} 확인`);
    } else if (this.exitDoor.visible && exitDistance < 115) {
      this.prompt.setText(this.exitUnlocked ? "E · 퇴근 처리 / PASS" : "출입문 잠김 · 먼저 퇴근 단말기 확인");
    } else {
      this.prompt.setText(`SPACE · 셀 편집 모드  /  ${this.officeSheet.functionName}`);
    }
  }

  private interact() {
    if (!this.player || !this.terminal || !this.exitDoor) return;
    if (this.isSession1Sheet2()) {
      this.interactSession1Sheet2();
      return;
    }
    if (this.isSession1Sheet3()) {
      this.interactSession1Sheet3();
      return;
    }
    if (this.isSession1Sheet4()) {
      this.interactSession1Sheet4();
      return;
    }
    if (this.isSession1Final()) {
      this.interactSession1Final();
      return;
    }
    if (this.isSession2Sheet1()) {
      this.interactSession2Sheet1();
      return;
    }
    if (this.isSession2Sheet2()) {
      this.interactSession2Sheet2();
      return;
    }
    if (this.isSession2Sheet3()) {
      this.interactSession2Sheet3();
      return;
    }
    if (this.isSession2Sheet4()) {
      this.interactSession2Sheet4();
      return;
    }
    if (this.isSession2Final()) {
      this.interactSession2Final();
      return;
    }
    if (this.isSession3Sheet1()) {
      this.interactSession3Sheet1();
      return;
    }
    if (this.isSession3Sheet2()) {
      this.interactSession3Sheet2();
      return;
    }
    if (this.isSession3Sheet3()) {
      this.interactSession3Sheet3();
      return;
    }
    if (this.isSession3Sheet4()) {
      this.interactSession3Sheet4();
      return;
    }
    if (this.isSession3Final()) {
      this.interactSession3Final();
      return;
    }
    if (this.isSession4Sheet1()) {
      this.interactSession4Sheet1();
      return;
    }
    if (this.isSession4Sheet2()) {
      this.interactSession4Sheet2();
      return;
    }
    if (this.isSession4Sheet3()) {
      this.interactSession4Sheet3();
      return;
    }
    if (this.isSession4Sheet4()) {
      this.interactSession4Sheet4();
      return;
    }
    if (this.isSession4Final()) {
      this.interactSession4Final();
      return;
    }
    if (this.isSession5Sheet1()) {
      this.interactSession5Sheet1();
      return;
    }
    if (this.isSession5Sheet2()) {
      this.interactSession5Sheet2();
      return;
    }
    if (this.isSession5Sheet3()) {
      this.interactSession5Sheet3();
      return;
    }
    if (this.isSession5Sheet4()) {
      this.interactSession5Sheet4();
      return;
    }
    if (this.isSession5Final()) {
      this.interactSession5Final();
      return;
    }
    if (this.isSession6Sheet1()) {
      this.interactSession6Sheet1();
      return;
    }
    if (this.isSession6Sheet2()) {
      this.interactSession6Sheet2();
      return;
    }
    if (this.isSession6Sheet3()) {
      this.interactSession6Sheet3();
      return;
    }
    if (this.isSession6Sheet4()) {
      this.interactSession6Sheet4();
      return;
    }
    if (
      this.terminal.visible &&
      Phaser.Math.Distance.BetweenPoints(this.player, this.terminal) < 105
    ) {
      this.terminalChecked = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ terminalChecked: true, exitUnlocked: true });
      useGameStore.getState().setSelectedCell(
        this.cellAt(this.terminalPosition.x, this.terminalPosition.y),
        `=OBJECTIVE.COMPLETE("${this.officeSheet.title}")`,
      );
    } else if (
      this.exitDoor.visible &&
      Phaser.Math.Distance.BetweenPoints(this.player, this.exitDoor) < 115 &&
      this.exitUnlocked
    ) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell(
        this.cellAt(this.exitPosition.x, this.exitPosition.y),
        `=SHEET.PASS(${this.officeSheet.session},${this.officeSheet.sheet})`,
      );
    }
  }

  private updateSession1Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.terminal || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (this.exitUnlocked && distanceTo(this.exitDoor) < 115) {
      this.prompt.setText("E · 제출 완료 / EXIT");
    } else if (this.contractDocument?.visible && distanceTo(this.contractDocument) < 92) {
      this.prompt.setText(
        this.usedRow6 && this.usedColumnJ
          ? "E · 계약서 회수 / HANDS"
          : "계약서 잠김 · ROW 6과 COLUMN J 복구 기록 필요",
      );
    } else if (!this.rechargeUsed && distanceTo(this.rechargeNode) < 92) {
      this.prompt.setText("E · 충전 노드 사용 / CALC +2");
    } else if (distanceTo(this.terminal) < 105) {
      this.prompt.setText(
        this.contractSubmitted
          ? "계약서 제출 완료"
          : this.carryingContract
            ? "E · 계약서를 OUTBOX에 제출"
            : "OUTBOX · 먼저 K3 계약서를 회수하세요",
      );
    } else {
      this.prompt.setText(
        this.carryingContract
          ? "계약서 운반 중 · O8 OUTBOX로 이동"
          : "ROW 6과 COLUMN J를 HIDE해 K3 계약서 회수",
      );
    }
  }

  private interactSession1Sheet2() {
    if (!this.player || !this.terminal || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (this.exitUnlocked && distanceTo(this.exitDoor) < 115) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("P8", "=SHEET.PASS(1,2)");
      return;
    }
    if (this.contractDocument?.visible && distanceTo(this.contractDocument) < 92) {
      if (!this.usedRow6 || !this.usedColumnJ) {
        useGameStore.getState().setSelectedCell(
          "K3",
          "#LOCKED! ROW_6 + COLUMN_J 기록 필요",
        );
        return;
      }
      this.carryingContract = true;
      this.contractDocument.setVisible(false);
      this.contractHighlight?.setVisible(false);
      useGameStore.getState().updateKeeper({ terminalChecked: true });
      useGameStore.getState().setSelectedCell("K3", "=HANDS(CONTRACT_DOCUMENT)");
      return;
    }
    if (!this.rechargeUsed && distanceTo(this.rechargeNode) < 92) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.rechargeHighlight?.setVisible(false);
      this.rechargeNode?.setTint(0x78958d);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("E2", "=CALC.RECHARGE(+2)");
      return;
    }
    if (this.carryingContract && distanceTo(this.terminal) < 105) {
      this.carryingContract = false;
      this.contractSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("O8", "=OUTBOX.SUBMIT(CONTRACT_DOCUMENT)");
    }
  }

  private updateSession1Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.terminal || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.sheet3TrainingTerminal) < 100) {
      this.prompt.setText(
        this.copyPasteUnlocked ? "COPY / PASTE 교육 완료" : "E · COPY / PASTE 교육 활성화",
      );
    } else if (distanceTo(this.sheet3LeaderBadge) < 320 && !this.leaderBadgeCopied) {
      this.prompt.setText(
        this.copyPasteUnlocked ? "C · H3 팀장 출입증 COPY" : "먼저 F8 교육 단말기를 활성화하세요",
      );
    } else if (distanceTo(this.sheet3PasteStation) < 105 && !this.duplicateBadgeEquipped) {
      this.prompt.setText(
        this.leaderBadgeCopied ? "V · 출입증 복제품 PASTE / 장착" : "CLIPBOARD가 비어 있습니다",
      );
    } else if (distanceTo(this.sheet3ApprovalDocument) < 96 && this.sheet3ApprovalDocument?.visible) {
      this.prompt.setText(
        this.duplicateBadgeEquipped ? "E · N3 승인 문서 회수" : "CLEARANCE 불일치",
      );
    } else if (distanceTo(this.terminal) < 96) {
      this.prompt.setText(
        this.approvalSubmitted
          ? "승인 문서 제출 완료"
          : this.approvalCarrying
            ? "E · N2 OUTBOX에 승인 문서 제출"
            : "N3 승인 문서를 먼저 회수하세요",
      );
    } else if (distanceTo(this.sheet3BadgeTray) < 105 && this.approvalSubmitted) {
      this.prompt.setText(
        this.originalBadgeRestored
          ? "원래 사원증 복구 완료"
          : "E · 복제품 반납 / 원래 사원증 장착",
      );
    } else if (distanceTo(this.exitDoor) < 125) {
      this.prompt.setText(
        !this.approvalSubmitted
          ? "EXIT 잠김 · 승인 문서를 제출하세요"
          : this.originalBadgeRestored
            ? "E · 중복 검사 통과 / EXIT"
            : "DUPLICATE 감지 · M7 반납 트레이를 사용하세요",
      );
    } else {
      this.prompt.setText(
        this.duplicateBadgeEquipped
          ? "복제 TEAM_LEADER 배지 장착 중 · K6 보안문 통과 가능"
          : "F8 교육 → H3 COPY → G8 PASTE",
      );
    }
  }

  private interactSession1Sheet3() {
    if (!this.player || !this.terminal || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.sheet3TrainingTerminal) < 100 && !this.copyPasteUnlocked) {
      this.copyPasteUnlocked = true;
      this.sheet3TrainingHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("F8", "=ENABLE(COPY,PASTE)");
      return;
    }
    if (
      distanceTo(this.sheet3ApprovalDocument) < 96 &&
      this.sheet3ApprovalDocument?.visible &&
      this.duplicateBadgeEquipped
    ) {
      this.approvalCarrying = true;
      this.sheet3ApprovalDocument.setVisible(false);
      this.sheet3ApprovalHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(APPROVAL_DOCUMENT)");
      return;
    }
    if (distanceTo(this.terminal) < 96 && this.approvalCarrying) {
      this.approvalCarrying = false;
      this.approvalSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("N2", "=OUTBOX.SUBMIT(APPROVAL_DOCUMENT)");
      return;
    }
    if (
      distanceTo(this.sheet3BadgeTray) < 105 &&
      this.approvalSubmitted &&
      !this.originalBadgeRestored
    ) {
      this.duplicateBadgeEquipped = false;
      this.originalBadgeRestored = true;
      this.sheet3BadgeTray?.setTint(0x4f8f70);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().setSelectedCell("M7", "=BADGE.RESTORE(PROBATION_ORIGINAL)");
      return;
    }
    if (distanceTo(this.exitDoor) < 125 && this.approvalSubmitted) {
      if (!this.originalBadgeRestored) {
        this.triggerAlert(this.time.now, "CCTV");
        useGameStore.getState().setSelectedCell("Q9", "#DUPLICATE! EXIT SENSOR");
        return;
      }
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q9", "=SHEET.PASS(1,3)");
    }
  }

  private updateSession1Sheet4Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (!this.sheet4PrinterDuplicated && distanceTo(this.sheet4Printer) < 105) {
      this.prompt.setText("C · G8 고장 난 프린터 COPY");
    } else if (!this.sheet4CabinetDuplicated && distanceTo(this.sheet4Cabinet) < 105) {
      this.prompt.setText("C · E7 이동식 서류함 COPY");
    } else if (
      this.sheet4Clipboard === "printer" &&
      !this.sheet4PrinterDuplicated &&
      distanceTo(this.sheet4PrinterTarget) < 115
    ) {
      this.prompt.setText("V · M8 프린터 PASTE · 시설팀 호출");
    } else if (
      this.sheet4Clipboard === "cabinet" &&
      !this.sheet4CabinetDuplicated &&
      distanceTo(this.sheet4CabinetTarget) < 270
    ) {
      this.prompt.setText("V · K4 서류함 PASTE · CCTV 시야 차단");
    } else if (distanceTo(this.sheet4EmergencyRelease) < 105 && !this.sheet4AdminDoorOpen) {
      this.prompt.setText(
        this.sheet4CabinetDuplicated
          ? "E · 비상 해제 승인 · 관리문 열기"
          : "비상 해제 잠김 · K4에 서류함 배치 필요",
      );
    } else if (distanceTo(this.sheet4Colleague) < 105) {
      this.prompt.setText(
        this.sheet4ColleagueRescued
          ? "O3 동료 업무 복구 완료"
          : "E · O3 멈춘 인쇄 작업 복구",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(
        this.sheet4ColleagueRescued
          ? "E · Q10 업무 종료 / EXIT"
          : "EXIT 잠김 · O3 동료 작업을 먼저 복구",
      );
    } else if (!this.sheet4AdminDoorOpen) {
      this.prompt.setText("COLUMN N HIDE 또는 C COPY → V PASTE로 관리문 우회");
    } else {
      this.prompt.setText("관리문 개방 · O3 동료에게 이동");
    }
  }

  private interactSession1Sheet4() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (
      distanceTo(this.sheet4EmergencyRelease) < 105 &&
      this.sheet4CabinetDuplicated &&
      !this.sheet4AdminDoorOpen
    ) {
      this.openSheet4AdminDoor("EMERGENCY_RELEASE");
      return;
    }
    if (distanceTo(this.sheet4Colleague) < 105 && !this.sheet4ColleagueRescued) {
      this.sheet4ColleagueRescued = true;
      this.terminalChecked = true;
      this.exitUnlocked = true;
      this.sheet4Colleague?.setTint(0x93d6ac);
      this.sheet4ColleagueHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ terminalChecked: true, exitUnlocked: true });
      useGameStore.getState().setSelectedCell("O3", "=TASK.RECOVER(PRINT_QUEUE)");
      return;
    }
    if (
      distanceTo(this.exitDoor) < 120 &&
      this.sheet4ColleagueRescued
    ) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q10", "=SHEET.PASS(1,4)");
    }
  }

  private updateSession1FinalPrompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const score = this.currentFinalScore();
    if (distanceTo(this.finalProjectBonus) < 110 && !this.finalBonusCopied) {
      this.prompt.setText(
        this.time.now < this.finalBonusLockedUntil
          ? "F3 PROJECT BONUS · MANAGER LOCKED"
          : "C · F3 PROJECT BONUS +18 COPY",
      );
    } else if (distanceTo(this.finalBorrowTarget) < 115 && !this.finalBonusPasted) {
      this.prompt.setText(
        this.finalBonusCopied
          ? "V · O6 BORROWED RESULT에 +18 PASTE"
          : "BORROWED RESULT 0 · F3 보너스를 먼저 COPY",
      );
    } else if (distanceTo(this.finalRechargeNode) < 100 && !this.finalRechargeUsed) {
      this.prompt.setText("E · E8 CALC 충전 +2 · RECALC 기록 발생");
    } else if (distanceTo(this.finalSubmitTerminal) < 115) {
      this.prompt.setText(
        this.terminalChecked
          ? "PASS 결과 저장 완료 · Q10 EXIT로 이동"
          : score >= 70
            ? `E · P3 평가 제출 · SCORE ${score} PASS`
            : `P3 제출 불가 · SCORE ${score}/70`,
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · Q10 CLOCK OUT / EXIT" : "EXIT 잠김 · 평가 PASS 필요");
    } else {
      this.prompt.setText("F3 COPY → ROW 5 HIDE → O6 PASTE → P3 SUBMIT");
    }
  }

  private interactSession1Final() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.finalRechargeNode) < 100 && !this.finalRechargeUsed) {
      this.finalRechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.finalRechargeNode?.setTint(0x78958d);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("E8", "=CALC.RECHARGE(+2) // RECALC");
      return;
    }
    if (distanceTo(this.finalSubmitTerminal) < 115 && !this.terminalChecked) {
      const score = this.currentFinalScore();
      if (score < 70) {
        this.finalSubmitTerminal?.setTint(0xff7777);
        this.time.delayedCall(260, () => this.finalSubmitTerminal?.clearTint());
        useGameStore.getState().setSelectedCell("P3", `#FAIL! SCORE ${score} < 70`);
        return;
      }
      this.terminalChecked = true;
      this.exitUnlocked = true;
      this.finalSubmitTerminal?.setTint(0x79d6a5);
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ terminalChecked: true, exitUnlocked: true });
      useGameStore.getState().setSelectedCell("P3", `=SUBMIT.EVALUATION(${score}) // PASS STORED`);
      this.updateFinalScoreDisplay();
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().completeKeeperLevel(0);
      useGameStore.getState().setSelectedCell("Q10", "=SESSION.PASS(1)");
    }
  }

  private updateSession2Sheet1Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s1TrainingTerminal) < 105) {
      this.prompt.setText(
        this.s2s1SortUnlocked ? "D7 SORT 교육 완료" : "E · D7 SORT 함수 활성화",
      );
    } else if (distanceTo(this.s2s1SortStation) < 115) {
      this.prompt.setText(
        !this.s2s1SortUnlocked
          ? "F7 잠김 · D7 교육 단말기를 먼저 확인"
          : this.s2s1QueueValid
            ? "QUEUE_VALID = TRUE · K5 확인문 개방"
            : "SPACE · F7 SORT 수식 편집",
      );
    } else if (distanceTo(this.s2s1Request) < 100 && this.s2s1Request?.visible) {
      this.prompt.setText(
        this.s2s1QueueValid ? "E · N3 부서 배정 요청서 회수" : "N3 잠김 · QUEUE_VALID 필요",
      );
    } else if (distanceTo(this.s2s1Outbox) < 110) {
      this.prompt.setText(
        this.s2s1RequestSubmitted
          ? "O8 OUTBOX 제출 완료"
          : this.s2s1RequestCarrying
            ? "E · O8 부서 배정 요청서 제출"
            : "N3 요청서를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · P8 EXIT" : "EXIT 잠김 · O8 OUTBOX 제출 필요");
    } else {
      this.prompt.setText("D7 ENABLE → F7 SORT → N3 REQUEST → O8 OUTBOX");
    }
  }

  private interactSession2Sheet1() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s1TrainingTerminal) < 105 && !this.s2s1SortUnlocked) {
      this.s2s1SortUnlocked = true;
      this.s2s1TrainingHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("D7", "=ENABLE(SORT)");
      return;
    }
    if (
      distanceTo(this.s2s1Request) < 100 &&
      this.s2s1Request?.visible &&
      this.s2s1QueueValid
    ) {
      this.s2s1RequestCarrying = true;
      this.s2s1Request.setVisible(false);
      this.s2s1RequestHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(DEPARTMENT_REQUEST)");
      return;
    }
    if (distanceTo(this.s2s1Outbox) < 110 && this.s2s1RequestCarrying) {
      this.s2s1RequestCarrying = false;
      this.s2s1RequestSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("O8", "=OUTBOX.SUBMIT(DEPARTMENT_REQUEST)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("P8", "=SHEET.PASS(2,1)");
    }
  }

  private updateSession2Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s2SortStation) < 115) {
      this.prompt.setText(
        this.s2s2QueueValid
          ? "GROUP_VALID = TRUE · J5 부서문 개방"
          : "SPACE · F3:H4 DEPARTMENT_CODE 정렬",
      );
    } else if (distanceTo(this.s2s2Request) < 100 && this.s2s2Request?.visible) {
      this.prompt.setText(
        this.s2s2QueueValid ? "E · N3 DEPARTMENT_PATCH 회수" : "N3 잠김 · HR 두 명을 F3:G3에 배치",
      );
    } else if (distanceTo(this.s2s2Outbox) < 110) {
      this.prompt.setText(
        this.s2s2RequestSubmitted
          ? "P9 OUTBOX 제출 완료"
          : this.s2s2RequestCarrying
            ? "E · P9 DEPARTMENT_PATCH 제출"
            : "N3 패치를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · Q9 EXIT" : "EXIT 잠김 · P9 OUTBOX 제출 필요");
    } else {
      this.prompt.setText("F3:H4 SORT → J5 GROUP GATE → N3 PATCH → P9 OUTBOX");
    }
  }

  private interactSession2Sheet2() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (
      distanceTo(this.s2s2Request) < 100 &&
      this.s2s2Request?.visible &&
      this.s2s2QueueValid
    ) {
      this.s2s2RequestCarrying = true;
      this.s2s2Request.setVisible(false);
      this.s2s2RequestHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(DEPARTMENT_PATCH)");
      return;
    }
    if (distanceTo(this.s2s2Outbox) < 110 && this.s2s2RequestCarrying) {
      this.s2s2RequestCarrying = false;
      this.s2s2RequestSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("P9", "=OUTBOX.SUBMIT(DEPARTMENT_PATCH)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q9", "=SHEET.PASS(2,2)");
    }
  }

  private updateSession2Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s3TrainingTerminal) < 105) {
      this.prompt.setText(this.s2s3FilterUnlocked
        ? "D8 FILTER 교육 완료"
        : "E · D8 FILTER 교육 활성화");
    } else if (distanceTo(this.s2s3RechargeNode) < 92) {
      this.prompt.setText(this.rechargeUsed ? "D2 충전 노드 사용 완료" : "E · D2 CALC +2 충전");
    } else if (distanceTo(this.s2s3FilterStation) < 115) {
      this.prompt.setText(this.s2s3FilterActive
        ? `FILTER 유지 ${Math.max(0, Math.ceil((this.s2s3FilterUntil - this.time.now) / 1000))}초`
        : this.s2s3FilterUnlocked
          ? "SPACE · F3:J6 CLEARANCE FILTER"
          : "먼저 D8 FILTER 교육을 활성화");
    } else if (distanceTo(this.s2s3Patch) < 100 && this.s2s3Patch?.visible) {
      this.prompt.setText(this.terminalChecked ? "E · O3 CLEARANCE_PATCH 회수" : "K5 검문소 FILTER 통과 필요");
    } else if (distanceTo(this.s2s3Outbox) < 110) {
      this.prompt.setText(this.s2s3PatchSubmitted
        ? "Q9 OUTBOX 제출 완료"
        : this.s2s3PatchCarrying
          ? "E · Q9 CLEARANCE_PATCH 제출"
          : "O3 패치를 먼저 회수");
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R9 EXIT" : "Q9 OUTBOX 제출 필요");
    } else {
      this.prompt.setText("D8 교육 → F3:J6 FILTER → K5 통과 → O3 PATCH → Q9 OUTBOX");
    }
  }

  private interactSession2Sheet3() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s3TrainingTerminal) < 105 && !this.s2s3FilterUnlocked) {
      this.s2s3FilterUnlocked = true;
      this.s2s3TrainingTerminal?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("D8", "=TRAINING.UNLOCK(FILTER)");
      return;
    }
    if (distanceTo(this.s2s3RechargeNode) < 92 && !this.rechargeUsed) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.s2s3RechargeNode?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("D2", "=CALC.RECHARGE(+2)");
      return;
    }
    if (
      distanceTo(this.s2s3Patch) < 100
      && this.s2s3Patch?.visible
      && this.terminalChecked
    ) {
      this.s2s3PatchCarrying = true;
      this.s2s3Patch.setVisible(false);
      this.s2s3PatchHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("O3", "=HANDS(CLEARANCE_PATCH)");
      return;
    }
    if (distanceTo(this.s2s3Outbox) < 110 && this.s2s3PatchCarrying) {
      this.s2s3PatchCarrying = false;
      this.s2s3PatchSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("Q9", "=OUTBOX.SUBMIT(CLEARANCE_PATCH)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R9", "=SHEET.PASS(2,3)");
    }
  }

  private updateSession2Sheet4Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const writeRemaining = Math.max(
      0,
      Math.ceil((this.s2s4WriteUntil - this.time.now) / 1000),
    );
    if (distanceTo(this.s2s4DispatchTerminal) < 105) {
      this.prompt.setText(
        this.s2s4Sorted
          ? "E8 HR DISPATCH 연결 완료"
          : this.s2s4WriteUnlocked
            ? `WRITE ACCESS ${writeRemaining}초 · F열 편집 가능`
            : "E · E8 HR DISPATCH 연결 (20초 쓰기 권한)",
      );
    } else if (distanceTo(this.s2s4WriteConsole) < 115) {
      this.prompt.setText(
        !this.s2s4WriteUnlocked
          ? "F열 잠김 · E8 단말기를 먼저 연결"
          : !this.s2s4Filtered
            ? "SPACE · TASK_QUEUE FILTER (ROLE=TEAM_LEADER)"
            : !this.s2s4Sorted
              ? "SPACE · TASK_QUEUE SORT (PRIORITY ASC)"
              : "QUEUE 편집 완료 · M3 팀장 처리 대기",
      );
    } else if (distanceTo(this.s2s4ProcessMarker) < 100) {
      this.prompt.setText(
        this.s2s4Processed
          ? "P3 DEPARTMENT_FIX 처리 완료 · 위반 2"
          : this.s2s4Dispatched
            ? "M3 보안팀장 P3 처리 중…"
            : this.s2s4Sorted
              ? "정렬 완료 · 팀장 배치 대기"
              : "P3 잠김 · FILTER 후 SORT 필요",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R10 EXIT" : "EXIT 잠김 · K5 검문소 개방 필요");
    } else {
      this.prompt.setText("E8 연결 → FILTER → SORT → 팀장 P3 처리 → R10");
    }
  }

  private interactSession2Sheet4() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (
      distanceTo(this.s2s4DispatchTerminal) < 105
      && !this.s2s4WriteUnlocked
      && !this.s2s4Sorted
    ) {
      this.s2s4WriteUnlocked = true;
      this.s2s4WriteUntil = this.time.now + 20000;
      this.s2s4DispatchHighlight?.clearTint().setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("E8", "=CONNECT(HR_DISPATCH) // WRITE 20s");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R10", "=SHEET.PASS(2,4)");
    }
  }

  private updateSession2FinalPrompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const windowRemaining = Math.max(
      0,
      Math.ceil((this.s2fSampleUntil - this.time.now) / 1000),
    );
    if (distanceTo(this.s2fRechargeNode) < 92) {
      this.prompt.setText(this.rechargeUsed ? "D2 충전 노드 사용 완료" : "E · D2 CALC +2 충전");
    } else if (distanceTo(this.s2fAuditStation) < 115) {
      this.prompt.setText(
        !this.s2fFiltered
          ? "SPACE · AUDIT_ROWS FILTER (DATE=TODAY)"
          : !this.s2fSorted
            ? `SPACE · AUDIT_ROWS SORT (STATUS ASC) · ${windowRemaining}초`
            : this.s2fSampleValid
              ? `표본 유효 · Q3 제출까지 ${windowRemaining}초`
              : "표본 재구성 필요 · 최소 5행 COMPLIANT",
      );
    } else if (distanceTo(this.s2fSubmitTerminal) < 110) {
      this.prompt.setText(
        this.s2fSubmitted
          ? "Q3 COMPLIANT 판정 저장 완료"
          : this.s2fSampleValid
            ? `E · Q3 감사 표본 제출 (${windowRemaining}초)`
            : "Q3 잠김 · FILTER 후 SORT로 표본 구성",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R10 EXIT" : "EXIT 잠김 · Q3 제출 필요");
    } else {
      this.prompt.setText("D2 충전 → FILTER → SORT → Q3 제출 → R10 · CHIEF 순환 주의");
    }
  }

  private interactSession2Final() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2fRechargeNode) < 92 && !this.rechargeUsed) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.s2fRechargeNode?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("D2", "=CALC.RECHARGE(+2)");
      return;
    }
    if (
      distanceTo(this.s2fSubmitTerminal) < 110
      && this.s2fSampleValid
      && !this.s2fSubmitted
    ) {
      this.s2fSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.s2fSubmitHighlight?.setTint(0x79d6a5);
      this.s2fGate?.setTexture("office-ref-exitOpen");
      const gateBody = this.s2fGateBody ? this.arcadeBody(this.s2fGateBody) : undefined;
      if (gateBody) gateBody.enable = false;
      this.exitDoor.setTexture("office-ref-exitOpen");
      this.s2fVerdictLabel
        ?.setText("ACCESS_VERDICT = COMPLIANT · SAMPLE VIOLATION 0")
        .setColor("#bfe6c4");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("Q3", "=SAVE(ACCESS_VERDICT=COMPLIANT)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R10", "=SHEET.PASS(2,5)");
    }
  }

  private updateSession3Sheet1Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s1IfTerminal) < 105) {
      this.prompt.setText(this.s3s1IfUnlocked ? "D7 IF 교육 완료" : "E · D7 IF 교육 활성화");
    } else if (distanceTo(this.s3s1InstallConsole) < 115) {
      this.prompt.setText(
        !this.s3s1IfUnlocked
          ? "H7 잠김 · D7 교육 단말기를 먼저 확인"
          : this.s3s1IfInstalled
            ? "IF 설치됨 · H7 커피 호출로 조건 발동"
            : "SPACE · H7 IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN) 설치",
      );
    } else if (distanceTo(this.s3s1CoffeeButton) < 100) {
      this.prompt.setText(
        !this.s3s1IfInstalled
          ? "H7 IF를 먼저 설치"
          : this.s3s1CoffeeCalled
            ? (this.s3s1Triggered ? "K5 문 개방 · IF CONSUMED" : "EMPLOYEE_A 이동 중…")
            : "E · 커피 호출 (COFFEE_PICKUP 생성)",
      );
    } else if (distanceTo(this.s3s1Log) < 100 && this.s3s1Log?.visible) {
      this.prompt.setText(this.s3s1Triggered ? "E · N3 AUTOMATION_LOG 회수" : "K5 문 개방 후 접근 가능");
    } else if (distanceTo(this.s3s1Outbox) < 110) {
      this.prompt.setText(
        this.s3s1LogSubmitted
          ? "O8 OUTBOX 제출 완료"
          : this.s3s1LogCarrying
            ? "E · O8 AUTOMATION_LOG 제출"
            : "N3 로그를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · P8 EXIT" : "EXIT 잠김 · O8 제출 필요");
    } else {
      this.prompt.setText("D7 교육 → H7 IF 설치 → 커피 호출 → N3 로그 → O8 제출 → P8");
    }
  }

  private interactSession3Sheet1() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s1IfTerminal) < 105 && !this.s3s1IfUnlocked) {
      this.s3s1IfUnlocked = true;
      this.s3s1IfHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("D7", "=TRAINING.UNLOCK(IF)");
      return;
    }
    if (
      distanceTo(this.s3s1CoffeeButton) < 100
      && this.s3s1IfInstalled
      && !this.s3s1CoffeeCalled
    ) {
      this.s3s1CoffeeCalled = true;
      this.s3s1CoffeeHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("H7", "=CALL(EMPLOYEE_A, COFFEE_PICKUP)");
      this.tweens.add({
        targets: this.s3s1Employee,
        x: 700,
        y: 200,
        duration: 1600,
        ease: "Sine.InOut",
        onComplete: () => this.triggerSession3Sheet1If(),
      });
      return;
    }
    if (distanceTo(this.s3s1Log) < 100 && this.s3s1Log?.visible && this.s3s1Triggered) {
      this.s3s1LogCarrying = true;
      this.s3s1Log.setVisible(false);
      this.s3s1LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(AUTOMATION_LOG)");
      return;
    }
    if (distanceTo(this.s3s1Outbox) < 110 && this.s3s1LogCarrying) {
      this.s3s1LogCarrying = false;
      this.s3s1LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("O8", "=OUTBOX.SUBMIT(AUTOMATION_LOG)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("P8", "=SHEET.PASS(3,1)");
    }
  }

  private triggerSession3Sheet1If() {
    if (this.s3s1Triggered) return;
    this.s3s1Triggered = true;
    this.terminalChecked = true;
    this.s3s1Door?.setTexture("office-ref-exitOpen");
    const doorBody = this.s3s1DoorBody ? this.arcadeBody(this.s3s1DoorBody) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s3s1ConditionCell?.setFillStyle(0x8fe0a4, 0.24).setStrokeStyle(2, 0x4fb877, 0.9);
    this.s3s1TriggerLine?.setStrokeStyle(3, 0x6fe08c, 0.95);
    this.s3s1ResultLine?.setStrokeStyle(3, 0x6fe08c, 0.95);
    this.s3s1StatusLabel?.setText("IF CONSUMED · RESULT=TRUE · K5 OPEN").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ terminalChecked: true });
    useGameStore.getState().setSelectedCell("K5", "=IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN) // TRUE");
  }

  private updateSession3Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s2ConsoleA) < 115) {
      this.prompt.setText(
        this.s3s2If1Installed
          ? "IF#1 CONSUMED · H5 개방됨"
          : "SPACE · F7 IF(PRINTER=JAMMED,H5.OPEN) 즉시 설치",
      );
    } else if (distanceTo(this.s3s2RechargeNode) < 92) {
      this.prompt.setText(this.rechargeUsed ? "I7 충전 노드 사용 완료" : "E · I7 CALC +2 충전");
    } else if (distanceTo(this.s3s2ConsoleB) < 115) {
      this.prompt.setText(
        this.s3s2If2Installed
          ? "IF#2 설치됨 · J8 수리 호출로 발동"
          : this.calc < 3
            ? "CALC 부족 · I7 충전 노드 필요"
            : "SPACE · L7 IF(FACILITIES.IN(L4),N5.OPEN) 설치",
      );
    } else if (distanceTo(this.s3s2RepairButton) < 100) {
      this.prompt.setText(
        !this.s3s2If2Installed
          ? "IF#2를 먼저 설치"
          : this.s3s2RepairCalled
            ? (this.s3s2Triggered ? "N5 개방 · IF#2 CONSUMED" : "FACILITIES_A 이동 중…")
            : "E · J8 수리 호출 (REPAIR_REQUEST)",
      );
    } else if (distanceTo(this.s3s2Template) < 100 && this.s3s2Template?.visible) {
      this.prompt.setText(this.s3s2Triggered ? "E · P3 ACTION_TEMPLATE 회수" : "N5 개방 후 접근 가능");
    } else if (distanceTo(this.s3s2Outbox) < 110) {
      this.prompt.setText(
        this.s3s2TemplateSubmitted
          ? "Q9 OUTBOX 제출 완료"
          : this.s3s2TemplateCarrying
            ? "E · Q9 ACTION_TEMPLATE 제출"
            : "P3 템플릿을 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R9 EXIT" : "EXIT 잠김 · Q9 제출 필요");
    } else {
      this.prompt.setText("IF#1 즉시 → H5 → I7 충전 → IF#2 → 수리 호출 → N5 → Q9 → R9");
    }
  }

  private interactSession3Sheet2() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s2RechargeNode) < 92 && !this.rechargeUsed) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.s3s2RechargeNode?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("I7", "=CALC.RECHARGE(+2)");
      return;
    }
    if (
      distanceTo(this.s3s2RepairButton) < 100
      && this.s3s2If2Installed
      && !this.s3s2RepairCalled
    ) {
      this.s3s2RepairCalled = true;
      this.s3s2RepairHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("J8", "=CALL(FACILITIES_A, REPAIR_REQUEST)");
      this.tweens.add({
        targets: this.s3s2Worker,
        x: 1000,
        y: 220,
        duration: 1600,
        ease: "Sine.InOut",
        onComplete: () => this.triggerSession3Sheet2If2(),
      });
      return;
    }
    if (distanceTo(this.s3s2Template) < 100 && this.s3s2Template?.visible && this.s3s2Triggered) {
      this.s3s2TemplateCarrying = true;
      this.s3s2Template.setVisible(false);
      this.s3s2TemplateHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("P3", "=HANDS(ACTION_TEMPLATE)");
      return;
    }
    if (distanceTo(this.s3s2Outbox) < 110 && this.s3s2TemplateCarrying) {
      this.s3s2TemplateCarrying = false;
      this.s3s2TemplateSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("Q9", "=OUTBOX.SUBMIT(ACTION_TEMPLATE)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R9", "=SHEET.PASS(3,2)");
    }
  }

  private triggerSession3Sheet2If2() {
    if (this.s3s2Triggered) return;
    this.s3s2Triggered = true;
    this.terminalChecked = true;
    this.s3s2Door2?.setTexture("office-ref-exitOpen");
    const doorBody = this.s3s2Door2Body ? this.arcadeBody(this.s3s2Door2Body) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s3s2ConditionCell?.setFillStyle(0x8fe0a4, 0.24).setStrokeStyle(2, 0x4fb877, 0.9);
    this.s3s2ResultLine?.setStrokeStyle(3, 0x6fe08c, 0.95);
    this.s3s2StatusLabel?.setText("IF#1 CONSUMED · IF#2 CONSUMED · N5 OPEN").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ terminalChecked: true });
    useGameStore.getState().setSelectedCell("N5", "=IF(FACILITIES_A.IN(L4),DOOR_N5.OPEN) // TRUE");
  }

  private updateSession3Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const doorRemaining = Math.max(
      0,
      Math.ceil((this.s3s3DoorOpenUntil - this.time.now) / 1000),
    );
    if (distanceTo(this.s3s3IfConsole) < 115) {
      this.prompt.setText(
        this.s3s3IfInstalled
          ? "IF 설치됨 · 컨베이어 가동 중 · SPACE로 ROW_4 HIDE"
          : "SPACE · G7 IF(DOCUMENT.IN(J4),L5.OPEN_FOR(3)) 설치",
      );
    } else if (distanceTo(this.s3s3Door) < 120) {
      this.prompt.setText(
        this.s3s3Passed
          ? "L5 통과 완료"
          : this.s3s3DoorOpenUntil > 0
            ? `L5 개방 ${doorRemaining}초 · 지금 통과`
            : "L5 닫힘 · 문서가 J4에 도달해야 개방",
      );
    } else if (distanceTo(this.s3s3Template) < 100 && this.s3s3Template?.visible) {
      this.prompt.setText(this.s3s3Passed ? "E · N3 TRIGGER_TEMPLATE 회수" : "L5 통과 후 접근 가능");
    } else if (distanceTo(this.s3s3Outbox) < 110) {
      this.prompt.setText(
        this.s3s3TemplateSubmitted
          ? "P9 OUTBOX 제출 완료"
          : this.s3s3TemplateCarrying
            ? "E · P9 TRIGGER_TEMPLATE 제출"
            : "N3 템플릿을 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · Q9 EXIT" : "EXIT 잠김 · P9 제출 필요");
    } else if (this.s3s3IfInstalled && !this.s3s3Passed) {
      this.prompt.setText("문서 H4 도착 시 SPACE로 ROW_4 HIDE → 5초 정지 · 문 앞 대기");
    } else {
      this.prompt.setText("G7 IF 설치 → ROW_4 HIDE로 정지 → L5 첫 개방 통과 → N3 → P9 → Q9");
    }
  }

  private interactSession3Sheet3() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s3Template) < 100 && this.s3s3Template?.visible && this.s3s3Passed) {
      this.s3s3TemplateCarrying = true;
      this.s3s3Template.setVisible(false);
      this.s3s3TemplateHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(TRIGGER_TEMPLATE)");
      return;
    }
    if (distanceTo(this.s3s3Outbox) < 110 && this.s3s3TemplateCarrying) {
      this.s3s3TemplateCarrying = false;
      this.s3s3TemplateSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("P9", "=OUTBOX.SUBMIT(TRIGGER_TEMPLATE)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q9", "=SHEET.PASS(3,3)");
    }
  }

  private updateSession3Sheet4Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s4IfConsole) < 115) {
      this.prompt.setText(
        this.s3s4IfInstalled
          ? "IF 설치됨 · COUNTIF>=4 감시 중"
          : "SPACE · J7 IF(COUNTIF(OPERATIONS)>=4,N6.OPEN) 설치",
      );
    } else if (distanceTo(this.s3s4MacroButton) < 100) {
      this.prompt.setText(
        !this.s3s4IfInstalled
          ? "IF를 먼저 설치 (ARMED FIRST)"
          : this.s3s4MacroRun
            ? (this.s3s4Triggered ? "회의 소집 완료 · N6 개방" : "회의 소집 진행 중…")
            : "E · MACRO(회의 소집) 실행",
      );
    } else if (distanceTo(this.s3s4Door) < 120) {
      this.prompt.setText(this.s3s4Triggered ? "N6 개방됨" : "N6 잠김 · OPERATIONS 4명 회의실 필요");
    } else if (distanceTo(this.s3s4Signature) < 100 && this.s3s4Signature?.visible) {
      this.prompt.setText(this.s3s4Triggered ? "E · Q3 MACRO_SIGNATURE 회수" : "N6 개방 후 접근 가능");
    } else if (distanceTo(this.s3s4Outbox) < 110) {
      this.prompt.setText(
        this.s3s4SignatureSubmitted
          ? "R10 OUTBOX 제출 완료"
          : this.s3s4SignatureCarrying
            ? "E · R10 MACRO_SIGNATURE 제출"
            : "Q3 서명을 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · S10 EXIT" : "EXIT 잠김 · R10 제출 필요");
    } else {
      this.prompt.setText("J7 IF 설치 → MACRO 회의 소집 → OPERATIONS 4명 → N6 → Q3 → R10 → S10");
    }
  }

  private interactSession3Sheet4() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (
      distanceTo(this.s3s4MacroButton) < 100
      && this.s3s4IfInstalled
      && !this.s3s4MacroRun
    ) {
      this.runSession3Sheet4Macro();
      return;
    }
    if (distanceTo(this.s3s4Signature) < 100 && this.s3s4Signature?.visible && this.s3s4Triggered) {
      this.s3s4SignatureCarrying = true;
      this.s3s4Signature.setVisible(false);
      this.s3s4SignatureHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("Q3", "=HANDS(MACRO_SIGNATURE)");
      return;
    }
    if (distanceTo(this.s3s4Outbox) < 110 && this.s3s4SignatureCarrying) {
      this.s3s4SignatureCarrying = false;
      this.s3s4SignatureSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("R10", "=OUTBOX.SUBMIT(MACRO_SIGNATURE)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("S10", "=SHEET.PASS(3,4)");
    }
  }

  private runSession3Sheet4Macro() {
    this.s3s4MacroRun = true;
    this.s3s4MacroHighlight?.setTint(0x79d6a5);
    this.s3s4StatusLabel?.setText("MACRO(회의 소집) 실행 · OPERATIONS 이동").setColor("#cfe7d2");
    this.s3s4Leader?.setTint(0xf2d875);
    this.time.delayedCall(400, () => this.s3s4Leader?.clearTint());
    useGameStore.getState().setSelectedCell("H10", '=MACRO("회의 소집") // TRAINING CHARGE');
    this.s3s4Workers.forEach((worker, index) => {
      this.time.delayedCall(index * 700, () => {
        this.tweens.add({
          targets: worker.image,
          x: worker.seat.x,
          y: worker.seat.y,
          duration: 1200,
          ease: "Sine.InOut",
          onComplete: () => {
            this.s3s4Count += 1;
            this.s3s4CountLabel
              ?.setText(`COUNTIF(OPERATIONS) = ${this.s3s4Count} / 4`)
              .setColor(this.s3s4Count >= 4 ? "#bfe6c4" : "#f0c9a6");
            useGameStore.getState().setSelectedCell(
              "K3",
              `=COUNTIF(MEETING_ROOM,DEPARTMENT="OPERATIONS") // ${this.s3s4Count}`,
            );
            if (this.s3s4Count >= 4) this.triggerSession3Sheet4If();
          },
        });
      });
    });
  }

  private triggerSession3Sheet4If() {
    if (this.s3s4Triggered) return;
    this.s3s4Triggered = true;
    this.terminalChecked = true;
    this.s3s4Door?.setTexture("office-ref-exitOpen");
    const doorBody = this.s3s4DoorBody ? this.arcadeBody(this.s3s4DoorBody) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s3s4StatusLabel?.setText("COUNTIF>=4 · IF TRUE · N6 OPEN · IF CONSUMED").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ terminalChecked: true });
    useGameStore.getState().setSelectedCell(
      "N6",
      "=IF(COUNTIF(MEETING_ROOM,OPERATIONS)>=4,DOOR_N6.OPEN) // TRUE",
    );
  }

  private updateSession3FinalPrompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const allClear = !this.s3finAutomation && this.s3finPending === 0 && this.s3finLoopDepth === 0;
    if (distanceTo(this.s3finTerminal) < 110) {
      this.prompt.setText(this.s3finLinked ? "K8 LINKED · 스위치/루프 셀 편집 가능" : "E · K8 자동화 단말기 연결");
    } else if (distanceTo(this.s3finMacroButton) < 100) {
      this.prompt.setText(
        !this.s3finLinked
          ? "K8을 먼저 연결"
          : this.s3finRouteReady
            ? "ROUTE_READY=TRUE 영구 저장됨"
            : "E · 선택 MACRO 실행 (ROUTE_READY 설정)",
      );
    } else if (distanceTo(this.s3finSwitch) < 115) {
      this.prompt.setText(
        this.s3finIf1Installed
          ? "IF#1 설치됨 · AUTOMATION OFF 유지"
          : !this.s3finRouteReady
            ? "ROUTE_READY 필요 · MACRO 먼저 실행"
            : !this.s3finLinked
              ? "K8 재연결 필요"
              : "SPACE · Q3 IF#1(ROUTE_READY→AUTOMATION OFF) 설치",
      );
    } else if (distanceTo(this.s3finRechargeNode) < 92) {
      this.prompt.setText(this.rechargeUsed ? "M8 충전 노드 사용 완료" : "E · M8 CALC +2 충전");
    } else if (distanceTo(this.s3finLoopCell) < 115) {
      this.prompt.setText(
        this.s3finIf2Installed
          ? "IF#2 설치됨 · PENDING=0 시 LOOP_DEPTH 0"
          : !this.s3finIf1Installed
            ? "IF#1을 먼저 설치"
            : this.calc < 3
              ? "CALC 부족 · M8 충전 필요"
              : "SPACE · R3 IF#2(PENDING=0→LOOP RESET) 설치",
      );
    } else if (distanceTo(this.s3finSubmit) < 110) {
      this.prompt.setText(
        this.s3finSubmitted
          ? "S10 결과 제출 완료"
          : allClear
            ? "E · S10 종료 결과 제출"
            : "AND(AUTOMATION=FALSE,PENDING=0,LOOP=0) 미충족",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · T10 EXIT" : "EXIT 잠김 · S10 제출 필요");
    } else {
      this.prompt.setText("K8 연결 → MACRO → Q3 IF#1 → M8 충전 → R3 IF#2 → S10 → T10 · DIRECTOR 주의");
    }
  }

  private interactSession3Final() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3finTerminal) < 110 && !this.s3finLinked) {
      this.s3finLinked = true;
      this.s3finTerminalHighlight?.clearTint().setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("K8", "=CONNECT(SHUTDOWN_SWITCH,LOOP_CELL) // LINKED");
      return;
    }
    if (
      distanceTo(this.s3finMacroButton) < 100
      && this.s3finLinked
      && !this.s3finRouteReady
    ) {
      this.s3finRouteReady = true;
      this.s3finMacroRun = true;
      this.s3finMacroHighlight?.setTint(0x79d6a5);
      this.updateSession3FinalStatus();
      useGameStore.getState().setSelectedCell("P3", '=MACRO("회의 소집") // ROUTE_READY=TRUE');
      return;
    }
    if (distanceTo(this.s3finRechargeNode) < 92 && !this.rechargeUsed) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.s3finRechargeNode?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("M8", "=CALC.RECHARGE(+2)");
      return;
    }
    const allClear = !this.s3finAutomation && this.s3finPending === 0 && this.s3finLoopDepth === 0;
    if (distanceTo(this.s3finSubmit) < 110 && !this.s3finSubmitted && allClear) {
      this.s3finSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.s3finSubmitHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("S10", "=SAVE(SHUTDOWN_RESULT) // AND()=TRUE");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("T10", "=SHEET.PASS(3,5)");
    }
  }

  private updateSession4Sheet1Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s4s1UndoTerminal) < 105) {
      this.prompt.setText(this.s4s1UndoUnlocked ? "E6 UNDO 해금됨 (Z 슬롯)" : "E · E6 변경 이력 단말기 연결 (UNDO 해금)");
    } else if (distanceTo(this.s4s1Cart) < 100 && !this.s4s1Undone) {
      this.prompt.setText(
        !this.s4s1UndoUnlocked
          ? "E6을 먼저 연결"
          : this.s4s1CartCopied
            ? "D3 기록 카트 COPY됨"
            : "C · D3 기록 카트 COPY",
      );
    } else if (distanceTo(this.s4s1Sensor) < 105) {
      this.prompt.setText(
        !this.s4s1CartCopied
          ? "D3 카트를 먼저 COPY"
          : this.s4s1Pasted
            ? (this.s4s1Undone ? "G5 PASTE UNDO됨 · 중복 제거" : "Z · G5 PASTE UNDO (문은 LATCHED 유지)")
            : "V · G5 압력 센서에 PASTE (CALC 2)",
      );
    } else if (distanceTo(this.s4s1Door) < 120) {
      this.prompt.setText(this.s4s1DoorOpen ? "K5 LATCHED OPEN" : "K5 잠김 · 센서 PASTE 사건 필요");
    } else if (distanceTo(this.s4s1Log) < 100 && this.s4s1Log?.visible) {
      this.prompt.setText(this.s4s1DoorOpen ? "E · N3 ORIGINAL_CHANGE_LOG 회수" : "K5 개방 후 접근 가능");
    } else if (distanceTo(this.s4s1Outbox) < 110) {
      this.prompt.setText(
        this.s4s1LogSubmitted
          ? "O8 OUTBOX 제출 완료"
          : this.s4s1LogCarrying
            ? (this.s4s1Undone ? "E · O8 ORIGINAL_CHANGE_LOG 제출" : "먼저 Z로 PASTE UNDO (중복 카트 제거)")
            : "N3 로그를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · O8→EXIT" : "EXIT 잠김 · O8 제출 필요");
    } else if (this.s4s1Pasted && !this.s4s1Undone) {
      this.prompt.setText("Z로 PASTE UNDO · 중복 카트만 제거되고 K5 문은 유지됨");
    } else {
      this.prompt.setText("E6 연결 → D3 COPY → G5 PASTE → Z UNDO → K5 통과 → N3 → O8");
    }
  }

  private interactSession4Sheet1() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s4s1UndoTerminal) < 105 && !this.s4s1UndoUnlocked) {
      this.s4s1UndoUnlocked = true;
      this.s4s1UndoHighlight?.setTint(0x79d6a5);
      this.s4s1StatusLabel?.setText("UNDO 해금 · Z 슬롯 고정 · PASTE 사건 없음").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("E6", "=CONNECT(CHANGE_HISTORY) // UNDO UNLOCKED");
      return;
    }
    if (distanceTo(this.s4s1Log) < 100 && this.s4s1Log?.visible && this.s4s1DoorOpen) {
      this.s4s1LogCarrying = true;
      this.s4s1Log.setVisible(false);
      this.s4s1LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(ORIGINAL_CHANGE_LOG)");
      return;
    }
    if (distanceTo(this.s4s1Outbox) < 110 && this.s4s1LogCarrying && this.s4s1Undone) {
      this.s4s1LogCarrying = false;
      this.s4s1LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("O8", "=OUTBOX.SUBMIT(ORIGINAL_CHANGE_LOG)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("P8", "=SHEET.PASS(4,1)");
    }
  }

  private copySession4Sheet1Cart() {
    if (!this.player || !this.s4s1Cart || !this.s4s1UndoUnlocked || this.s4s1CartCopied) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s4s1Cart) >= 110) return;
    this.s4s1CartCopied = true;
    this.s4s1CartHighlight?.setTint(0x79d6a5);
    this.s4s1StatusLabel?.setText("CLIPBOARD = RECORD_CART · G5에 PASTE 대기").setColor("#cfe7d2");
    useGameStore.getState().setSelectedCell("D3", "=COPY(RECORD_CART)");
  }

  private pasteSession4Sheet1Cart() {
    if (!this.player || !this.s4s1Sensor || !this.s4s1CartCopied || this.s4s1Pasted) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s4s1Sensor) >= 110) return;
    if (this.calc < 2) return;
    this.calc -= 2;
    this.s4s1Pasted = true;
    this.s4s1DoorOpen = true;
    this.s4s1DuplicateCart = this.add.image(620, 408, "office-ref-filingCabinet")
      .setDisplaySize(60, 68).setDepth(8);
    this.s4s1Sensor?.setTint(0x79d6a5);
    this.s4s1Door?.setTexture("office-ref-exitOpen");
    const doorBody = this.s4s1DoorBody ? this.arcadeBody(this.s4s1DoorBody) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s4s1StatusLabel?.setText("PASTE → SENSOR 사건 DOOR_OPEN(K5,LATCHED)").setColor("#cfe7d2");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("G5", "=PASTE(RECORD_CART) // DOOR_OPEN(K5,LATCHED)");
  }

  private undoSession4Sheet1Paste() {
    if (!this.s4s1UndoUnlocked || !this.s4s1Pasted || this.s4s1Undone) return;
    if (this.calc < 3) return;
    this.calc -= 3;
    this.s4s1Undone = true;
    this.s4s1DuplicateCart?.destroy();
    this.s4s1DuplicateCart = undefined;
    this.s4s1Sensor?.clearTint().setTint(0xcaa7d8);
    this.s4s1StatusLabel?.setText("UNDO(PASTE) · 중복 카트 제거 · K5 LATCHED 유지").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("Z1", "=UNDO(PASTE) // CART REMOVED · DOOR REMAINS");
  }

  private updateSession6Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s6s3Key) < 100 && this.s6s3Key?.visible) {
      this.prompt.setText(this.s6s3KeyCarrying ? "R3 소지 중" : "E · R3 WRITE_PERMISSION_KEY 회수");
    } else if (this.s6s3Phase === 1 && distanceTo(this.s6s3Gate1) < 130) {
      this.prompt.setText(this.s6s3DraftKind === "hide" ? "DRAFT HIDE · 지금 COLUMN F 통과" : "SPACE · HIDE COLUMN F (CALC 1 · DRAFT 3s)");
    } else if (this.s6s3Phase === 2 && distanceTo(this.s6s3Gate2) < 130) {
      this.prompt.setText(this.s6s3DraftKind === "sort" ? "DRAFT SORT · 지금 경비 구간 통과" : "SPACE · 경비 SORT(AUDIT_ORDER ASC · CALC 2 · DRAFT 3s)");
    } else if (this.s6s3Phase === 3 && distanceTo(this.s6s3Token) < 100) {
      this.prompt.setText(this.s6s3TokenCopied ? "M6 COPY됨 · O6에 PASTE" : "C · M6 WRITE_TOKEN_TEMPLATE COPY");
    } else if (this.s6s3Phase === 3 && Phaser.Math.Distance.Between(this.player.x, this.player.y, 1200, 320) < 110) {
      this.prompt.setText(
        this.s6s3Pasted
          ? "O6 PASTE 확정 (영구)"
          : this.s6s3TokenCopied
            ? "V · O6에 PASTE (CALC 2 · WRITE BUFFER 영구)"
            : "M6을 먼저 COPY",
      );
    } else if (distanceTo(this.s6s3Outbox) < 110) {
      this.prompt.setText(
        this.s6s3KeySubmitted
          ? "T11 제출 완료"
          : this.s6s3KeyCarrying
            ? "E · T11 WRITE_PERMISSION_KEY 제출"
            : "R3 키를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · T11 제출 필요");
    } else {
      this.prompt.setText(
        this.s6s3Phase === 1
          ? "HIDE COLUMN F(DRAFT) 통과"
          : this.s6s3Phase === 2
            ? "경비 SORT(DRAFT) 통과"
            : "M6 COPY → O6 PASTE(영구) → R3 → T11",
      );
    }
  }

  private interactSession6Sheet3() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s6s3Key) < 100 && this.s6s3Key?.visible && !this.s6s3KeyCarrying) {
      this.s6s3KeyCarrying = true;
      this.s6s3Key.setVisible(false);
      this.s6s3KeyHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("R3", "=HANDS(WRITE_PERMISSION_KEY)");
      return;
    }
    if (distanceTo(this.s6s3Outbox) < 110 && this.s6s3KeyCarrying) {
      this.s6s3KeyCarrying = false;
      this.s6s3KeySubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("T11", "=SIGN(WRITE_PERMISSION=TRUE) // 세션 영구");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("T11", "=SHEET.PASS(6,3)");
    }
  }

  private copySession6Sheet3Token() {
    if (!this.player || !this.s6s3Token || this.s6s3Phase !== 3 || this.s6s3TokenCopied) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s6s3Token) >= 110) return;
    this.s6s3TokenCopied = true;
    this.s6s3TokenHighlight?.setTint(0x79d6a5);
    this.s6s3StatusLabel?.setText("CLIPBOARD = WRITE_TOKEN · O6(버퍼)에 PASTE").setColor("#cfe7d2");
    useGameStore.getState().setSelectedCell("M6", "=COPY(WRITE_TOKEN_TEMPLATE)");
  }

  private pasteSession6Sheet3Token() {
    if (!this.player || this.s6s3Phase !== 3 || !this.s6s3TokenCopied || this.s6s3Pasted) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1200, 320) >= 110) return;
    if (this.calc < 2) return;
    this.calc -= 2;
    this.s6s3Pasted = true;
    this.s6s3PasteSlot?.setFillStyle(0x8fe0a4, 0.24).setStrokeStyle(2, 0x4fb877, 0.9);
    this.add.image(1200, 320, "office-ref-approvalDocument").setDisplaySize(46, 54).setDepth(8);
    this.s6s3Key?.setVisible(true);
    this.s6s3KeyHighlight?.setVisible(true);
    this.s6s3StatusLabel?.setText("O6 PASTE 영구 확정 · R3 WRITE_PERMISSION_KEY 생성").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("O6", "=PASTE(WRITE_TOKEN) // 버퍼 영구 · KEY 생성");
  }

  private updateSession6Sheet4Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (!this.s6s4Prepared && distanceTo(this.s6s4PrepTerminal) < 110) {
      this.prompt.setText("E · D10 준비 단말기 활성화 (CALC +2 · 12s 주기)");
    } else if (this.s6s4Key?.visible && distanceTo(this.s6s4Key) < 100) {
      this.prompt.setText(this.s6s4KeyCarrying ? "R3 소지 중" : "E · R3 SAVE_PERMISSION_KEY 회수");
    } else if (this.s6s4Prepared && !this.s6s4RowHidden && distanceTo(this.s6s4Barrier) < 150) {
      this.prompt.setText("SPACE · HIDE ROW 8 (CALC 1 · 저장 보관소 개방)");
    } else if (this.s6s4RowHidden && !this.s6s4TemplateCopied && distanceTo(this.s6s4Template) < 100) {
      this.prompt.setText("C · J5 ROOT_SIGNATURE_TEMPLATE COPY");
    } else if (distanceTo(this.s6s4SaveSlot) < 120) {
      if (!this.s6s4Pasted) {
        this.prompt.setText(this.s6s4TemplateCopied ? "V · N6에 PASTE (CALC 2)" : "J5를 먼저 COPY");
      } else if (!this.s6s4IfInstalled) {
        this.prompt.setText("SPACE · IF 승인 설치 (CALC 3 · R3 KEY 서명)");
      } else {
        this.prompt.setText("N6 저장 승인 완료");
      }
    } else if (distanceTo(this.s6s4Outbox) < 120) {
      this.prompt.setText(
        this.s6s4KeySubmitted
          ? "T11 제출 완료"
          : this.s6s4KeyCarrying
            ? "E · T11에 R3 SAVE_PERMISSION_KEY 제출"
            : "R3 키를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · T11 제출 필요");
    } else if (!this.s6s4Prepared) {
      this.prompt.setText("D10 준비 단말기 활성화");
    } else if (!this.s6s4KeyGenerated) {
      this.prompt.setText("ROW 8 HIDE → J5 COPY → N6 PASTE → IF 설치");
    } else {
      this.prompt.setText("R3 회수 → T11 제출 → EXIT");
    }
  }

  private interactSession6Sheet4() {
    if (!this.player || !this.exitDoor) return;
    const time = this.time.now;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;

    // D10 prep terminal: CALC +2 and start the 12s LOAD_LAST_FINAL cycle.
    if (distanceTo(this.s6s4PrepTerminal) < 110 && !this.s6s4Prepared && !this.s6s4KeyGenerated) {
      this.s6s4Prepared = true;
      this.s6s4CycleActive = true;
      this.s6s4CycleUntil = time + 12000;
      this.s6s4CycleLastSecond = -1;
      this.s6s4GhostActive = false;
      this.s6s4GhostLabel?.setVisible(false);
      this.calc = Math.min(7, this.calc + 2);
      this.s6s4PrepHighlight?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("D10", "=PREP(SAVE_CYCLE) // CALC +2 · 12s");
      this.s6s4StatusLabel
        ?.setText("준비 완료 · ROW 8 HIDE → J5 COPY → N6 PASTE → IF 설치")
        .setColor("#cfe7d2");
      return;
    }

    // Recover the server-signed R3 key.
    if (distanceTo(this.s6s4Key) < 100 && this.s6s4Key?.visible && !this.s6s4KeyCarrying) {
      this.s6s4KeyCarrying = true;
      this.s6s4Key.setVisible(false);
      this.s6s4KeyHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("R3", "=HANDS(SAVE_PERMISSION_KEY)");
      return;
    }

    // Submit R3 at T11 to sign SAVE_PERMISSION as a session-permanent right.
    if (distanceTo(this.s6s4Outbox) < 120 && this.s6s4KeyCarrying && !this.s6s4KeySubmitted) {
      this.s6s4KeyCarrying = false;
      this.s6s4KeySubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("T11", "=SIGN(SAVE_PERMISSION=TRUE) // 세션 영구");
      this.s6s4StatusLabel
        ?.setText("SAVE_PERMISSION=TRUE 서명 · 서명된 변경 유지 · EXIT 개방")
        .setColor("#bfe6c4");
      return;
    }

    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("T11", "=SHEET.PASS(6,4)");
    }
  }

  private copySession6Sheet4Template() {
    if (!this.player || !this.s6s4Template || !this.s6s4Prepared) return;
    if (this.s6s4TemplateCopied || !this.s6s4RowHidden) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s6s4Template) >= 110) return;
    this.s6s4TemplateCopied = true;
    this.s6s4TemplateHighlight?.setTint(0x79d6a5);
    this.s6s4StatusLabel?.setText("CLIPBOARD = ROOT_SIGNATURE · N6에 PASTE").setColor("#cfe7d2");
    useGameStore.getState().setSelectedCell("J5", "=COPY(ROOT_SIGNATURE_TEMPLATE)");
  }

  private pasteSession6Sheet4Template() {
    if (!this.player || !this.s6s4SaveSlot) return;
    if (!this.s6s4TemplateCopied || this.s6s4Pasted) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s6s4SaveSlot) >= 120) return;
    if (this.calc < 2) return;
    this.calc -= 2;
    this.s6s4Pasted = true;
    this.s6s4SaveSlotRect?.setFillStyle(0x8fe0a4, 0.22).setStrokeStyle(2, 0x4fb877, 0.9);
    this.s6s4PastedDoc = this.add.image(1080, 286, "office-ref-approvalDocument")
      .setDisplaySize(44, 52).setDepth(8);
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("N6", "=PASTE(ROOT_SIGNATURE) // SIGNATURE_VALID=TRUE");
    this.s6s4StatusLabel?.setText("N6 서명 유효 · SPACE로 IF 승인 설치 (CALC 3)").setColor("#cfe7d2");
  }

  private updateSession6Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const linkRemaining = Math.max(0, Math.ceil((this.s6s2LinkUntil - this.time.now) / 1000));
    if (distanceTo(this.s6s2LinkTerminal) < 105) {
      this.prompt.setText(this.s6s2Linked ? `LINKED ${linkRemaining}s · 유지 중` : "E · E9 연결 (원격 장치 LINK 20초)");
    } else if (this.s6s2Sandbox && Phaser.Math.Distance.BetweenPoints(this.player, this.s6s2Sandbox) < 120) {
      this.prompt.setText(
        !this.s6s2Linked
          ? "샌드박스 · E9 LINK 필요"
          : !this.s6s2IfInstalled
            ? "SPACE · IF(EMPLOYEE_COUNT(J3:K3)>=2,N5.OPEN) 설치"
            : !this.s6s2Sorted
              ? "SPACE · 원격 J3:K5 SORT (ACCESS_PRIORITY ASC)"
              : "샌드박스 수식 완료",
      );
    } else if (distanceTo(this.s6s2Door) < 120) {
      this.prompt.setText(this.s6s2Triggered ? "N5 개방됨" : "N5 잠김 · 원격 IF TRUE 필요");
    } else if (distanceTo(this.s6s2Key) < 100 && this.s6s2Key?.visible) {
      this.prompt.setText(this.s6s2Triggered ? "E · R3 FORMULA_PERMISSION_KEY 회수" : "N5 개방 후 접근");
    } else if (distanceTo(this.s6s2Outbox) < 110) {
      this.prompt.setText(
        this.s6s2KeySubmitted
          ? "S10 제출 완료"
          : this.s6s2KeyCarrying
            ? "E · S10 FORMULA_PERMISSION_KEY 제출"
            : "R3 키를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · S10 제출 필요");
    } else {
      this.prompt.setText("E9 LINK → 샌드박스 IF → 원격 SORT → N5 → R3 → S10");
    }
  }

  private interactSession6Sheet2() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s6s2LinkTerminal) < 105 && !this.s6s2Linked) {
      this.s6s2Linked = true;
      this.s6s2LinkUntil = this.time.now + 20000;
      this.s6s2LinkLastSecond = -1;
      this.s6s2LinkHighlight?.clearTint().setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("E9", "=LINK(J3:K5,J3:K3,N5) // LINKED 20s");
      return;
    }
    if (distanceTo(this.s6s2Key) < 100 && this.s6s2Key?.visible && this.s6s2Triggered && !this.s6s2KeyCarrying) {
      this.s6s2KeyCarrying = true;
      this.s6s2Key.setVisible(false);
      this.s6s2KeyHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("R3", "=HANDS(FORMULA_PERMISSION_KEY)");
      return;
    }
    if (distanceTo(this.s6s2Outbox) < 110 && this.s6s2KeyCarrying) {
      this.s6s2KeyCarrying = false;
      this.s6s2KeySubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("S10", "=SIGN(FORMULA_PERMISSION=TRUE) // 세션 영구");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("S10", "=SHEET.PASS(6,2)");
    }
  }

  private updateSession6Sheet1Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s6s1Key) < 100 && this.s6s1Key?.visible) {
      this.prompt.setText(this.s6s1KeyTaken ? "SELECT_PERMISSION 확보" : "E · Q2 SELECT_PERMISSION_KEY 회수");
    } else if (this.s6s1Phase === 1 && distanceTo(this.s6s1Box) < 100) {
      this.prompt.setText(this.s6s1BoxCopied ? "D8 COPY됨 · F8에 PASTE" : "C · D8 서류 상자 COPY (RANGE 1)");
    } else if (this.s6s1Phase === 1 && distanceTo(this.s6s1Sensor) < 100) {
      this.prompt.setText(this.s6s1BoxCopied ? "V · F8 요청 센서에 PASTE (CALC 2)" : "D8을 먼저 COPY");
    } else if (this.s6s1Phase === 2 && distanceTo(this.s6s1SortStation) < 115) {
      this.prompt.setText("SPACE · ACCESS_REQUEST 3행 SORT (REQUEST_ID ASC · CALC 2)");
    } else if (this.s6s1Phase === 3 && this.player.x > 1040 && this.player.x < 1320 && this.player.y > 160) {
      this.prompt.setText("SPACE로 ROW 3 HIDE (CALC 1) · 접힌 구간으로 Q2 회수");
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · Q2 권한 회수 필요");
    } else {
      this.prompt.setText(
        this.s6s1Phase === 1
          ? "RANGE 1: D8 COPY → F8 PASTE"
          : this.s6s1Phase === 2
            ? "RANGE 2: ACCESS_REQUEST SORT"
            : "RANGE 3: HIDE ROW 3 → Q2 회수",
      );
    }
  }

  private interactSession6Sheet1() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s6s1Key) < 100 && this.s6s1Key?.visible && !this.s6s1KeyTaken) {
      this.s6s1KeyTaken = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.s6s1Key.setVisible(false);
      this.s6s1KeyHighlight?.setVisible(false);
      this.exitDoor.setTexture("office-ref-exitOpen");
      this.s6s1StatusLabel?.setText("SELECT_PERMISSION=TRUE 서명 · 반경 4셀 자유 선택").setColor("#bfe6c4");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("Q2", "=SIGN(SELECT_PERMISSION=TRUE) // 세션 영구");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R2", "=SHEET.PASS(6,1)");
    }
  }

  private copySession6Sheet1Box() {
    if (!this.player || !this.s6s1Box || this.s6s1Phase !== 1 || this.s6s1BoxCopied) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s6s1Box) >= 110) return;
    this.s6s1BoxCopied = true;
    this.s6s1BoxHighlight?.setTint(0x79d6a5);
    this.s6s1StatusLabel?.setText("CLIPBOARD = 서류 상자 · F8에 PASTE").setColor("#cfe7d2");
    useGameStore.getState().setSelectedCell("D8", "=COPY(REQUEST_BOX) // RANGE 1");
  }

  private pasteSession6Sheet1Box() {
    if (!this.player || !this.s6s1Sensor || this.s6s1Phase !== 1 || !this.s6s1BoxCopied) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s6s1Sensor) >= 110) return;
    if (this.calc < 2) return;
    this.calc -= 2;
    this.s6s1Phase = 2;
    this.s6s1Sensor?.setTint(0x79d6a5);
    this.s6s1Gate1?.setTexture("office-ref-exitOpen");
    const g1 = this.s6s1Gate1Body ? this.arcadeBody(this.s6s1Gate1Body) : undefined;
    if (g1) g1.enable = false;
    this.moveSession6Sheet1Range(2);
    this.s6s1StatusLabel?.setText("RANGE 2 (H6:L9) · ACCESS_REQUEST SORT").setColor("#f0c9a6");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("F8", "=PASTE(REQUEST_BOX) // 승인·RANGE→H6:L9");
  }

  private updateSession5FinalPrompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (this.s5finNameError) {
      const remaining = Math.max(0, Math.ceil((this.s5finNameErrorUntil - this.time.now) / 1000));
      this.prompt.setText(`#NAME? 방어 ${remaining}s · 심사 제외 · 비교 구역으로 이동`);
    } else if (distanceTo(this.s5finErrorTerminal) < 105) {
      this.prompt.setText(
        this.s5finFirstReviewPassed
          ? "첫 심사 통과 완료"
          : this.s5finErrorUnlocked
            ? "SPACE · 자신에게 #NAME? 방어 (손상도 +15)"
            : "E · 오류 단말기 연결 (첫 심사 방어)",
      );
    } else if (distanceTo(this.s5finCompareTerminal) < 115) {
      this.prompt.setText(
        this.s5finFilterConfirmed
          ? "정본 확정됨 · CANONICAL_ROW=TRUE"
          : this.s5finFirstReviewPassed
            ? "SPACE · FILTER(CANONICAL_MATCH=TRUE) · CALC 3"
            : "첫 심사 통과 후 비교 가능",
      );
    } else if (distanceTo(this.s5finPointer) < 120) {
      this.prompt.setText(
        this.s5finPointerDeleted
          ? "U3 TERMINATION_POINTER #REF! 삭제됨"
          : this.s5finFilterConfirmed
            ? "SPACE · #REF!(TERMINATION_POINTER) 영구 삭제 (손상도 +25)"
            : "정본 확정 후 LOCKED 해제",
      );
    } else if (distanceTo(this.s5finOutbox) < 110) {
      this.prompt.setText(
        this.s5finSubmitted
          ? "V11 최종 OUTBOX 제출 완료"
          : this.s5finPointerDeleted
            ? "E · V11 판정 보고서 제출"
            : "포인터 #REF! 후 제출",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · V11 제출 필요");
    } else {
      this.prompt.setText("오류로 첫 심사 방어 → FILTER 정본 확정 → U3 #REF! → V11");
    }
  }

  private interactSession5Final() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s5finErrorTerminal) < 105 && !this.s5finErrorUnlocked) {
      this.s5finErrorUnlocked = true;
      this.s5finErrorHighlight?.setTint(0x79d6a5);
      this.s5finStatusLabel?.setText("오류 슬롯 활성 · SPACE로 #NAME? 방어").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("D12", "=CONNECT(ERROR_SLOT) // 방어용 오류 해금");
      return;
    }
    if (distanceTo(this.s5finOutbox) < 110 && !this.s5finSubmitted && this.s5finPointerDeleted) {
      this.s5finSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("V11", "=OUTBOX.SUBMIT(VERDICT) // VP DROP 구조조정 중단");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("V11", "=SHEET.PASS(5,5)");
    }
  }

  private updateSession5Sheet4Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s5s4Terminal) < 105) {
      this.prompt.setText(this.s5s4Unlocked ? "D10 #REF! 슬롯 활성" : "E · D10 오류 단말기 연결 (#REF!)");
    } else if (distanceTo(this.s5s4Server) < 120) {
      this.prompt.setText("BACKUP_SERVER LOCKED · #REF! 삭제 불가");
    } else if (distanceTo(this.s5s4Relay) < 130 && !this.s5s4RelayDeleted) {
      this.prompt.setText(
        this.s5s4Unlocked
          ? "SPACE · #REF!(ROW_LOCK_RELAY) 영구 삭제 (손상도 +25)"
          : "D10을 먼저 연결",
      );
    } else if (
      (distanceTo(this.s5s4Door1) < 110 || distanceTo(this.s5s4Door2) < 110 || distanceTo(this.s5s4Door3) < 110)
    ) {
      this.prompt.setText(this.s5s4RelayDeleted ? "FAIL OPEN · 통과" : "잠김 · ROW_LOCK_RELAY 참조 유지");
    } else if (distanceTo(this.s5s4Log) < 100 && this.s5s4Log?.visible) {
      this.prompt.setText(this.s5s4RelayDeleted ? "E · R3 REFERENCE_DEPENDENCY_MAP 회수" : "세 문 개방 후 접근");
    } else if (distanceTo(this.s5s4Outbox) < 110) {
      this.prompt.setText(
        this.s5s4LogSubmitted
          ? "S10 OUTBOX 제출 완료"
          : this.s5s4LogCarrying
            ? "E · S10 REFERENCE_DEPENDENCY_MAP 제출"
            : "R3 맵을 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · S10 제출 필요");
    } else {
      this.prompt.setText("D10 → ROW_LOCK_RELAY #REF! 삭제 → J6/N5/Q7 FAIL OPEN → R3 → S10");
    }
  }

  private interactSession5Sheet4() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s5s4Terminal) < 105 && !this.s5s4Unlocked) {
      this.s5s4Unlocked = true;
      this.s5s4Highlight?.setTint(0x79d6a5);
      this.s5s4StatusLabel?.setText("#REF! 슬롯 활성 · RELAY 근처에서 SPACE").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("D10", "=CONNECT(ERROR_SLOT) // #REF! 임시 해금");
      return;
    }
    if (distanceTo(this.s5s4Log) < 100 && this.s5s4Log?.visible && this.s5s4RelayDeleted) {
      this.s5s4LogCarrying = true;
      this.s5s4Log.setVisible(false);
      this.s5s4LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("R3", "=HANDS(REFERENCE_DEPENDENCY_MAP)");
      return;
    }
    if (distanceTo(this.s5s4Outbox) < 110 && this.s5s4LogCarrying) {
      this.s5s4LogCarrying = false;
      this.s5s4LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("S10", "=OUTBOX.SUBMIT(REFERENCE_DEPENDENCY_MAP)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("S10", "=SHEET.PASS(5,4)");
    }
  }

  private updateSession5Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const boxRemaining = Math.max(0, Math.ceil((this.s5s3BoxEmployeeUntil - this.time.now) / 1000));
    if (distanceTo(this.s5s3Terminal) < 105) {
      this.prompt.setText(this.s5s3Unlocked ? "D10 #VALUE! 슬롯 활성" : "E · D10 오류 단말기 연결 (#VALUE!)");
    } else if (distanceTo(this.s5s3Box) < 130) {
      this.prompt.setText(
        this.s5s3BoxEmployee
          ? `F5=EMPLOYEE ${boxRemaining}s · 문 개방·VP 미끼`
          : this.s5s3Unlocked
            ? "SPACE · #VALUE!(C3, F5) 적용 (손상도 +20 · 8초)"
            : "D10을 먼저 연결",
      );
    } else if (distanceTo(this.s5s3Door) < 120) {
      this.prompt.setText(this.s5s3BoxEmployee ? "중앙 문 개방 · EMPLOYEE_COUNT>=2" : "문 잠김 · F5를 EMPLOYEE로 오인식");
    } else if (distanceTo(this.s5s3Log) < 100 && this.s5s3Log?.visible) {
      this.prompt.setText("E · Q3 TYPE_SCHEMA 회수");
    } else if (distanceTo(this.s5s3Outbox) < 110) {
      this.prompt.setText(
        this.s5s3LogSubmitted
          ? "R10 OUTBOX 제출 완료"
          : this.s5s3LogCarrying
            ? "E · R10 TYPE_SCHEMA 제출"
            : "Q3 스키마를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · R10 제출 필요");
    } else {
      this.prompt.setText("D10 → #VALUE!로 F5=EMPLOYEE → 8초 안에 문·VP 통로 통과 → Q3 → R10");
    }
  }

  private interactSession5Sheet3() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s5s3Terminal) < 105 && !this.s5s3Unlocked) {
      this.s5s3Unlocked = true;
      this.s5s3Highlight?.setTint(0x79d6a5);
      this.s5s3StatusLabel?.setText("#VALUE! 슬롯 활성 · F5 근처에서 SPACE").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("D10", "=CONNECT(ERROR_SLOT) // #VALUE! 임시 해금");
      return;
    }
    if (distanceTo(this.s5s3Log) < 100 && this.s5s3Log?.visible) {
      this.s5s3LogCarrying = true;
      this.s5s3Log.setVisible(false);
      this.s5s3LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("Q3", "=HANDS(TYPE_SCHEMA)");
      return;
    }
    if (distanceTo(this.s5s3Outbox) < 110 && this.s5s3LogCarrying) {
      this.s5s3LogCarrying = false;
      this.s5s3LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("R10", "=OUTBOX.SUBMIT(TYPE_SCHEMA)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R10", "=SHEET.PASS(5,3)");
    }
  }

  private updateSession5Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const frozenRemaining = Math.max(0, Math.ceil((this.s5s2FrozenUntil - this.time.now) / 1000));
    if (distanceTo(this.s5s2Terminal) < 105) {
      this.prompt.setText(this.s5s2Unlocked ? "D9 #DIV/0! 슬롯 활성" : "E · D9 오류 단말기 연결 (#DIV/0!)");
    } else if (this.s5s2Shutter && Phaser.Math.Distance.BetweenPoints(this.player, this.s5s2Shutter) < 140) {
      this.prompt.setText(
        this.s5s2Frozen
          ? `#DIV/0! 정지 ${frozenRemaining}s · 지금 통과`
          : !this.s5s2Unlocked
            ? "D9을 먼저 연결"
            : this.s5s2ShutterOpen
              ? "SPACE · #DIV/0! H4:J6 정지 (SHUTTER OPEN · 손상도 +20)"
              : "SHUTTER CLOSED · OPEN일 때 #DIV/0! 사용",
      );
    } else if (distanceTo(this.s5s2Log) < 100 && this.s5s2Log?.visible) {
      this.prompt.setText("E · P3 DROP_COMMAND_12 회수");
    } else if (distanceTo(this.s5s2Outbox) < 110) {
      this.prompt.setText(
        this.s5s2LogSubmitted
          ? "Q9 OUTBOX 제출 완료"
          : this.s5s2LogCarrying
            ? "E · Q9 DROP_COMMAND_12 제출"
            : "P3 명령을 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · Q9 제출 필요");
    } else {
      this.prompt.setText("D9 연결 → SHUTTER OPEN 순간 #DIV/0! → 정지 중 통과 → P3 → Q9");
    }
  }

  private interactSession5Sheet2() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s5s2Terminal) < 105 && !this.s5s2Unlocked) {
      this.s5s2Unlocked = true;
      this.s5s2Highlight?.setTint(0x79d6a5);
      this.s5s2StatusLabel?.setText("#DIV/0! 슬롯 활성 · SHUTTER OPEN에 사용").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("D9", "=CONNECT(ERROR_SLOT) // #DIV/0! 임시 해금");
      return;
    }
    if (distanceTo(this.s5s2Log) < 100 && this.s5s2Log?.visible) {
      this.s5s2LogCarrying = true;
      this.s5s2Log.setVisible(false);
      this.s5s2LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("P3", "=HANDS(DROP_COMMAND_12)");
      return;
    }
    if (distanceTo(this.s5s2Outbox) < 110 && this.s5s2LogCarrying) {
      this.s5s2LogCarrying = false;
      this.s5s2LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("Q9", "=OUTBOX.SUBMIT(DROP_COMMAND_12)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q9", "=SHEET.PASS(5,2)");
    }
  }

  private updateSession5Sheet1Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const nameRemaining = Math.max(0, Math.ceil((this.s5s1NameErrorUntil - this.time.now) / 1000));
    if (this.s5s1NameError) {
      this.prompt.setText(`#NAME? 적용 중 ${nameRemaining}s · HR 검색 통과 · L5는 복원 후`);
    } else if (distanceTo(this.s5s1Terminal) < 105) {
      this.prompt.setText(
        this.s5s1Unlocked
          ? "SPACE · 자신에게 #NAME? 사용 (손상도 +15 · 10초)"
          : "E · D8 오류 단말기 연결 (#NAME? 슬롯 · 손상도 HUD)",
      );
    } else if (
      this.s5s1HrBand
      && Math.abs(this.player.x - this.s5s1HrBand.x) < this.s5s1HrBand.width / 2 + 40
    ) {
      this.prompt.setText(this.s5s1Unlocked ? "HR 검색 노출 · SPACE로 #NAME? 후 통과" : "HR 검색 통로 · D8 먼저 연결");
    } else if (distanceTo(this.s5s1Door) < 120) {
      this.prompt.setText(
        this.s5s1DoorOpen
          ? "L5 개방됨"
          : !this.s5s1Unlocked
            ? "L5 잠김 · D8 먼저 연결"
            : "E · L5 정상 개방 (신원·CLEARANCE 복원 상태)",
      );
    } else if (distanceTo(this.s5s1Log) < 100 && this.s5s1Log?.visible) {
      this.prompt.setText(this.s5s1DoorOpen ? "E · N3 CANONICAL_BADGE_SEED 회수" : "L5 개방 후 접근 가능");
    } else if (distanceTo(this.s5s1Outbox) < 110) {
      this.prompt.setText(
        this.s5s1LogSubmitted
          ? "O8 OUTBOX 제출 완료"
          : this.s5s1LogCarrying
            ? "E · O8 CANONICAL_BADGE_SEED 제출"
            : "N3 시드를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · EXIT" : "EXIT 잠김 · O8 제출 필요");
    } else {
      this.prompt.setText("D8 연결 → #NAME?로 HR 통과 → L5 앞 대기(복원) → L5 → N3 → O8");
    }
  }

  private interactSession5Sheet1() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s5s1Terminal) < 105 && !this.s5s1Unlocked) {
      this.s5s1Unlocked = true;
      this.s5s1Highlight?.setTint(0x79d6a5);
      this.s5s1StatusLabel?.setText("오류 슬롯·손상도 HUD 활성 · SPACE로 #NAME?").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("D8", "=CONNECT(ERROR_SLOT) // #NAME? 임시 해금");
      return;
    }
    if (
      distanceTo(this.s5s1Door) < 120
      && !this.s5s1DoorOpen
      && this.s5s1Unlocked
      && !this.s5s1NameError
    ) {
      this.s5s1DoorOpen = true;
      this.s5s1Door?.setTexture("office-ref-exitOpen");
      const doorBody = this.s5s1DoorBody ? this.arcadeBody(this.s5s1DoorBody) : undefined;
      if (doorBody) doorBody.enable = false;
      useGameStore.getState().setSelectedCell("L5", "=DOOR_L5.OPEN(VALID_BADGE) // CLEARANCE OK");
      return;
    }
    if (distanceTo(this.s5s1Log) < 100 && this.s5s1Log?.visible && this.s5s1DoorOpen) {
      this.s5s1LogCarrying = true;
      this.s5s1Log.setVisible(false);
      this.s5s1LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(CANONICAL_BADGE_SEED)");
      return;
    }
    if (distanceTo(this.s5s1Outbox) < 110 && this.s5s1LogCarrying) {
      this.s5s1LogCarrying = false;
      this.s5s1LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("O8", "=OUTBOX.SUBMIT(CANONICAL_BADGE_SEED)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("P8", "=SHEET.PASS(5,1)");
    }
  }

  private updateSession4FinalPrompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (this.s4finHidden) {
      this.prompt.setText("SELF HIDE 중 · 5초 뒤 복원");
    } else if (distanceTo(this.s4finCompareA) < 105) {
      this.prompt.setText(this.s4finRechargeA ? "COMPARE A 완료 (+2)" : "E · COMPARE A 연결 (CALC +2)");
    } else if (distanceTo(this.s4finCompareB) < 105) {
      this.prompt.setText(this.s4finRechargeB ? "COMPARE B 완료 (+2)" : "E · COMPARE B 연결 (CALC +2)");
    } else if (distanceTo(this.s4finForged) < 100 && !this.s4finCompared) {
      this.prompt.setText(this.s4finForgedCopied ? "FORGED_APPROVAL COPY됨" : "C · Auditor FORGED_APPROVAL COPY");
    } else if (distanceTo(this.s4finSlot) < 110) {
      this.prompt.setText(
        this.s4finCompared
          ? "N7 비교 완료"
          : this.s4finForgedCopied
            ? "V · N7에 FORGED_APPROVAL PASTE (CALC 2)"
            : "FORGED_APPROVAL을 먼저 COPY",
      );
    } else if (distanceTo(this.s4finIfConsole) < 115) {
      this.prompt.setText(
        this.s4finIfInstalled
          ? (this.s4finUndone ? "IF UNDO됨 · 판정 LOCKED 유지" : "IF 설치됨 · Z로 UNDO")
          : this.s4finCompared
            ? "SPACE · 최종 판정 IF 설치 (CALC 3)"
            : "N7 비교를 먼저 완료",
      );
    } else if (distanceTo(this.s4finOutbox) < 110) {
      this.prompt.setText(
        this.s4finSubmitted
          ? "V11 최종 OUTBOX 제출 완료"
          : this.s4finUndone
            ? "E · V11 최종 판정 제출"
            : "IF UNDO 후 제출 가능",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · V11→EXIT" : "EXIT 잠김 · V11 제출 필요");
    } else if (this.s4finBeamActive && !this.s4finBeamDone) {
      this.prompt.setText("FINAL AUDIT · 빔이 내 행에 닿기 전 SPACE로 SELF HIDE");
    } else if (this.s4finVerdictLocked && !this.s4finUndone) {
      this.prompt.setText("Z로 IF UNDO · 흔적 제거 · LOCKED 판정은 유지");
    } else {
      this.prompt.setText("COMPARE ×2 → COPY/PASTE → IF → UNDO → SELF HIDE → V11");
    }
  }

  private interactSession4Final() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s4finCompareA) < 105 && !this.s4finRechargeA) {
      this.s4finRechargeA = true;
      this.calc = Math.min(9, this.calc + 2);
      this.s4finCompareAHi?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("E7", "=COMPARE_A() // +2");
      return;
    }
    if (distanceTo(this.s4finCompareB) < 105 && !this.s4finRechargeB) {
      this.s4finRechargeB = true;
      this.calc = Math.min(9, this.calc + 2);
      this.s4finCompareBHi?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("E3", "=COMPARE_B() // +2");
      return;
    }
    if (distanceTo(this.s4finOutbox) < 110 && !this.s4finSubmitted && this.s4finUndone) {
      this.s4finSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("V11", "=OUTBOX.SUBMIT(REVISION_VERDICT) // REVISION_ACCEPTED=FALSE");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("V11", "=SHEET.PASS(4,5)");
    }
  }

  private copySession4FinalForged() {
    if (!this.player || !this.s4finForged || this.s4finForgedCopied) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s4finForged) >= 110) return;
    this.s4finForgedCopied = true;
    this.s4finForgedHi?.setTint(0x79d6a5);
    this.s4finStatusLabel?.setText("CLIPBOARD = FORGED_APPROVAL · N7에 PASTE").setColor("#cfe7d2");
    useGameStore.getState().setSelectedCell("M3", "=COPY(FORGED_APPROVAL)");
  }

  private pasteSession4FinalForged() {
    if (!this.player || !this.s4finSlot || !this.s4finForgedCopied || this.s4finCompared) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s4finSlot) >= 110) return;
    if (this.calc < 2) return;
    this.calc -= 2;
    this.s4finCompared = true;
    this.s4finSlot?.setTint(0x79d6a5);
    this.s4finFieldsLabel
      ?.setText("ORIGINAL_CHAIN_VALID=TRUE · SIGNATURE_MISMATCH=TRUE · ACTUAL_EDITOR=AUDIT_SYSTEM")
      .setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("N7", "=PASTE(FORGED_APPROVAL) // COMPARE COMPLETE");
  }

  private undoSession4FinalIf() {
    if (!this.s4finIfInstalled || this.s4finUndone || !this.s4finVerdictLocked) return;
    if (this.calc < 3) return;
    this.calc -= 3;
    this.s4finUndone = true;
    this.s4finIfConsole?.clearTint().setTint(0x7fc7a5);
    this.s4finStatusLabel?.setText("UNDO(IF) · 거래 흔적 제거 · LOCKED 판정 유지").setColor("#bfe6c4");
    // The Auditor's last-ditch FULL ROW REVIEW begins.
    this.s4finBeamActive = true;
    this.s4finBeamDone = false;
    this.s4finBeamCounted = false;
    this.s4finBeamY = 52;
    this.s4finBeam?.setVisible(true).setY(52);
    this.s4finBeamLabel?.setVisible(true).setText("FINAL FULL ROW REVIEW · SELF HIDE로 회피").setColor("#ff9b88");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("Z1", "=UNDO(IF) // TRACE REMOVED · VERDICT LOCKED");
  }

  private trySelfHideFinal(time: number) {
    if (!this.isSession4Final() || !this.player) return;
    if (this.s4finHidden || this.calc < 1) return;
    this.calc -= 1;
    this.s4finHidden = true;
    this.s4finHideUntil = time + 5000;
    this.s4finSelfHideUsed = true;
    this.player.setAlpha(0.35);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
    useGameStore.getState().updateKeeper({ calc: this.calc, hideActive: true, hideRemaining: 5 });
    useGameStore.getState().setSelectedCell(this.cellAt(this.player.x, this.player.y), "=SELF_HIDE(MY_ROW) // FINAL AUDIT");
  }

  private updateSession4Sheet4Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (this.s4s4Hidden) {
      this.prompt.setText("SELF HIDE 중 · 이동/함수 불가 · 5초 뒤 복원");
    } else if (distanceTo(this.s4s4Terminal) < 105) {
      this.prompt.setText(this.s4s4Unlocked ? "D9 SELF HIDE 권한 활성 (SPACE)" : "E · D9 권한 단말기 연결 (자기 행 HIDE)");
    } else if (distanceTo(this.s4s4Log) < 100 && this.s4s4Log?.visible) {
      this.prompt.setText("E · R3 WITNESS_STATEMENT 회수");
    } else if (distanceTo(this.s4s4Outbox) < 110) {
      this.prompt.setText(
        this.s4s4LogSubmitted
          ? "S10 OUTBOX 제출 완료"
          : this.s4s4LogCarrying
            ? "E · S10 WITNESS_STATEMENT 제출"
            : "R3 증언을 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · S10→EXIT" : "EXIT 잠김 · S10 제출 필요");
    } else if (this.s4s4Unlocked) {
      this.prompt.setText("빔이 내 행에 닿기 전 SPACE로 자기 행 HIDE (CALC 1 · 5초)");
    } else {
      this.prompt.setText("D9 연결 → 빔 회피(SELF HIDE) → R3 → S10");
    }
  }

  private interactSession4Sheet4() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s4s4Terminal) < 105 && !this.s4s4Unlocked) {
      this.s4s4Unlocked = true;
      this.s4s4Highlight?.setTint(0x79d6a5);
      this.s4s4StatusLabel?.setText("SELF HIDE 권한 활성 · SPACE로 자기 행 HIDE").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("D9", "=CONNECT(SELF_HIDE_PERMISSION) // UNLOCKED");
      return;
    }
    if (distanceTo(this.s4s4Log) < 100 && this.s4s4Log?.visible) {
      this.s4s4LogCarrying = true;
      this.s4s4Log.setVisible(false);
      this.s4s4LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("R3", "=HANDS(WITNESS_STATEMENT)");
      return;
    }
    if (distanceTo(this.s4s4Outbox) < 110 && this.s4s4LogCarrying) {
      this.s4s4LogCarrying = false;
      this.s4s4LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("S10", "=OUTBOX.SUBMIT(WITNESS_STATEMENT)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("S10", "=SHEET.PASS(4,4)");
    }
  }

  private trySelfHide(time: number) {
    if (!this.isSession4Sheet4() || !this.player) return;
    if (!this.s4s4Unlocked || this.s4s4Hidden || this.calc < 1) return;
    this.calc -= 1;
    this.s4s4Hidden = true;
    this.s4s4HideUntil = time + 5000;
    this.s4s4SelfHideCount += 1;
    this.player.setAlpha(0.35);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
    this.s4s4StatusLabel?.setText(`SELF HIDE 실행 · 내 행 검사 제외 5초 · 사용 ${this.s4s4SelfHideCount}회`).setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ calc: this.calc, hideActive: true, hideRemaining: 5 });
    useGameStore.getState().setSelectedCell(this.cellAt(this.player.x, this.player.y), "=SELF_HIDE(MY_ROW) // 5s");
  }

  private updateSession4Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s4s3CompareTerminal) < 105) {
      this.prompt.setText(this.rechargeUsed ? "E8 COMPARE 완료 (CALC +2)" : "E · E8 COMPARE 연결 (CALC +2 · CURRENT/PREVIOUS)");
    } else if (distanceTo(this.s4s3IfConsole) < 115) {
      this.prompt.setText(
        this.s4s3IfInstalled
          ? (this.s4s3Undone ? "IF UNDO됨" : "IF 설치됨 · REVIEW 버튼으로 발동")
          : "SPACE · IF(REVIEW_BUTTON=TRUE,CABINET_07.REVISION_TAG) 설치",
      );
    } else if (distanceTo(this.s4s3ReviewButton) < 100) {
      this.prompt.setText(
        !this.s4s3IfInstalled
          ? "IF를 먼저 설치"
          : this.s4s3Reviewed
            ? (this.s4s3AuditDone ? "복구 완료 · Z로 IF UNDO" : "REVIEW 발동 · Auditor 복구 대기")
            : "E · REVIEW 버튼 (CABINET_07을 AUDIT_TARGET으로)",
      );
    } else if (this.s4s3Scanner && Phaser.Math.Distance.Between(this.player.x, this.player.y, 1080, 442) < 110) {
      this.prompt.setText("행 9 감사 스캐너 · SPACE로 ROW 9 HIDE 후 통과");
    } else if (distanceTo(this.s4s3Log) < 100 && this.s4s3Log?.visible) {
      this.prompt.setText(this.s4s3AuditDone ? "E · R3 PREVIOUS_FLOORPLAN 회수" : "H6 통로 개방 후 접근 가능");
    } else if (distanceTo(this.s4s3Outbox) < 110) {
      this.prompt.setText(
        this.s4s3LogSubmitted
          ? "R10 OUTBOX 제출 완료"
          : this.s4s3LogCarrying
            ? (this.s4s3Undone ? "E · R10 PREVIOUS_FLOORPLAN 제출" : "먼저 Z로 IF UNDO")
            : "R3 로그를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R10→EXIT" : "EXIT 잠김 · R10 제출 필요");
    } else if (this.s4s3AuditDone && !this.s4s3Undone) {
      this.prompt.setText("복구 완료 · Z로 IF UNDO (외부 사건이라 캐비닛은 K5 유지)");
    } else {
      this.prompt.setText("E8 +2 → IF 설치 → REVIEW → Z UNDO → ROW 9 HIDE → R3 → R10");
    }
  }

  private interactSession4Sheet3() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s4s3CompareTerminal) < 105 && !this.rechargeUsed) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.s4s3CompareHighlight?.setTint(0x79d6a5);
      this.s4s3StatusLabel?.setText("COMPARE · CABINET_07 CURRENT=H6 / PREVIOUS=K5").setColor("#cfe7d2");
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("E8", "=COMPARE(CABINET_07) // +2 · H6→K5");
      return;
    }
    if (
      distanceTo(this.s4s3ReviewButton) < 100
      && this.s4s3IfInstalled
      && !this.s4s3Reviewed
    ) {
      this.s4s3Reviewed = true;
      this.s4s3AuditUntil = this.time.now + 6000;
      this.s4s3AuditLastSecond = -1;
      this.s4s3ReviewHighlight?.setTint(0x79d6a5);
      this.s4s3StatusLabel?.setText("REVIEW=TRUE · CABINET_07이 AUDIT_TARGET").setColor("#cfe7d2");
      useGameStore.getState().setSelectedCell("G4", "=REVIEW_BUTTON=TRUE // AUDIT_TARGET=CABINET_07");
      return;
    }
    if (distanceTo(this.s4s3Log) < 100 && this.s4s3Log?.visible && this.s4s3AuditDone) {
      this.s4s3LogCarrying = true;
      this.s4s3Log.setVisible(false);
      this.s4s3LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("R3", "=HANDS(PREVIOUS_FLOORPLAN)");
      return;
    }
    if (distanceTo(this.s4s3Outbox) < 110 && this.s4s3LogCarrying && this.s4s3Undone) {
      this.s4s3LogCarrying = false;
      this.s4s3LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("R10", "=OUTBOX.SUBMIT(PREVIOUS_FLOORPLAN)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("S10", "=SHEET.PASS(4,3)");
    }
  }

  private undoSession4Sheet3If() {
    if (!this.s4s3IfInstalled || this.s4s3Undone || !this.s4s3AuditDone) return;
    if (this.calc < 3) return;
    this.calc -= 3;
    this.s4s3Undone = true;
    this.s4s3IfConsole?.clearTint().setTint(0x7fc7a5);
    this.s4s3StatusLabel?.setText("UNDO(IF) · 마지막 거래 제거 · 캐비닛은 K5 유지").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("Z1", "=UNDO(IF) // CABINET REMAINS AT K5");
  }

  private updateSession4Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s4s2IfConsole) < 115) {
      this.prompt.setText(
        this.s4s2IfInstalled
          ? "IF 설치됨 · L5 개방 · L5가 AUDIT_TARGET"
          : "SPACE · IF(BADGE_SENSOR=TRUE,DOOR_L5.OPEN) 즉시 설치",
      );
    } else if (distanceTo(this.s4s2BadgeSensor) < 100) {
      this.prompt.setText("BADGE_SENSOR = TRUE (이미 참)");
    } else if (distanceTo(this.s4s2Box) < 100 && !this.s4s2Pasted) {
      this.prompt.setText(this.s4s2BoxCopied ? "D3 서류 상자 COPY됨" : "C · D3 빈 서류 상자 COPY");
    } else if (
      this.s4s2DecoyCell
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, 560, 200) < 100
    ) {
      this.prompt.setText(
        !this.s4s2BoxCopied
          ? "D3 상자를 먼저 COPY"
          : this.s4s2Pasted
            ? "D4 미끼 PASTE됨 · AUDIT_TARGET 이전"
            : this.s4s2AuditTarget === "L5"
              ? "V · D4에 PASTE (AUDIT_TARGET을 미끼로 이전)"
              : "L5 개방 후 6초 안에 D4에 PASTE",
      );
    } else if (distanceTo(this.s4s2Index) < 100 && this.s4s2Index?.visible) {
      this.prompt.setText(this.s4s2DoorOpen ? "E · P3 REVISION_INDEX 회수" : "L5 개방 유지 필요");
    } else if (distanceTo(this.s4s2Outbox) < 110) {
      this.prompt.setText(
        this.s4s2IndexSubmitted
          ? "Q9 OUTBOX 제출 완료"
          : this.s4s2IndexCarrying
            ? "E · Q9 REVISION_INDEX 제출"
            : "P3 인덱스를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · Q9→EXIT" : "EXIT 잠김 · Q9 제출 필요");
    } else {
      this.prompt.setText("D3 COPY → IF(L5 open) → 6초 내 D4 PASTE → 미끼 복구 → P3 → Q9");
    }
  }

  private interactSession4Sheet2() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s4s2Index) < 100 && this.s4s2Index?.visible && this.s4s2DoorOpen) {
      this.s4s2IndexCarrying = true;
      this.s4s2Index.setVisible(false);
      this.s4s2IndexHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("P3", "=HANDS(REVISION_INDEX)");
      return;
    }
    if (distanceTo(this.s4s2Outbox) < 110 && this.s4s2IndexCarrying) {
      this.s4s2IndexCarrying = false;
      this.s4s2IndexSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("Q9", "=OUTBOX.SUBMIT(REVISION_INDEX)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R9", "=SHEET.PASS(4,2)");
    }
  }

  private copySession4Sheet2Box() {
    if (!this.player || !this.s4s2Box || this.s4s2BoxCopied) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.s4s2Box) >= 110) return;
    this.s4s2BoxCopied = true;
    this.s4s2BoxHighlight?.setTint(0x79d6a5);
    this.s4s2StatusLabel?.setText("CLIPBOARD = DOCUMENT_BOX · D4에 PASTE 대기").setColor("#cfe7d2");
    useGameStore.getState().setSelectedCell("D3", "=COPY(DOCUMENT_BOX)");
  }

  private pasteSession4Sheet2Box() {
    if (!this.player || this.s4s2Pasted || !this.s4s2BoxCopied || !this.s4s2DoorOpen) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 560, 200) >= 110) return;
    if (this.calc < 2) return;
    this.calc -= 2;
    this.s4s2Pasted = true;
    this.s4s2DecoyBox = this.add.image(560, 178, "office-ref-filingCabinet")
      .setDisplaySize(58, 66).setDepth(8);
    // AUDIT_TARGET transfers from the door to the freshly changed decoy; the timer keeps running.
    this.s4s2AuditTarget = "D4";
    this.s4s2AuditLastSecond = -1;
    this.s4s2StatusLabel?.setText("PASTE(D4) · AUDIT_TARGET L5→D4 이전").setColor("#cfe7d2");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("D4", "=PASTE(DOCUMENT_BOX) // AUDIT_TARGET=D4");
  }

  private copyContextObject() {
    if (this.isSession1Sheet3()) this.copySheet3Badge();
    if (this.isSession1Sheet4()) this.copySheet4Object();
    if (this.isSession1Final()) this.copyFinalProjectBonus();
    if (this.isSession4Sheet1()) this.copySession4Sheet1Cart();
    if (this.isSession4Sheet2()) this.copySession4Sheet2Box();
    if (this.isSession4Final()) this.copySession4FinalForged();
    if (this.isSession6Sheet1()) this.copySession6Sheet1Box();
    if (this.isSession6Sheet3()) this.copySession6Sheet3Token();
    if (this.isSession6Sheet4()) this.copySession6Sheet4Template();
  }

  private pasteContextObject() {
    if (this.isSession1Sheet3()) this.pasteSheet3Badge();
    if (this.isSession1Sheet4()) this.pasteSheet4Object();
    if (this.isSession1Final()) this.pasteFinalProjectBonus();
    if (this.isSession4Sheet1()) this.pasteSession4Sheet1Cart();
    if (this.isSession4Sheet2()) this.pasteSession4Sheet2Box();
    if (this.isSession4Final()) this.pasteSession4FinalForged();
    if (this.isSession6Sheet1()) this.pasteSession6Sheet1Box();
    if (this.isSession6Sheet3()) this.pasteSession6Sheet3Token();
    if (this.isSession6Sheet4()) this.pasteSession6Sheet4Template();
  }

  private undoContextObject() {
    if (this.isSession4Sheet1()) this.undoSession4Sheet1Paste();
    if (this.isSession4Sheet3()) this.undoSession4Sheet3If();
    if (this.isSession4Final()) this.undoSession4FinalIf();
  }

  private copySheet3Badge() {
    if (!this.isSession1Sheet3() || !this.player || !this.sheet3LeaderBadge) return;
    if (!this.copyPasteUnlocked || this.leaderBadgeCopied) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.sheet3LeaderBadge) >= 320) return;
    this.leaderBadgeCopied = true;
    this.sheet3BadgeHighlight?.setTint(0x79d6a5);
    useGameStore.getState().setSelectedCell("H3", "=COPY(TEAM_LEADER_BADGE)");
  }

  private pasteSheet3Badge() {
    if (!this.isSession1Sheet3() || !this.player || !this.sheet3PasteStation) return;
    if (!this.copyPasteUnlocked || !this.leaderBadgeCopied || this.duplicateBadgeEquipped) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.sheet3PasteStation) >= 105) return;
    this.duplicateBadgeEquipped = true;
    this.originalBadgeRestored = false;
    this.sheet3PasteStation.setTint(0x79d6a5);
    this.sheet3SecurityDoor?.setTexture("office-ref-exitOpen");
    const doorBody = this.arcadeBody(this.sheet3SecurityDoorBody!);
    if (doorBody) doorBody.enable = false;
    useGameStore.getState().updateKeeper({ terminalChecked: true });
    useGameStore.getState().setSelectedCell("G8", "=PASTE(TEAM_LEADER_BADGE_DUPLICATE)");
  }

  private copySheet4Object() {
    if (!this.isSession1Sheet4() || !this.player) return;
    const printerDistance = this.sheet4Printer
      ? Phaser.Math.Distance.BetweenPoints(this.player, this.sheet4Printer)
      : Number.POSITIVE_INFINITY;
    const cabinetDistance = this.sheet4Cabinet
      ? Phaser.Math.Distance.BetweenPoints(this.player, this.sheet4Cabinet)
      : Number.POSITIVE_INFINITY;
    if (printerDistance < 105 && !this.sheet4PrinterDuplicated) {
      this.sheet4Clipboard = "printer";
      this.sheet4Printer?.setTint(0x9bd6ad);
      useGameStore.getState().setSelectedCell("G8", "=COPY(BROKEN_PRINTER)");
    } else if (cabinetDistance < 105 && !this.sheet4CabinetDuplicated) {
      this.sheet4Clipboard = "cabinet";
      this.sheet4Cabinet?.setTint(0x9bbfd6);
      useGameStore.getState().setSelectedCell("E7", "=COPY(MOBILE_CABINET)");
    }
  }

  private pasteSheet4Object() {
    if (!this.isSession1Sheet4() || !this.player) return;
    const printerTargetDistance = this.sheet4PrinterTarget
      ? Phaser.Math.Distance.BetweenPoints(this.player, this.sheet4PrinterTarget)
      : Number.POSITIVE_INFINITY;
    const cabinetTargetDistance = this.sheet4CabinetTarget
      ? Phaser.Math.Distance.BetweenPoints(this.player, this.sheet4CabinetTarget)
      : Number.POSITIVE_INFINITY;
    if (
      this.sheet4Clipboard === "printer" &&
      !this.sheet4PrinterDuplicated &&
      printerTargetDistance < 115
    ) {
      this.sheet4PrinterDuplicated = true;
      this.sheet4Clipboard = null;
      this.sheet4PrinterTarget?.setVisible(false);
      this.add.image(1000, 390, "office-ref-copier")
        .setDisplaySize(70, 88).setTint(0x9bd6ad).setDepth(8);
      useGameStore.getState().setSelectedCell("M8", "=PASTE(BROKEN_PRINTER) // FACILITIES");
      this.dispatchSheet4Facilities();
      return;
    }
    if (
      this.sheet4Clipboard === "cabinet" &&
      !this.sheet4CabinetDuplicated &&
      cabinetTargetDistance < 270
    ) {
      this.sheet4CabinetDuplicated = true;
      this.sheet4Clipboard = null;
      this.sheet4CabinetTarget?.setVisible(false);
      this.add.image(840, 182, "office-ref-filingCabinet")
        .setDisplaySize(66, 74).setTint(0x9bbfd6).setDepth(8);
      this.disableSheet4Cctv();
      useGameStore.getState().setSelectedCell("K4", "=PASTE(MOBILE_CABINET) // CCTV BLOCKED");
    }
  }

  private dispatchSheet4Facilities() {
    const destinations = [
      { x: 820, y: 390 },
      { x: 900, y: 390 },
    ];
    this.sheet4Facilities.forEach((worker, index) => {
      this.tweens.add({
        targets: worker,
        x: destinations[index].x,
        y: destinations[index].y,
        duration: 1500 + index * 180,
        ease: "Sine.InOut",
      });
    });
    this.time.delayedCall(1900, () => this.openSheet4AdminDoor("FACILITIES_TASK"));
  }

  private disableSheet4Cctv() {
    this.sheet4CctvDisabled = true;
    for (const cctv of this.sheet4Cctvs) cctv.setTint(0x70867f).setAlpha(0.46);
  }

  private openSheet4AdminDoor(reason: "EMERGENCY_RELEASE" | "FACILITIES_TASK") {
    if (this.sheet4AdminDoorOpen) return;
    this.sheet4AdminDoorOpen = true;
    this.sheet4AdminDoor?.setTexture("office-ref-exitOpen");
    const body = this.sheet4AdminDoorBody ? this.arcadeBody(this.sheet4AdminDoorBody) : undefined;
    if (body) body.enable = false;
    this.sheet4EmergencyRelease?.setTint(0x79d6a5);
    useGameStore.getState().setSelectedCell(
      "L6",
      `=DOOR.OPEN(${reason})`,
    );
  }

  private copyFinalProjectBonus() {
    if (!this.isSession1Final() || !this.player || !this.finalProjectBonus) return;
    if (this.finalBonusCopied || this.time.now < this.finalBonusLockedUntil) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.finalProjectBonus) >= 110) return;
    this.finalBonusCopied = true;
    this.finalProjectHighlight?.setTint(0x79d6a5);
    useGameStore.getState().setSelectedCell("F3", "=COPY(PROJECT_BONUS,+18)");
  }

  private pasteFinalProjectBonus() {
    if (!this.isSession1Final() || !this.player || !this.finalBorrowTarget) return;
    if (!this.finalBonusCopied || this.finalBonusPasted) return;
    if (this.time.now < this.finalBonusLockedUntil) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.finalBorrowTarget) >= 115) return;
    this.finalBonusPasted = true;
    this.finalBorrowTarget.setVisible(false);
    this.finalBorrowedResult = this.add.image(1160, 286, "office-ref-approvalDocument")
      .setDisplaySize(46, 54).setTint(0x79d6a5).setDepth(10);
    useGameStore.getState().setSelectedCell("O6", "=PASTE(PROJECT_BONUS,+18)");
    this.updateFinalScoreDisplay();
  }

  private currentFinalScore() {
    const penaltyHidden = this.hideUntil > this.time.now
      && this.activeHideTargets.some((target) => target.targetKey === "ROW_5");
    return 42 + (penaltyHidden ? 15 : 0) + (this.finalBonusPasted ? 18 : 0) - this.finalWorkPenalty;
  }

  private updateFinalScoreDisplay() {
    if (!this.finalScoreLabel) return;
    if (this.terminalChecked) {
      this.finalScoreLabel.setText("STORED SCORE 75+ · PASS").setColor("#28734f");
      return;
    }
    const score = this.currentFinalScore();
    this.finalScoreLabel
      .setText(`EVALUATION ${score} / 70`)
      .setColor(score >= 70 ? "#28734f" : "#8b4a42");
  }

  private setEditMode(active: boolean) {
    if (active && this.isSession2Sheet1()) {
      if (
        !this.player ||
        !this.s2s1SortStation ||
        !this.s2s1SortUnlocked ||
        this.s2s1QueueValid ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2s1SortStation) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.formulaTitle?.setText("CELL EDIT MODE · SORT RANGE");
      this.previewArmed = false;
      this.s2s1SortPreviewed = false;
      this.formulaLabel?.setText("fx  =SORT(F3:J3, RANK, ASC)");
      this.inspectionLabel
        ?.setText("F3:J3 · ROWS 5 · STABLE ORDER REQUIRED")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\nSPACE 편집 취소");
      useGameStore.getState().setSelectedCell("F7", "=SORT(F3:J3,RANK,ASC)");
      return;
    }
    if (active && this.isSession2Sheet2()) {
      if (
        !this.player ||
        !this.s2s2SortStation ||
        this.s2s2QueueValid ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2s2SortStation) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.formulaTitle?.setText("CELL EDIT MODE · DEPARTMENT SORT");
      this.previewArmed = false;
      this.s2s2SortPreviewed = false;
      this.formulaLabel?.setText("fx  =SORT(F3:H4, DEPARTMENT_CODE, ASC)");
      this.inspectionLabel
        ?.setText("F3:H4 · ROWS 6 · HR + SECURITY STABLE ORDER")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\nSPACE 편집 취소");
      useGameStore.getState().setSelectedCell("E7", "=SORT(F3:H4,DEPARTMENT_CODE,ASC)");
      return;
    }
    if (active && this.isSession2Sheet3()) {
      if (
        !this.player ||
        !this.s2s3FilterStation ||
        !this.s2s3FilterUnlocked ||
        this.s2s3FilterActive ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2s3FilterStation) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.formulaTitle?.setText("CELL EDIT MODE · CLEARANCE FILTER");
      this.previewArmed = false;
      this.s2s3FilterPreviewed = false;
      this.formulaLabel?.setText("fx  =FILTER(F3:J6, CLEARANCE>=2)");
      this.inspectionLabel
        ?.setText("F3:J6 · KEEP CLEARANCE 2+ · DYNAMIC RANGE")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\n8초 유지 · 새 행 자동 재평가 · SPACE 취소");
      useGameStore.getState().setSelectedCell("H7", "=FILTER(F3:J6,CLEARANCE>=2)");
      return;
    }
    if (active && this.isSession2Sheet4()) {
      if (
        !this.player ||
        !this.s2s4WriteConsole ||
        !this.s2s4WriteUnlocked ||
        this.s2s4Sorted ||
        this.time.now >= this.s2s4WriteUntil ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2s4WriteConsole) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (!this.s2s4Filtered) {
        this.formulaTitle?.setText("CELL EDIT MODE · QUEUE FILTER");
        this.s2s4FilterPreviewed = false;
        this.formulaLabel?.setText('fx  =FILTER(TASK_QUEUE, ROLE="TEAM_LEADER")');
        this.inspectionLabel
          ?.setText("F3:H6 · KEEP TEAM_LEADER · DROP FACILITIES")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\nSPACE 편집 취소");
        useGameStore.getState().setSelectedCell("F7", '=FILTER(TASK_QUEUE,ROLE="TEAM_LEADER")');
      } else {
        this.formulaTitle?.setText("CELL EDIT MODE · PRIORITY SORT");
        this.s2s4SortPreviewed = false;
        this.formulaLabel?.setText("fx  =SORT(TASK_QUEUE, PRIORITY, ASC)");
        this.inspectionLabel
          ?.setText("F3:H5 · LOW PRIORITY FIRST · STABLE ORDER")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 2\nSPACE 편집 취소");
        useGameStore.getState().setSelectedCell("G7", "=SORT(TASK_QUEUE,PRIORITY,ASC)");
      }
      return;
    }
    if (active && this.isSession2Final()) {
      if (
        !this.player ||
        !this.s2fAuditStation ||
        this.s2fSorted ||
        this.s2fSubmitted ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2fAuditStation) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (!this.s2fFiltered) {
        this.formulaTitle?.setText("CELL EDIT MODE · AUDIT FILTER");
        this.s2fFilterPreviewed = false;
        this.formulaLabel?.setText('fx  =FILTER(AUDIT_ROWS, DATE="TODAY")');
        this.inspectionLabel
          ?.setText("L2:P7 · DROP YESTERDAY · KEEP 6 ROWS")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n8초 창 시작 · SPACE 편집 취소");
        useGameStore.getState().setSelectedCell("M7", '=FILTER(AUDIT_ROWS,DATE="TODAY")');
      } else {
        this.formulaTitle?.setText("CELL EDIT MODE · SAMPLE SORT");
        this.s2fSortPreviewed = false;
        this.formulaLabel?.setText("fx  =SORT(AUDIT_ROWS, STATUS, ASC)");
        this.inspectionLabel
          ?.setText("COMPLIANT FIRST · PLAYER VIOLATION #6")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 2\nSPACE 편집 취소");
        useGameStore.getState().setSelectedCell("M7", "=SORT(AUDIT_ROWS,STATUS,ASC)");
      }
      return;
    }
    if (active && this.isSession3Sheet1()) {
      if (
        !this.player ||
        !this.s3s1InstallConsole ||
        !this.s3s1IfUnlocked ||
        this.s3s1IfInstalled ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s3s1InstallConsole) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s3s1IfPreviewed = false;
      this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF");
      this.formulaLabel?.setText("fx  =IF(EMPLOYEE_A.IN(G4), DOOR_K5.OPEN)");
      this.inspectionLabel
        ?.setText("H7 · CURRENT RESULT=FALSE / WAITING")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\nFALSE 상태로 설치 · SPACE 취소");
      useGameStore.getState().setSelectedCell("H7", "=IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN)");
      return;
    }
    if (active && this.isSession3Sheet2()) {
      const nearA = !!this.s3s2ConsoleA
        && !this.s3s2If1Installed
        && Phaser.Math.Distance.BetweenPoints(this.player!, this.s3s2ConsoleA) < 115;
      const nearB = !!this.s3s2ConsoleB
        && this.s3s2If1Installed
        && !this.s3s2If2Installed
        && Phaser.Math.Distance.BetweenPoints(this.player!, this.s3s2ConsoleB) < 115;
      if (!this.player || (!nearA && !nearB)) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (nearA) {
        this.s3s2If1Previewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (IMMEDIATE)");
        this.formulaLabel?.setText('fx  =IF(PRINTER_F4.STATUS="JAMMED", DOOR_H5.OPEN)');
        this.inspectionLabel
          ?.setText("F7 · PRINTER_F4=JAMMED · RESULT=TRUE / EXECUTE NOW")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n즉시 H5 개방 · SPACE 취소");
        useGameStore.getState().setSelectedCell("F7", '=IF(PRINTER_F4.STATUS="JAMMED",DOOR_H5.OPEN)');
      } else {
        this.s3s2If2Previewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (DELAYED)");
        this.formulaLabel?.setText("fx  =IF(FACILITIES_A.IN(L4), DOOR_N5.OPEN)");
        this.inspectionLabel
          ?.setText("L7 · FACILITIES_A @ K3 · RESULT=FALSE / WAITING")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n수리 호출로 발동 · SPACE 취소");
        useGameStore.getState().setSelectedCell("L7", "=IF(FACILITIES_A.IN(L4),DOOR_N5.OPEN)");
      }
      return;
    }
    if (active && this.isSession3Sheet3()) {
      const nearConsole = !!this.s3s3IfConsole
        && !this.s3s3IfInstalled
        && !!this.player
        && Phaser.Math.Distance.BetweenPoints(this.player, this.s3s3IfConsole) < 115;
      if (nearConsole) {
        this.s3s3IfEditing = true;
        this.editMode = true;
        this.formulaPanel?.setVisible(true);
        this.columnSelection?.setVisible(false);
        this.previewArmed = false;
        this.s3s3IfPreviewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (WAITING)");
        this.formulaLabel?.setText("fx  =IF(DOCUMENT.IN(J4), DOOR_L5.OPEN_FOR(3))");
        this.inspectionLabel
          ?.setText("G7 · DOCUMENT @ F4 · RESULT=FALSE / WAITING")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n설치 시 컨베이어 시작 · SPACE 취소");
        useGameStore.getState().setSelectedCell("G7", "=IF(DOCUMENT.IN(J4),DOOR_L5.OPEN_FOR(3))");
        return;
      }
      // Not at the IF console: fall through to the standard ROW/COLUMN HIDE selection.
      this.s3s3IfEditing = false;
    }
    if (active && this.isSession3Sheet4()) {
      if (
        !this.player ||
        !this.s3s4IfConsole ||
        this.s3s4IfInstalled ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s3s4IfConsole) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s3s4IfPreviewed = false;
      this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (COUNTIF)");
      this.formulaLabel?.setText("fx  =IF(COUNTIF(MEETING_ROOM,OPERATIONS)>=4, DOOR_N6.OPEN)");
      this.inspectionLabel
        ?.setText("J7 · MEETING_ROOM COUNT=0 · RESULT=FALSE / WAITING")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\nMACRO 회의 소집으로 발동 · SPACE 취소");
      useGameStore.getState().setSelectedCell("J7", "=IF(COUNTIF(MEETING_ROOM,OPERATIONS)>=4,DOOR_N6.OPEN)");
      return;
    }
    if (active && this.isSession3Final()) {
      const nearSwitch = !!this.s3finSwitch
        && this.s3finLinked
        && this.s3finRouteReady
        && !this.s3finIf1Installed
        && !!this.player
        && Phaser.Math.Distance.BetweenPoints(this.player, this.s3finSwitch) < 115;
      const nearLoop = !!this.s3finLoopCell
        && this.s3finLinked
        && this.s3finIf1Installed
        && !this.s3finIf2Installed
        && !!this.player
        && Phaser.Math.Distance.BetweenPoints(this.player, this.s3finLoopCell) < 115;
      if (!this.player || (!nearSwitch && !nearLoop)) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (nearSwitch) {
        this.s3finIf1Previewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF#1 (SHUTDOWN)");
        this.formulaLabel?.setText("fx  =IF(ROUTE_READY=TRUE, AUTOMATION_ENABLED.FALSE)");
        this.inspectionLabel
          ?.setText("Q3 · ROUTE_READY=TRUE · 새 업무 복제 중단")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\nPENDING 2초마다 완료 · SPACE 취소");
        useGameStore.getState().setSelectedCell("Q3", "=IF(ROUTE_READY=TRUE,AUTOMATION_ENABLED.FALSE)");
      } else {
        this.s3finIf2Previewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF#2 (LOOP RESET)");
        this.formulaLabel?.setText("fx  =IF(PENDING_TASKS=0, LOOP_DEPTH.RESET_TO_0)");
        this.inspectionLabel
          ?.setText("R3 · PENDING_TASKS=0 시 LOOP_DEPTH 0")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\nSPACE 편집 취소");
        useGameStore.getState().setSelectedCell("R3", "=IF(PENDING_TASKS=0,LOOP_DEPTH.RESET_TO_0)");
      }
      return;
    }
    if (active && this.isSession4Sheet2()) {
      if (
        !this.player ||
        !this.s4s2IfConsole ||
        this.s4s2IfInstalled ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s4s2IfConsole) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s4s2IfPreviewed = false;
      this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (IMMEDIATE)");
      this.formulaLabel?.setText("fx  =IF(BADGE_SENSOR=TRUE, DOOR_L5.OPEN)");
      this.inspectionLabel
        ?.setText("BADGE_SENSOR=TRUE · RESULT=TRUE / EXECUTE NOW")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n즉시 L5 개방 · L5가 AUDIT_TARGET · SPACE 취소");
      useGameStore.getState().setSelectedCell("F5", "=IF(BADGE_SENSOR=TRUE,DOOR_L5.OPEN)");
      return;
    }
    if (active && this.isSession4Sheet3()) {
      const nearConsole = !!this.s4s3IfConsole
        && !this.s4s3IfInstalled
        && !!this.player
        && Phaser.Math.Distance.BetweenPoints(this.player, this.s4s3IfConsole) < 115;
      if (nearConsole) {
        this.s4s3IfEditing = true;
        this.editMode = true;
        this.formulaPanel?.setVisible(true);
        this.columnSelection?.setVisible(false);
        this.previewArmed = false;
        this.s4s3IfPreviewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (REVISION TAG)");
        this.formulaLabel?.setText("fx  =IF(REVIEW_BUTTON=TRUE, CABINET_07.REVISION_TAG)");
        this.inspectionLabel
          ?.setText("REVIEW_BUTTON=FALSE · RESULT=FALSE / WAITING")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\nREVIEW 버튼으로 발동 · SPACE 취소");
        useGameStore.getState().setSelectedCell("F4", "=IF(REVIEW_BUTTON=TRUE,CABINET_07.REVISION_TAG)");
        return;
      }
      // Not at the IF console: fall through to the standard ROW/COLUMN HIDE selection.
      this.s4s3IfEditing = false;
    }
    if (active && this.isSession4Final()) {
      if (
        !this.player ||
        !this.s4finIfConsole ||
        this.s4finIfInstalled ||
        !this.s4finCompared ||
        this.s4finBeamActive ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s4finIfConsole) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s4finIfPreviewed = false;
      this.formulaTitle?.setText("CELL EDIT MODE · FINAL VERDICT IF");
      this.formulaLabel?.setText("fx  =IF(AND(CHAIN_VALID,SIG_MISMATCH,EDITOR=AUDIT_SYSTEM), REVISION_ACCEPTED.FALSE)");
      this.inspectionLabel
        ?.setText("AND(TRUE,TRUE,TRUE) · RESULT=TRUE / SIGN & LOCK")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n외부 서버가 판정 서명·LOCK · SPACE 취소");
      useGameStore.getState().setSelectedCell("N9", "=IF(AND(...),REVISION_ACCEPTED.FALSE)");
      return;
    }
    if (active && this.isSession5Sheet1()) {
      if (!this.s5s1Unlocked || this.s5s1NameError || this.s5s1Damage >= 85) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s5s1NamePreviewed = false;
      this.formulaTitle?.setText("ERROR SLOT · #NAME? (SELF)");
      this.formulaLabel?.setText("fx  =#NAME?(SELF)");
      this.inspectionLabel
        ?.setText(`손상도 ${this.s5s1Damage} → ${this.s5s1Damage + 15} · 파일 충돌 85 · CALC 미소비`)
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · NAME/DEPT/CLEARANCE 10초 공백\nSPACE 취소");
      useGameStore.getState().setSelectedCell("D8", "=#NAME?(SELF)");
      return;
    }
    if (active && this.isSession5Sheet2()) {
      if (
        !this.player ||
        !this.s5s2Shutter ||
        !this.s5s2Unlocked ||
        this.s5s2Frozen ||
        this.s5s2Damage >= 85 ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s5s2Shutter) >= 160
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s5s2DivPreviewed = false;
      this.formulaTitle?.setText("ERROR SLOT · #DIV/0! (H4:J6)");
      this.formulaLabel?.setText("fx  =#DIV/0!(H4:J6)");
      this.inspectionLabel
        ?.setText(`SHUTTER ${this.s5s2ShutterOpen ? "OPEN" : "CLOSED"} · 손상도 ${this.s5s2Damage}→${this.s5s2Damage + 20} · 5초 정지`)
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 미소비\nSHUTTER/CCTV/ARM 5초 정지 · SPACE 취소");
      useGameStore.getState().setSelectedCell("H4", "=#DIV/0!(H4:J6)");
      return;
    }
    if (active && this.isSession5Sheet3()) {
      if (
        !this.player ||
        !this.s5s3Box ||
        !this.s5s3Unlocked ||
        this.s5s3BoxEmployee ||
        this.s5s3Damage >= 85 ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s5s3Box) >= 150
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s5s3ValuePreviewed = false;
      this.formulaTitle?.setText("ERROR SLOT · #VALUE! (F5)");
      this.formulaLabel?.setText("fx  =#VALUE!(EMPLOYEE_C3, ARCHIVE_BOX_07)");
      this.inspectionLabel
        ?.setText(`F5 TYPE→EMPLOYEE 8초 · 손상도 ${this.s5s3Damage}→${this.s5s3Damage + 20} · CALC 미소비`)
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · headcount 2·VP 미끼\nSPACE 편집 취소");
      useGameStore.getState().setSelectedCell("F5", "=#VALUE!(EMPLOYEE_C3,ARCHIVE_BOX_07)");
      return;
    }
    if (active && this.isSession5Sheet4()) {
      if (!this.player || this.s5s4RelayDeleted || !this.s5s4Unlocked || this.s5s4Damage >= 85) return;
      const dRelay = this.s5s4Relay
        ? Phaser.Math.Distance.BetweenPoints(this.player, this.s5s4Relay) : Number.POSITIVE_INFINITY;
      const dServer = this.s5s4Server
        ? Phaser.Math.Distance.BetweenPoints(this.player, this.s5s4Server) : Number.POSITIVE_INFINITY;
      if (dRelay >= 150 && dServer >= 150) return;
      this.s5s4RefTarget = dRelay <= dServer ? "relay" : "server";
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s5s4RefPreviewed = false;
      this.formulaTitle?.setText("ERROR SLOT · #REF! (DELETE)");
      if (this.s5s4RefTarget === "relay") {
        this.formulaLabel?.setText("fx  =#REF!(ROW_LOCK_RELAY)");
        this.inspectionLabel
          ?.setText(`TARGET ROW_LOCK_RELAY · DELETABLE · LOCKED=FALSE · 손상도 +25`)
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · J6/N5/Q7 FAIL OPEN\n영구 삭제(UNDO 불가) · SPACE 취소");
        useGameStore.getState().setSelectedCell("D10", "=#REF!(ROW_LOCK_RELAY)");
      } else {
        this.formulaLabel?.setText("fx  =#REF!(BACKUP_SERVER)");
        this.inspectionLabel
          ?.setText("TARGET BACKUP_SERVER · REFUSE · LOCKED=TRUE")
          .setColor("#d88a8a");
        this.executeLabel?.setText("삭제 거부 · LOCKED 대상 · CALC/손상도 미소비\nSPACE 취소");
        useGameStore.getState().setSelectedCell("D10", "=#REF!(BACKUP_SERVER) // REFUSE");
      }
      return;
    }
    if (active && this.isSession5Final()) {
      const near = (obj?: Phaser.GameObjects.Image, r = 120) => !!obj && !!this.player
        && Phaser.Math.Distance.BetweenPoints(this.player, obj) < r;
      const wantName = near(this.s5finErrorTerminal, 115) && this.s5finErrorUnlocked
        && !this.s5finNameError && !this.s5finFirstReviewPassed && this.s5finDamage < 85;
      const wantFilter = near(this.s5finCompareTerminal, 120) && this.s5finFirstReviewPassed
        && !this.s5finFilterConfirmed && this.calc >= 3;
      const wantRef = near(this.s5finPointer, 125) && this.s5finFilterConfirmed
        && !this.s5finPointerDeleted && this.s5finDamage < 85;
      if (!wantName && !wantFilter && !wantRef) return;
      this.s5finEditTarget = wantName ? "name" : wantFilter ? "filter" : "ref";
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s5finEditPreviewed = false;
      if (this.s5finEditTarget === "name") {
        this.formulaTitle?.setText("ERROR SLOT · #NAME? (SELF DEFENSE)");
        this.formulaLabel?.setText("fx  =#NAME?(SELF)");
        this.inspectionLabel?.setText(`NAME/DEPARTMENT 검색 제외 10초 · 손상도 ${this.s5finDamage}→${this.s5finDamage + 15}`).setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · VP 첫 심사 방어\nSPACE 취소");
      } else if (this.s5finEditTarget === "filter") {
        this.formulaTitle?.setText("CELL EDIT MODE · CANONICAL FILTER");
        this.formulaLabel?.setText("fx  =FILTER(EMPLOYEE_COPIES, CANONICAL_MATCH=TRUE)");
        this.inspectionLabel?.setText("정본 1행만 남김 · 8초 안에 2초 검증 확정 · CALC 3").setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n확정 판정은 영구 · SPACE 취소");
      } else {
        this.formulaTitle?.setText("ERROR SLOT · #REF! (POINTER)");
        this.formulaLabel?.setText("fx  =#REF!(TERMINATION_POINTER)");
        this.inspectionLabel?.setText(`U3 UNLOCKED · 영구 삭제 · 손상도 ${this.s5finDamage}→${this.s5finDamage + 25}`).setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · TERMINATION_TARGET=#REF!\nSPACE 취소");
      }
      return;
    }
    if (active && this.isSession6Sheet1()) {
      const nearSort = this.s6s1Phase === 2 && !!this.s6s1SortStation && !!this.player
        && Phaser.Math.Distance.BetweenPoints(this.player, this.s6s1SortStation) < 120;
      if (nearSort) {
        this.s6s1SortEditing = true;
        this.editMode = true;
        this.formulaPanel?.setVisible(true);
        this.columnSelection?.setVisible(false);
        this.previewArmed = false;
        this.s6s1SortPreviewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · ACCESS_REQUEST SORT");
        this.formulaLabel?.setText("fx  =SORT(ACCESS_REQUESTS, REQUEST_ID, ASC)");
        this.inspectionLabel?.setText("H6:L9 RANGE · REQ_B(1) → REQ_C(2) → REQ_A(3)").setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 2\nROW 3 예외 범위 개방 · SPACE 취소");
        useGameStore.getState().setSelectedCell("H7", "=SORT(ACCESS_REQUESTS,REQUEST_ID,ASC)");
        return;
      }
      // Phase 3 uses the standard ROW/COLUMN HIDE selection; other phases: no edit.
      this.s6s1SortEditing = false;
      if (this.s6s1Phase !== 3) return;
    }
    if (active && this.isSession6Sheet2()) {
      if (
        !this.player ||
        !this.s6s2Sandbox ||
        !this.s6s2Linked ||
        this.s6s2Sorted ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s6s2Sandbox) >= 120
      ) return;
      this.s6s2EditTarget = this.s6s2IfInstalled ? "sort" : "if";
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (this.s6s2EditTarget === "if") {
        this.s6s2IfPreviewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · SANDBOX IF");
        this.formulaLabel?.setText("fx  =IF(EMPLOYEE_COUNT(J3:K3)>=2, DOOR_N5.OPEN)");
        this.inspectionLabel?.setText("E8:G10 · 원격 참조 LINKED · RESULT=FALSE / WAITING").setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n원격 SORT로 발동 · SPACE 취소");
        useGameStore.getState().setSelectedCell("E8", "=IF(EMPLOYEE_COUNT(J3:K3)>=2,DOOR_N5.OPEN)");
      } else {
        this.s6s2SortPreviewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · REMOTE SORT");
        this.formulaLabel?.setText("fx  =SORT(J3:K5, ACCESS_PRIORITY, ASC)");
        this.inspectionLabel?.setText("원격 J3:K5 · EMP_Y(1)→EMP_Z(2)→EMP_X(3)").setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 2\n상위 2명 센서 배치 → IF TRUE · SPACE 취소");
        useGameStore.getState().setSelectedCell("E8", "=SORT(J3:K5,ACCESS_PRIORITY,ASC)");
      }
      return;
    }
    if (active && this.isSession6Sheet3()) {
      if (!this.player || this.s6s3DraftKind !== "none" || (this.s6s3Phase !== 1 && this.s6s3Phase !== 2)) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (this.s6s3Phase === 1) {
        this.s6s3HidePreviewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · HIDE COLUMN F (DRAFT)");
        this.formulaLabel?.setText("fx  =HIDE(COLUMN_F)");
        this.inspectionLabel?.setText("버퍼 밖 · DRAFT 3초 후 복원 · CALC 환불 없음").setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\n3초 접힘 동안 통과 · SPACE 취소");
        useGameStore.getState().setSelectedCell("F1", "=HIDE(COLUMN_F)");
      } else {
        this.s6s3SortPreviewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · GUARD SORT (DRAFT)");
        this.formulaLabel?.setText("fx  =SORT(H4:K5, AUDIT_ORDER, ASC)");
        this.inspectionLabel?.setText("버퍼 밖 · DRAFT 3초 · 경비 상단 정렬로 하단 통로").setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 2\n3초 안에 하단 통로 통과 · SPACE 취소");
        useGameStore.getState().setSelectedCell("H4", "=SORT(H4:K5,AUDIT_ORDER,ASC)");
      }
      return;
    }
    if (active && this.isSession6Sheet4()) {
      if (!this.player || !this.s6s4Prepared) return;
      const nearBarrier = this.s6s4Barrier
        ? Phaser.Math.Distance.BetweenPoints(this.player, this.s6s4Barrier) < 150
        : false;
      const nearSlot = this.s6s4SaveSlot
        ? Phaser.Math.Distance.BetweenPoints(this.player, this.s6s4SaveSlot) < 130
        : false;
      if (!this.s6s4RowHidden && nearBarrier) {
        this.s6s4EditTarget = "row";
      } else if (this.s6s4Pasted && !this.s6s4IfInstalled && nearSlot) {
        this.s6s4EditTarget = "if";
      } else {
        return;
      }
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (this.s6s4EditTarget === "row") {
        this.formulaTitle?.setText("CELL EDIT MODE · HIDE ROW 8 (저장 보관소 장벽)");
        this.formulaLabel?.setText("fx  =HIDE(ROW_8)");
        this.inspectionLabel?.setText("ROW 8 장벽 · LOAD_LAST_FINAL 대상 · CALC 1").setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\n저장 보관소로 진입 · SPACE 취소");
        useGameStore.getState().setSelectedCell("A8", "=HIDE(ROW_8)");
      } else {
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (SAVE APPROVE)");
        this.formulaLabel?.setText("fx  =IF(N6.SIGNATURE_VALID=TRUE, SAVE_REQUEST.APPROVE)");
        this.inspectionLabel?.setText("N6 서명 유효 · 외부 권한 서버가 R3 KEY 서명").setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n즉시 TRUE → 덮어쓰기 정지 · SPACE 취소");
        useGameStore.getState().setSelectedCell("N7", "=IF(N6.SIGNATURE_VALID=TRUE,SAVE_REQUEST.APPROVE)");
      }
      return;
    }
    this.editMode = active;
    this.formulaPanel?.setVisible(active);
    this.columnSelection?.setVisible(active);
    this.previewArmed = false;
    if (active) {
      this.formulaTitle?.setText("CELL EDIT MODE · SELECT TARGET");
      this.selectedEditTarget = { kind: "column", index: 7 };
      this.rowInput = "";
      this.updateEditSelection();
    }
  }

  private updateEditSelection() {
    const target = this.selectedEditTarget;
    const formula = this.targetFormula(target);
    const reference = this.targetReference(target);
    const objectCount = this.targetsForSelection(target).length;
    if (target.kind === "column") {
      this.columnSelection
        ?.setPosition((target.index + 0.5) * CELL_WIDTH, WORLD_HEIGHT / 2)
        .setSize(CELL_WIDTH, WORLD_HEIGHT);
    } else {
      this.columnSelection
        ?.setPosition(WORLD_WIDTH / 2, (target.index + 0.5) * CELL_HEIGHT)
        .setSize(WORLD_WIDTH, CELL_HEIGHT);
    }
    this.formulaLabel?.setText(`fx  =HIDE(${formula})`);
    this.inspectionLabel
      ?.setText(`${reference} · OBJECTS ${objectCount} · RESULT UNKNOWN`)
      .setColor("#a9c7bd");
    this.executeLabel?.setText(
      "A–Z 열 선택 · 1–18 행 입력 · ENTER 미리보기\nSPACE 편집 취소",
    );
    useGameStore.getState().setSelectedCell(
      reference,
      `=HIDE(${formula})`,
    );
  }

  private confirmEdit(time: number) {
    if (this.isSession2Sheet1()) {
      this.confirmSession2Sheet1Sort();
      return;
    }
    if (this.isSession2Sheet2()) {
      this.confirmSession2Sheet2Sort();
      return;
    }
    if (this.isSession2Sheet3()) {
      this.confirmSession2Sheet3Filter(time);
      return;
    }
    if (this.isSession2Sheet4()) {
      this.confirmSession2Sheet4();
      return;
    }
    if (this.isSession2Final()) {
      this.confirmSession2Final();
      return;
    }
    if (this.isSession3Sheet1()) {
      this.confirmSession3Sheet1If();
      return;
    }
    if (this.isSession3Sheet2()) {
      this.confirmSession3Sheet2();
      return;
    }
    if (this.isSession3Sheet3() && this.s3s3IfEditing) {
      this.confirmSession3Sheet3If();
      return;
    }
    if (this.isSession3Sheet4()) {
      this.confirmSession3Sheet4If();
      return;
    }
    if (this.isSession3Final()) {
      this.confirmSession3FinalIf();
      return;
    }
    if (this.isSession4Sheet2()) {
      this.confirmSession4Sheet2If(time);
      return;
    }
    if (this.isSession4Sheet3() && this.s4s3IfEditing) {
      this.confirmSession4Sheet3If();
      return;
    }
    if (this.isSession4Final()) {
      this.confirmSession4FinalIf();
      return;
    }
    if (this.isSession5Sheet1()) {
      this.confirmSession5Sheet1Name(time);
      return;
    }
    if (this.isSession5Sheet2()) {
      this.confirmSession5Sheet2Div(time);
      return;
    }
    if (this.isSession5Sheet3()) {
      this.confirmSession5Sheet3Value(time);
      return;
    }
    if (this.isSession5Sheet4()) {
      this.confirmSession5Sheet4Ref();
      return;
    }
    if (this.isSession5Final()) {
      this.confirmSession5FinalEdit(time);
      return;
    }
    if (this.isSession6Sheet1() && this.s6s1SortEditing) {
      this.confirmSession6Sheet1Sort();
      return;
    }
    if (this.isSession6Sheet2()) {
      this.confirmSession6Sheet2Edit();
      return;
    }
    if (this.isSession6Sheet3()) {
      this.confirmSession6Sheet3Edit(time);
      return;
    }
    if (this.isSession6Sheet4()) {
      this.confirmSession6Sheet4Edit();
      return;
    }
    const target = this.selectedEditTarget;
    const targets = this.targetsForSelection(target);
    const reference = this.targetReference(target);
    if (!this.previewArmed) {
      this.previewArmed = true;
      this.inspectionLabel
        ?.setText(
          targets.length > 0
            ? `PREVIEW · ${reference}의 오브젝트 ${targets.length}개 숨김`
            : `PREVIEW · ${reference}에는 숨길 오브젝트가 없습니다`,
        )
        .setColor(targets.length > 0 ? "#f2d875" : "#e49b8f");
      this.executeLabel?.setText(
        targets.length > 0
          ? "ENTER 실행 · CALC 1 · 지속 5초\nA–Z / 1–18 대상 변경 · SPACE 취소"
          : "다른 행 또는 열을 입력하세요 · SPACE 취소",
      );
      return;
    }
    if (targets.length > 0) this.executeHide(time, target, targets);
  }

  private confirmSession2Sheet1Sort() {
    if (!this.editMode || this.s2s1QueueValid) return;
    if (!this.s2s1SortPreviewed) {
      this.s2s1SortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · INTERN → STAFF_B → STAFF_A → TEAM_LEADER → UNKNOWN")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 1 · 동점은 기존 순서 유지\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 1) return;

    this.calc -= 1;
    const sorted = [...this.s2s1QueueEntries].sort((left, right) => {
      const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
      const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
      return leftRank - rightRank || left.originalIndex - right.originalIndex;
    });
    const expected = ["INTERN", "STAFF_B", "STAFF_A", "TEAM_LEADER", "UNKNOWN"];
    this.s2s1QueueValid = sorted.every((entry, index) => entry.name === expected[index]);
    sorted.forEach((entry, index) => {
      this.tweens.add({
        targets: entry.container,
        x: 440 + index * 80,
        duration: 520,
        ease: "Sine.InOut",
      });
    });
    this.s2s1QueueEntries = sorted;
    this.s2s1SortStation?.setTint(this.s2s1QueueValid ? 0x79d6a5 : 0xd97979);
    if (this.s2s1QueueValid) {
      this.s2s1Gate?.setTexture("office-ref-exitOpen");
      const gateBody = this.s2s1GateBody ? this.arcadeBody(this.s2s1GateBody) : undefined;
      if (gateBody) gateBody.enable = false;
      useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
      useGameStore.getState().setSelectedCell("F7", "=SORT(F3:J3,RANK,ASC) // QUEUE_VALID");
    }
    this.setEditMode(false);
  }

  private confirmSession2Sheet2Sort() {
    if (!this.editMode || this.s2s2QueueValid) return;
    if (!this.s2s2SortPreviewed) {
      this.s2s2SortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · HR_A → HR_B → OPERATIONS → SECURITY_A → SECURITY_B → UNKNOWN")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · 동점 부서의 기존 순서 유지\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 1) return;

    this.calc -= 1;
    const sorted = [...this.s2s2QueueEntries].sort((left, right) => {
      const leftCode = left.departmentCode ?? Number.POSITIVE_INFINITY;
      const rightCode = right.departmentCode ?? Number.POSITIVE_INFINITY;
      return leftCode - rightCode || left.originalIndex - right.originalIndex;
    });
    const expected = ["HR_A", "HR_B", "OPERATIONS", "SECURITY_A", "SECURITY_B", "UNKNOWN"];
    this.s2s2QueueValid = sorted.every((entry, index) => entry.name === expected[index]);
    sorted.forEach((entry, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      this.tweens.add({
        targets: entry.container,
        x: 440 + column * 80,
        y: 130 + row * 52,
        duration: 560,
        ease: "Sine.InOut",
      });
    });
    this.s2s2QueueEntries = sorted;
    this.s2s2SortStation?.setTint(this.s2s2QueueValid ? 0x79d6a5 : 0xd97979);
    if (this.s2s2QueueValid) {
      this.s2s2Gate?.setTexture("office-ref-exitOpen");
      const gateBody = this.s2s2GateBody ? this.arcadeBody(this.s2s2GateBody) : undefined;
      if (gateBody) gateBody.enable = false;
      useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
      useGameStore.getState().setSelectedCell("E7", "=SORT(F3:H4,DEPARTMENT_CODE,ASC) // GROUP_VALID");
    }
    this.setEditMode(false);
  }

  private confirmSession2Sheet3Filter(time: number) {
    if (!this.editMode || this.s2s3FilterActive) return;
    if (!this.s2s3FilterPreviewed) {
      this.s2s3FilterPreviewed = true;
      this.inspectionLabel
        ?.setText("KEEP · HR_A / SECURITY_A / STAFF_B · FILTER OUT 3")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 1 · AUDIT_ESCORT 8초\n3초 뒤 LATE_STAFF 자동 재평가 · SPACE 취소");
      return;
    }
    if (this.calc < 1) return;

    this.calc -= 1;
    this.s2s3FilterActive = true;
    this.s2s3FilterUntil = time + 8000;
    this.s2s3LateStaffAt = time + 3000;
    this.s2s3LateStaffSpawned = false;
    this.s2s3QueueEntries.forEach((entry) => {
      if (!entry.qualified) entry.container.setVisible(false);
      else entry.container.setAlpha(1);
    });
    this.s2s3LateStaff?.setVisible(false);
    this.s2s3FilterStation?.setTint(0x79d6a5);
    this.s2s3Gate?.setTexture("office-ref-exitOpen");
    const gateBody = this.s2s3GateBody ? this.arcadeBody(this.s2s3GateBody) : undefined;
    if (gateBody) gateBody.enable = false;
    this.terminalChecked = true;
    useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
    useGameStore.getState().setSelectedCell(
      "K5",
      "=FILTER(F3:J6,CLEARANCE>=2) // AUDIT_ESCORT 8s",
    );
    this.setEditMode(false);
  }

  private confirmSession2Sheet4() {
    if (!this.editMode || this.s2s4Sorted) return;
    if (!this.s2s4Filtered) {
      if (!this.s2s4FilterPreviewed) {
        this.s2s4FilterPreviewed = true;
        this.inspectionLabel
          ?.setText("KEEP · BUDGET / VACATION / DEPARTMENT_FIX · DROP PRINTER_REPAIR")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · FACILITIES 업무 제외\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      const dropped = this.s2s4QueueEntries.filter((entry) => entry.role !== "TEAM_LEADER");
      dropped.forEach((entry) => {
        this.tweens.add({
          targets: entry.container,
          alpha: 0,
          duration: 320,
          ease: "Sine.In",
          onComplete: () => entry.container.setVisible(false),
        });
      });
      this.s2s4QueueEntries = this.s2s4QueueEntries.filter((entry) => entry.role === "TEAM_LEADER");
      this.s2s4QueueEntries.forEach((entry, index) => {
        this.tweens.add({
          targets: entry.container,
          x: 420 + index * 112,
          duration: 420,
          ease: "Sine.InOut",
        });
      });
      this.s2s4Filtered = true;
      this.s2s4WriteConsole?.setTint(0x9ad0b4);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("F7", '=FILTER(TASK_QUEUE,ROLE="TEAM_LEADER") // 3 KEPT');
      this.setEditMode(false);
      return;
    }

    if (!this.s2s4SortPreviewed) {
      this.s2s4SortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · DEPARTMENT_FIX → VACATION_APPROVAL → BUDGET_APPROVAL")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 2 · DEPARTMENT_FIX 최우선\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 2) return;

    this.calc -= 2;
    const sorted = [...this.s2s4QueueEntries].sort(
      (left, right) => left.priority - right.priority || left.originalIndex - right.originalIndex,
    );
    sorted.forEach((entry, index) => {
      this.tweens.add({
        targets: entry.container,
        x: 420 + index * 112,
        duration: 520,
        ease: "Sine.InOut",
      });
    });
    this.s2s4QueueEntries = sorted;
    this.s2s4Sorted = true;
    this.s2s4WriteConsole?.setTint(0x79d6a5);
    this.terminalChecked = true;
    useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
    useGameStore.getState().setSelectedCell("G7", "=SORT(TASK_QUEUE,PRIORITY,ASC) // DEPARTMENT_FIX #1");
    this.setEditMode(false);
    this.dispatchSession2Sheet4Leader();
  }

  private dispatchSession2Sheet4Leader() {
    if (this.s2s4Dispatched || !this.s2s4Leader) return;
    this.s2s4Dispatched = true;
    useGameStore.getState().setSelectedCell("M3", "=TEAM_LEADER.MOVE(P3) // DEPARTMENT_FIX");
    this.tweens.add({
      targets: this.s2s4Leader,
      x: 660,
      y: 214,
      duration: 1200,
      ease: "Sine.InOut",
      onComplete: () => {
        this.time.delayedCall(4000, () => this.completeSession2Sheet4Processing());
      },
    });
  }

  private completeSession2Sheet4Processing() {
    if (this.s2s4Processed) return;
    this.s2s4Processed = true;
    this.exitUnlocked = true;
    this.s2s4ProcessHighlight?.setTint(0x79d6a5);
    this.s2s4ViolationLabel
      ?.setText("POLICY_VIOLATIONS 2 · DEPARTMENT OPERATIONS")
      .setColor("#bfe6c4");
    this.s2s4Gate?.setTexture("office-ref-exitOpen");
    const gateBody = this.s2s4GateBody ? this.arcadeBody(this.s2s4GateBody) : undefined;
    if (gateBody) gateBody.enable = false;
    this.exitDoor?.setTexture("office-ref-exitOpen");
    useGameStore.getState().updateKeeper({ exitUnlocked: true });
    useGameStore.getState().setSelectedCell("P3", "=PROCESS(DEPARTMENT_FIX) // VIOLATIONS 7->2");
    if (this.s2s4Leader) {
      this.tweens.add({
        targets: this.s2s4Leader,
        x: this.s2s4LeaderHome.x,
        y: this.s2s4LeaderHome.y,
        duration: 1200,
        ease: "Sine.InOut",
      });
    }
  }

  private confirmSession2Final() {
    if (!this.editMode || this.s2fSubmitted || this.s2fSorted) return;
    if (!this.s2fFiltered) {
      if (!this.s2fFilterPreviewed) {
        this.s2fFilterPreviewed = true;
        this.inspectionLabel
          ?.setText("DROP · R5 OLD_GUEST (YESTERDAY) · KEEP 6")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · 8초 안에 SORT+제출\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      this.s2fRows.forEach((row) => {
        if (row.date !== "TODAY") row.visible = false;
      });
      this.s2fFiltered = true;
      this.s2fSampleUntil = this.time.now + 8000;
      this.layoutAuditRows();
      this.s2fAuditStation?.setTint(0x9ad0b4);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("M7", '=FILTER(AUDIT_ROWS,DATE="TODAY") // 8s WINDOW');
      this.setEditMode(false);
      return;
    }

    if (!this.s2fSortPreviewed) {
      this.s2fSortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · COMPLIANT ×5 → PLAYER VIOLATION #6")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 2 · 표본 COUNTIF=0\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 2) return;

    this.calc -= 2;
    const order = new Map(this.s2fRows.map((row, index) => [row.id, index]));
    this.s2fRows.sort((left, right) => {
      const rank = (status: string) => (status === "COMPLIANT" ? 0 : 1);
      return rank(left.status) - rank(right.status)
        || (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
    });
    const visible = this.s2fRows.filter((row) => row.visible);
    const sample = visible.slice(0, 5);
    this.s2fSampleValid = sample.length >= 5
      && sample.every((row) => row.status === "COMPLIANT");
    this.s2fSorted = true;
    this.layoutAuditRows();
    this.s2fAuditStation?.setTint(this.s2fSampleValid ? 0x79d6a5 : 0xd97979);
    if (this.s2fSampleValid) {
      this.s2fVerdictLabel
        ?.setText("AUDIT_SAMPLE COMPLIANT · Q3 제출 대기")
        .setColor("#d8e6df");
    }
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell(
      "M7",
      this.s2fSampleValid
        ? "=SORT(AUDIT_ROWS,STATUS,ASC) // COUNTIF(SAMPLE,VIOLATION)=0"
        : "=SORT(AUDIT_ROWS,STATUS,ASC) // SAMPLE INVALID",
    );
    this.setEditMode(false);
  }

  private confirmSession3Sheet1If() {
    if (!this.editMode || this.s3s1IfInstalled) return;
    if (!this.s3s1IfPreviewed) {
      this.s3s1IfPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · EMPLOYEE_A @ F3 · CONDITION FALSE / WAITING")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 1 · 커피 호출로 조건 발동\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 1) return;

    this.calc -= 1;
    this.s3s1IfInstalled = true;
    this.s3s1InstallConsole?.setTint(0x79d6a5);
    this.s3s1StatusLabel?.setText("IF WAITING · CURRENT RESULT=FALSE").setColor("#f0c9a6");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("H7", "=IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN) // WAITING");
    this.setEditMode(false);
  }

  private confirmSession3Sheet2() {
    if (!this.editMode) return;
    if (!this.s3s2If1Installed) {
      if (!this.s3s2If1Previewed) {
        this.s3s2If1Previewed = true;
        this.inspectionLabel
          ?.setText("PREVIEW · PRINTER_F4=JAMMED · RESULT=TRUE / EXECUTE NOW")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · 설치 즉시 H5 개방\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      this.s3s2If1Installed = true;
      this.s3s2ConsoleA?.setTint(0x79d6a5);
      this.s3s2Door1?.setTexture("office-ref-exitOpen");
      const door1Body = this.s3s2Door1Body ? this.arcadeBody(this.s3s2Door1Body) : undefined;
      if (door1Body) door1Body.enable = false;
      this.s3s2StatusLabel?.setText("IF#1 CONSUMED · H5 OPEN · IF#2 WAITING").setColor("#cfe7d2");
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("F7", '=IF(PRINTER_F4.STATUS="JAMMED",DOOR_H5.OPEN) // TRUE');
      this.setEditMode(false);
      return;
    }

    if (!this.s3s2If2Installed) {
      if (!this.s3s2If2Previewed) {
        this.s3s2If2Previewed = true;
        this.inspectionLabel
          ?.setText("PREVIEW · FACILITIES_A @ K3 · RESULT=FALSE / WAITING")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · 수리 호출로 발동\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      this.s3s2If2Installed = true;
      this.s3s2ConsoleB?.setTint(0x79d6a5);
      this.s3s2StatusLabel?.setText("IF#2 INSTALLED · WAITING · J8 수리 호출 대기").setColor("#f0c9a6");
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("L7", "=IF(FACILITIES_A.IN(L4),DOOR_N5.OPEN) // WAITING");
      this.setEditMode(false);
    }
  }

  private confirmSession3Sheet3If() {
    if (!this.editMode || this.s3s3IfInstalled) return;
    if (!this.s3s3IfPreviewed) {
      this.s3s3IfPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · DOCUMENT @ F4 · RESULT=FALSE / WAITING")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 3 · 설치 시 컨베이어 시작\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 3) return;

    this.calc -= 3;
    this.s3s3IfInstalled = true;
    this.s3s3ConveyorStarted = true;
    this.s3s3DocTimer = 0;
    this.s3s3IfConsole?.setTint(0x79d6a5);
    this.s3s3StatusLabel?.setText("IF WAITING · 컨베이어 시작 · DOCUMENT @ F4").setColor("#f0c9a6");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell(
      "G7",
      "=IF(DOCUMENT.IN(J4),DOOR_L5.OPEN_FOR(3)) // WAITING · CONVEYOR ON",
    );
    this.setEditMode(false);
  }

  private confirmSession3Sheet4If() {
    if (!this.editMode || this.s3s4IfInstalled) return;
    if (!this.s3s4IfPreviewed) {
      this.s3s4IfPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · MEETING_ROOM COUNT=0 · RESULT=FALSE / WAITING")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 3 · MACRO 회의 소집으로 발동\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 3) return;

    this.calc -= 3;
    this.s3s4IfInstalled = true;
    this.s3s4IfConsole?.setTint(0x79d6a5);
    this.s3s4StatusLabel?.setText("IF ARMED · WAITING · MACRO 실행 대기").setColor("#f0c9a6");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell(
      "J7",
      "=IF(COUNTIF(MEETING_ROOM,OPERATIONS)>=4,DOOR_N6.OPEN) // WAITING",
    );
    this.setEditMode(false);
  }

  private confirmSession3FinalIf() {
    if (!this.editMode) return;
    if (!this.s3finIf1Installed) {
      if (!this.s3finIf1Previewed) {
        this.s3finIf1Previewed = true;
        this.inspectionLabel
          ?.setText("PREVIEW · ROUTE_READY=TRUE · AUTOMATION_ENABLED→FALSE")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · PENDING 2초마다 완료\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      this.s3finIf1Installed = true;
      this.s3finSwitch?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell(
        "Q3",
        "=IF(ROUTE_READY=TRUE,AUTOMATION_ENABLED.FALSE) // ARMED",
      );
      this.setEditMode(false);
      return;
    }

    if (!this.s3finIf2Installed) {
      if (!this.s3finIf2Previewed) {
        this.s3finIf2Previewed = true;
        this.inspectionLabel
          ?.setText("PREVIEW · PENDING_TASKS=0 · LOOP_DEPTH→0")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · PENDING 0 도달 시 발동\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      this.s3finIf2Installed = true;
      this.s3finLoopCell?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell(
        "R3",
        "=IF(PENDING_TASKS=0,LOOP_DEPTH.RESET_TO_0) // ARMED",
      );
      this.setEditMode(false);
    }
  }

  private confirmSession4Sheet2If(time: number) {
    if (!this.editMode || this.s4s2IfInstalled) return;
    if (!this.s4s2IfPreviewed) {
      this.s4s2IfPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · BADGE_SENSOR=TRUE · L5 즉시 개방")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 3 · L5가 AUDIT_TARGET (6초)\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 3) return;

    this.calc -= 3;
    this.s4s2IfInstalled = true;
    this.s4s2DoorOpen = true;
    this.s4s2IfConsole?.setTint(0x79d6a5);
    this.s4s2Door?.setTexture("office-ref-exitOpen");
    const doorBody = this.s4s2DoorBody ? this.arcadeBody(this.s4s2DoorBody) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s4s2AuditTarget = "L5";
    this.s4s2AuditUntil = time + 6000;
    this.s4s2AuditLastSecond = -1;
    this.s4s2StatusLabel?.setText("IF TRUE · L5 OPEN · L5가 AUDIT_TARGET").setColor("#cfe7d2");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("F5", "=IF(BADGE_SENSOR=TRUE,DOOR_L5.OPEN) // TRUE · AUDIT_TARGET=L5");
    this.setEditMode(false);
  }

  private confirmSession4Sheet3If() {
    if (!this.editMode || this.s4s3IfInstalled) return;
    if (!this.s4s3IfPreviewed) {
      this.s4s3IfPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · REVIEW_BUTTON=FALSE · WAITING")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 3 · REVIEW로 CABINET_07 태깅\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 3) return;

    this.calc -= 3;
    this.s4s3IfInstalled = true;
    this.s4s3IfConsole?.setTint(0x79d6a5);
    this.s4s3StatusLabel?.setText("IF ARMED · REVIEW 버튼 대기").setColor("#f0c9a6");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell(
      "F4",
      "=IF(REVIEW_BUTTON=TRUE,CABINET_07.REVISION_TAG) // WAITING",
    );
    this.setEditMode(false);
  }

  private confirmSession4FinalIf() {
    if (!this.editMode || this.s4finIfInstalled) return;
    if (!this.s4finIfPreviewed) {
      this.s4finIfPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · AND(TRUE,TRUE,TRUE)=TRUE · REVISION_ACCEPTED→FALSE")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 3 · 외부 서버가 서명·LOCK\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 3) return;

    this.calc -= 3;
    this.s4finIfInstalled = true;
    this.s4finVerdictLocked = true;
    this.s4finIfConsole?.setTint(0x79d6a5);
    this.s4finVerdictLabel
      ?.setText("REVISION_ACCEPTED = FALSE (LOCKED · UNDO 불가)")
      .setColor("#bfe6c4");
    this.s4finStatusLabel?.setText("판정 서명·LOCK · Z로 IF 흔적 UNDO").setColor("#cfe7d2");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell(
      "N9",
      "=IF(AND(...),REVISION_ACCEPTED.FALSE) // TRUE · SIGNED & LOCKED",
    );
    this.setEditMode(false);
  }

  private confirmSession5Sheet1Name(time: number) {
    if (!this.editMode) return;
    if (!this.s5s1NamePreviewed) {
      this.s5s1NamePreviewed = true;
      this.inspectionLabel
        ?.setText(`PREVIEW · 손상도 ${this.s5s1Damage}→${this.s5s1Damage + 15} · NAME/DEPT/CLEARANCE 10초 공백`)
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · HR 검색 FALSE · L5는 신원 복원 후\nSPACE 편집 취소");
      return;
    }
    if (this.s5s1NameError || this.s5s1Damage >= 85) {
      this.setEditMode(false);
      return;
    }

    this.s5s1Damage = Math.min(100, this.s5s1Damage + 15);
    this.s5s1NameError = true;
    this.s5s1NameErrorUntil = time + 10000;
    this.s5s1NameErrorLastSecond = -1;
    this.player?.setTint(0xc9a0d0);
    this.s5s1DamageLabel
      ?.setText(`손상도 ${this.s5s1Damage} / 100`)
      .setColor(this.s5s1Damage >= 60 ? "#ff9b88" : "#f0c9a6");
    this.s5s1StatusLabel?.setText("#NAME? 실행 · 신원 공백 10초 · HR 검색 FALSE").setColor("#c9a0d0");
    useGameStore.getState().setSelectedCell("D8", "=#NAME?(SELF) // NAME/DEPT/CLEARANCE 공백");
    this.setEditMode(false);
  }

  private confirmSession5Sheet2Div(time: number) {
    if (!this.editMode) return;
    if (!this.s5s2DivPreviewed) {
      this.s5s2DivPreviewed = true;
      this.inspectionLabel
        ?.setText(`PREVIEW · SHUTTER ${this.s5s2ShutterOpen ? "OPEN" : "CLOSED"} · 손상도 ${this.s5s2Damage}→${this.s5s2Damage + 20}`)
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · SHUTTER/CCTV/ARM 5초 정지\nSPACE 편집 취소");
      return;
    }
    if (this.s5s2Frozen || this.s5s2Damage >= 85) {
      this.setEditMode(false);
      return;
    }

    this.s5s2Damage = Math.min(100, this.s5s2Damage + 20);
    this.s5s2Frozen = true;
    this.s5s2FrozenUntil = time + 5000;
    this.s5s2FrozenLastSecond = -1;
    this.s5s2DamageLabel
      ?.setText(`손상도 ${this.s5s2Damage} / 100`)
      .setColor(this.s5s2Damage >= 60 ? "#ff9b88" : "#f0c9a6");
    this.s5s2StatusLabel?.setText("#DIV/0! 실행 · H4:J6 시간 정지 5초").setColor("#9ad0d8");
    useGameStore.getState().setSelectedCell("H4", "=#DIV/0!(H4:J6) // TIME FROZEN 5s");
    this.setEditMode(false);
  }

  private confirmSession5Sheet3Value(time: number) {
    if (!this.editMode) return;
    if (!this.s5s3ValuePreviewed) {
      this.s5s3ValuePreviewed = true;
      this.inspectionLabel
        ?.setText(`PREVIEW · F5 TYPE→EMPLOYEE 8초 · 손상도 ${this.s5s3Damage}→${this.s5s3Damage + 20}`)
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · headcount 2·문 개방·VP 미끼\nSPACE 편집 취소");
      return;
    }
    if (this.s5s3BoxEmployee || this.s5s3Damage >= 85) {
      this.setEditMode(false);
      return;
    }

    this.s5s3Damage = Math.min(100, this.s5s3Damage + 20);
    this.s5s3BoxEmployee = true;
    this.s5s3BoxEmployeeUntil = time + 8000;
    this.s5s3BoxLastSecond = -1;
    this.s5s3Box?.setTint(0xc9a0d0);
    this.s5s3DamageLabel
      ?.setText(`손상도 ${this.s5s3Damage} / 100`)
      .setColor(this.s5s3Damage >= 60 ? "#ff9b88" : "#f0c9a6");
    this.s5s3StatusLabel?.setText("#VALUE! 실행 · F5=EMPLOYEE 8초 · 문 개방·VP 미끼").setColor("#c9a0d0");
    useGameStore.getState().setSelectedCell("F5", "=#VALUE!(EMPLOYEE_C3,ARCHIVE_BOX_07) // TYPE=EMPLOYEE 8s");
    this.setEditMode(false);
  }

  private confirmSession5Sheet4Ref() {
    if (!this.editMode) return;
    if (this.s5s4RefTarget === "server") {
      // Forbidden target: block, show the refusal, spend nothing.
      this.s5s4StatusLabel?.setText("삭제 거부 · LOCKED BACKUP SERVER · 미소비").setColor("#f0c9a6");
      useGameStore.getState().setSelectedCell("D10", "=#REF!(BACKUP_SERVER) // REFUSED: LOCKED");
      this.setEditMode(false);
      return;
    }
    if (!this.s5s4RefPreviewed) {
      this.s5s4RefPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · ROW_LOCK_RELAY 영구 삭제 · J6/N5/Q7 FAIL OPEN")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · 손상도 +25 · UNDO/시간 복구 불가\nSPACE 편집 취소");
      return;
    }
    if (this.s5s4Damage >= 85) {
      this.setEditMode(false);
      return;
    }

    this.s5s4Damage = Math.min(100, this.s5s4Damage + 25);
    this.s5s4RelayDeleted = true;
    this.s5s4Relay?.destroy();
    this.s5s4Relay = undefined;
    const doors: Array<[Phaser.GameObjects.Image | undefined, Phaser.GameObjects.Rectangle | undefined]> = [
      [this.s5s4Door1, this.s5s4Door1Body],
      [this.s5s4Door2, this.s5s4Door2Body],
      [this.s5s4Door3, this.s5s4Door3Body],
    ];
    for (const [door, body] of doors) {
      door?.setTexture("office-ref-exitOpen");
      const arcadeDoorBody = body ? this.arcadeBody(body) : undefined;
      if (arcadeDoorBody) arcadeDoorBody.enable = false;
    }
    this.s5s4DamageLabel
      ?.setText(`손상도 ${this.s5s4Damage} / 100`)
      .setColor(this.s5s4Damage >= 60 ? "#ff9b88" : "#f0c9a6");
    this.s5s4StatusLabel?.setText("ROW_LOCK_RELAY 영구 삭제 · J6/N5/Q7 FAIL OPEN").setColor("#bfe6c4");
    useGameStore.getState().setSelectedCell("J6", "=#REF!(ROW_LOCK_RELAY) // 3 DOORS FAIL OPEN");
    this.setEditMode(false);
  }

  private confirmSession5FinalEdit(time: number) {
    if (!this.editMode) return;

    if (this.s5finEditTarget === "name") {
      if (!this.s5finEditPreviewed) {
        this.s5finEditPreviewed = true;
        this.inspectionLabel
          ?.setText(`PREVIEW · NAME/DEPARTMENT 검색 제외 10초 · 손상도 ${this.s5finDamage}→${this.s5finDamage + 15}`)
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · VP 첫 심사 방어\nSPACE 편집 취소");
        return;
      }
      this.s5finDamage = Math.min(100, this.s5finDamage + 15);
      this.s5finNameError = true;
      this.s5finNameErrorUntil = time + 10000;
      this.s5finNameLastSecond = -1;
      this.player?.setTint(0xc9a0d0);
      this.s5finDamageLabel?.setText(`손상도 ${this.s5finDamage} / 100`)
        .setColor(this.s5finDamage >= 60 ? "#ff9b88" : "#f0c9a6");
      this.s5finStatusLabel?.setText("#NAME? 방어 실행 · 심사 제외 10초").setColor("#c9a0d0");
      useGameStore.getState().setSelectedCell("D12", "=#NAME?(SELF) // 첫 심사 방어");
      this.setEditMode(false);
      return;
    }

    if (this.s5finEditTarget === "filter") {
      if (!this.s5finEditPreviewed) {
        this.s5finEditPreviewed = true;
        this.inspectionLabel
          ?.setText("PREVIEW · EMP_C만 CANONICAL_MATCH=TRUE · 나머지 3행 FILTER OUT")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · 8초 내 정본 확정\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;
      this.calc -= 3;
      this.s5finFilterConfirmed = true;
      this.s5finRows.forEach((row) => {
        if (!row.canonical) row.container.setAlpha(0.3);
      });
      this.s5finPointer?.clearTint().setTint(0x86c0a0);
      this.s5finPointerHighlight?.setTint(0x79d6a5);
      this.s5finVerdictLabel?.setText("CANONICAL_ROW = TRUE · REDUNDANCY_SCORE 0 (확정)").setColor("#bfe6c4");
      this.s5finStatusLabel?.setText("정본 확정 · U3 TERMINATION_POINTER LOCKED 해제").setColor("#cfe7d2");
      this.terminalChecked = true;
      useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
      useGameStore.getState().setSelectedCell("N7", "=FILTER(EMPLOYEE_COPIES,CANONICAL_MATCH=TRUE) // CANONICAL CONFIRMED");
      this.setEditMode(false);
      return;
    }

    // ref
    if (!this.s5finEditPreviewed) {
      this.s5finEditPreviewed = true;
      this.inspectionLabel
        ?.setText(`PREVIEW · TERMINATION_POINTER 영구 삭제 · 손상도 ${this.s5finDamage}→${this.s5finDamage + 25}`)
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · TERMINATION_TARGET=#REF!\nSPACE 편집 취소");
      return;
    }
    if (this.s5finDamage >= 85) {
      this.setEditMode(false);
      return;
    }
    this.s5finDamage = Math.min(100, this.s5finDamage + 25);
    this.s5finPointerDeleted = true;
    this.s5finPointer?.destroy();
    this.s5finPointer = undefined;
    this.s5finPointerHighlight?.setVisible(false);
    this.s5finDamageLabel?.setText(`손상도 ${this.s5finDamage} / 100`)
      .setColor(this.s5finDamage >= 60 ? "#ff9b88" : "#f0c9a6");
    this.s5finStatusLabel?.setText("TERMINATION_POINTER #REF! 삭제 · V11 제출").setColor("#bfe6c4");
    useGameStore.getState().setSelectedCell("U3", "=#REF!(TERMINATION_POINTER) // TERMINATION_TARGET=#REF!");
    this.setEditMode(false);
  }

  private confirmSession6Sheet1Sort() {
    if (!this.editMode || this.s6s1Phase !== 2) return;
    if (!this.s6s1SortPreviewed) {
      this.s6s1SortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · REQ_B(1) → REQ_C(2) → REQ_A(3)")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 2 · ROW 3 예외 범위 개방\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 2) return;

    this.calc -= 2;
    const sorted = [...this.s6s1Rows].sort(
      (left, right) => left.requestId - right.requestId || left.originalIndex - right.originalIndex,
    );
    sorted.forEach((row, index) => {
      this.tweens.add({ targets: row.container, y: 470 + index * 60, duration: 480, ease: "Sine.InOut" });
    });
    this.s6s1Rows = sorted;
    this.s6s1Phase = 3;
    this.s6s1SortStation?.setTint(0x79d6a5);
    this.s6s1Gate2?.setTexture("office-ref-exitOpen");
    const g2 = this.s6s1Gate2Body ? this.arcadeBody(this.s6s1Gate2Body) : undefined;
    if (g2) g2.enable = false;
    this.moveSession6Sheet1Range(3);
    this.s6s1StatusLabel?.setText("RANGE 3 (ROW 3) · HIDE ROW 3으로 접고 Q2 회수").setColor("#f0c9a6");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("H7", "=SORT(ACCESS_REQUESTS,REQUEST_ID,ASC) // ROW 3 OPEN");
    this.setEditMode(false);
  }

  private confirmSession6Sheet2Edit() {
    if (!this.editMode) return;
    if (this.s6s2EditTarget === "if") {
      if (!this.s6s2IfPreviewed) {
        this.s6s2IfPreviewed = true;
        this.inspectionLabel
          ?.setText("PREVIEW · EMPLOYEE_COUNT(J3:K3)=0 · RESULT=FALSE / WAITING")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · 원격 SORT로 발동\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;
      this.calc -= 3;
      this.s6s2IfInstalled = true;
      this.s6s2Sandbox?.setTint(0x9ad0b4);
      this.s6s2StatusLabel?.setText("IF ARMED (WAITING) · 원격 J3:K5 SORT 필요").setColor("#f0c9a6");
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("E8", "=IF(EMPLOYEE_COUNT(J3:K3)>=2,DOOR_N5.OPEN) // WAITING");
      this.setEditMode(false);
      return;
    }

    // sort
    if (!this.s6s2SortPreviewed) {
      this.s6s2SortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · EMP_Y(1) → EMP_Z(2) → EMP_X(3) · 상위 2명 센서")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 2 · IF TRUE → N5 OPEN\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 2) return;
    this.calc -= 2;
    const sorted = [...this.s6s2Rows].sort(
      (left, right) => left.priority - right.priority || left.originalIndex - right.originalIndex,
    );
    sorted.forEach((row, index) => {
      this.tweens.add({ targets: row.container, y: 180 + index * 60, duration: 480, ease: "Sine.InOut" });
    });
    this.s6s2Rows = sorted;
    this.s6s2Sorted = true;
    this.s6s2Triggered = true;
    this.s6s2Sandbox?.setTint(0x79d6a5);
    this.s6s2Door?.setTexture("office-ref-exitOpen");
    const doorBody = this.s6s2DoorBody ? this.arcadeBody(this.s6s2DoorBody) : undefined;
    if (doorBody) doorBody.enable = false;
    this.terminalChecked = true;
    this.s6s2StatusLabel?.setText("상위 2명 J3:K3 · EMPLOYEE_COUNT>=2 · IF TRUE · N5 OPEN").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
    useGameStore.getState().setSelectedCell("N5", "=IF(EMPLOYEE_COUNT(J3:K3)>=2,DOOR_N5.OPEN) // TRUE");
    this.setEditMode(false);
  }

  private confirmSession6Sheet3Edit(time: number) {
    if (!this.editMode) return;
    if (this.s6s3Phase === 1) {
      if (!this.s6s3HidePreviewed) {
        this.s6s3HidePreviewed = true;
        this.inspectionLabel?.setText("PREVIEW · COLUMN F 3초 접힘 · DRAFT (복원 시 CALC 미환불)").setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 1 · 3초 안에 통과\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 1) return;
      this.calc -= 1;
      this.s6s3DraftKind = "hide";
      this.s6s3DraftUntil = time + 3000;
      this.s6s3DraftLastSecond = -1;
      this.s6s3Gate1?.setTexture("office-ref-exitOpen");
      const g1 = this.s6s3Gate1Body ? this.arcadeBody(this.s6s3Gate1Body) : undefined;
      if (g1) g1.enable = false;
      this.s6s3StatusLabel?.setText("HIDE COLUMN F (DRAFT 3s) · 지금 통과").setColor("#c9a0d0");
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("F1", "=HIDE(COLUMN_F) // DRAFT 3.0s");
      this.setEditMode(false);
      return;
    }

    // phase 2 SORT
    if (!this.s6s3SortPreviewed) {
      this.s6s3SortPreviewed = true;
      this.inspectionLabel?.setText("PREVIEW · 경비 상단 정렬 → 하단 통로 3초 · DRAFT").setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 2 · 3초 안에 하단 통과\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 2) return;
    this.calc -= 2;
    this.s6s3DraftKind = "sort";
    this.s6s3DraftUntil = time + 3000;
    this.s6s3DraftLastSecond = -1;
    this.s6s3Gate2?.setTexture("office-ref-exitOpen");
    const g2 = this.s6s3Gate2Body ? this.arcadeBody(this.s6s3Gate2Body) : undefined;
    if (g2) g2.enable = false;
    this.s6s3Guards.forEach((g, i) => {
      this.tweens.add({ targets: g, x: 780 + i * 30, y: 140 + i * 8, duration: 420, ease: "Sine.InOut" });
    });
    this.s6s3StatusLabel?.setText("SORT · 경비 상단 정렬 (DRAFT 3s) · 하단 통과").setColor("#c9a0d0");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("H4", "=SORT(H4:K5,AUDIT_ORDER,ASC) // DRAFT 3.0s");
    this.setEditMode(false);
  }

  private confirmSession6Sheet4Edit() {
    if (!this.editMode) return;
    if (this.s6s4EditTarget === "row") {
      if (!this.previewArmed) {
        this.previewArmed = true;
        this.inspectionLabel?.setText("PREVIEW · ROW 8 장벽 접힘 · CALC 1 (LOAD 대상)").setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 1\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 1) return;
      this.calc -= 1;
      this.s6s4RowHidden = true;
      this.s6s4Barrier?.setVisible(false);
      const body = this.s6s4BarrierBody ? this.arcadeBody(this.s6s4BarrierBody) : undefined;
      if (body) body.enable = false;
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("A8", "=HIDE(ROW_8) // 저장 보관소 개방");
      this.s6s4StatusLabel?.setText("ROW 8 개방 · J5 COPY → N6 PASTE").setColor("#c9a0d0");
      this.setEditMode(false);
      return;
    }

    // IF approval install → server signs R3 key and stops the overwrite cycle.
    if (!this.previewArmed) {
      this.previewArmed = true;
      this.inspectionLabel?.setText("PREVIEW · 즉시 TRUE → R3 KEY 서명 · 덮어쓰기 정지").setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 3\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 3) return;
    this.calc -= 3;
    this.s6s4IfInstalled = true;
    this.s6s4KeyGenerated = true;
    this.s6s4CycleActive = false;
    this.s6s4GhostActive = false;
    this.s6s4GhostLabel?.setVisible(false);
    this.s6s4CycleLastSecond = -1;
    this.s6s4PastedDoc?.setAlpha(1);
    this.s6s4SaveSlotRect?.setStrokeStyle(2, 0x4fb877, 0.9);
    this.s6s4Key?.setVisible(true);
    this.s6s4KeyHighlight?.setVisible(true);
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("N7", "=IF(TRUE,SAVE_REQUEST.APPROVE) // R3 KEY 서명 · 덮어쓰기 정지");
    this.s6s4StatusLabel
      ?.setText("SAVE_REQUEST 승인 · 덮어쓰기 정지 · R3 회수 → T11 제출")
      .setColor("#bfe6c4");
    this.setEditMode(false);
  }

  private executeHide(
    time: number,
    target: EditTarget,
    targets: HideTargetGroup[],
  ) {
    if (this.calc < 1 || this.hideUntil > time) return;
    this.calc -= 1;
    if (this.isSession1Sheet2()) {
      const targetFormula = this.targetFormula(target);
      if (targetFormula === "ROW_6") this.usedRow6 = true;
      if (targetFormula === "COLUMN_J") this.usedColumnJ = true;
    }
    this.hideUntil = time + HIDE_DURATION;
    this.activeHideTargets = targets;
    this.setEditMode(false);
    for (const group of targets) {
      for (const visual of group.visuals) visual.setVisible(false);
      for (const bodyObject of group.bodies) {
        const body = this.arcadeBody(bodyObject);
        if (body) {
          body.enable = false;
          if (body instanceof Phaser.Physics.Arcade.Body) {
            body.setVelocity(0);
          }
        }
      }
    }
    useGameStore.getState().updateKeeper({ calc: this.calc, hideActive: true, hideRemaining: 5 });
    useGameStore.getState().setSelectedCell(
      this.targetReference(target),
      `=HIDE(${this.targetFormula(target)}) // EXECUTED`,
    );
    this.updateFinalScoreDisplay();
  }

  private updateHide(time: number) {
    if (this.hideUntil <= 0) return;
    const remaining = Math.max(0, Math.ceil((this.hideUntil - time) / 1000));
    if (remaining !== this.lastHideSecond) {
      this.lastHideSecond = remaining;
      useGameStore.getState().updateKeeper({ hideRemaining: remaining });
    }
    if (time < this.hideUntil) return;
    this.hideUntil = 0;
    this.restoreActiveHideTargets();
  }

  private restoreActiveHideTargets() {
    for (const group of this.activeHideTargets) {
      for (const bodyObject of group.bodies) {
        const body = this.arcadeBody(bodyObject);
        if (!body) continue;
        this.movePlayerOutside(bodyObject);
        body.enable = true;
        if (body instanceof Phaser.Physics.Arcade.Body) {
          body.setVelocity(0);
          body.updateFromGameObject();
        }
      }
      for (const visual of group.visuals) visual.setVisible(true);
    }
    this.activeHideTargets = [];
    useGameStore.getState().updateKeeper({ hideActive: false, hideRemaining: 0 });
    this.updateFinalScoreDisplay();
  }

  private targetFormula(target: EditTarget) {
    if (target.kind === "column") {
      return `COLUMN_${String.fromCharCode(65 + target.index)}`;
    }
    return `ROW_${target.index + 1}`;
  }

  private targetReference(target: EditTarget) {
    if (target.kind === "column") {
      const column = String.fromCharCode(65 + target.index);
      return `${column}:${column}`;
    }
    const row = target.index + 1;
    return `${row}:${row}`;
  }

  private cellAt(x: number, y: number) {
    const column = String.fromCharCode(
      65 + Phaser.Math.Clamp(Math.floor(x / CELL_WIDTH), 0, WORLD_COLUMNS - 1),
    );
    const row = Phaser.Math.Clamp(Math.floor(y / CELL_HEIGHT) + 1, 1, WORLD_ROWS);
    return `${column}${row}`;
  }

  private targetsForSelection(target: EditTarget) {
    const targetKey = this.targetFormula(target);
    const selection = target.kind === "column"
      ? new Phaser.Geom.Rectangle(target.index * CELL_WIDTH, 0, CELL_WIDTH, WORLD_HEIGHT)
      : new Phaser.Geom.Rectangle(0, target.index * CELL_HEIGHT, WORLD_WIDTH, CELL_HEIGHT);
    return this.hideTargets.filter((group) => {
      if (group.targetKey) return group.targetKey === targetKey;
      return group.visuals.some((visual) =>
        Phaser.Geom.Intersects.RectangleToRectangle(selection, visual.getBounds()),
      );
    });
  }

  private registerHideTarget(
    visuals: HideVisual[],
    bodies: HideBodyObject[] = [],
    targetKey?: string,
  ) {
    this.hideTargets.push({ visuals, bodies, targetKey });
  }

  private addHideableFurniture(
    x: number,
    y: number,
    texture: string,
    displayWidth: number,
    displayHeight: number,
    colliderWidth: number,
    colliderHeight: number,
  ) {
    const image = this.add.image(x, y, texture)
      .setDisplaySize(displayWidth, displayHeight)
      .setDepth(3);
    const collider = this.addWall(x, y, colliderWidth, colliderHeight, 0);
    this.registerHideTarget([image], [collider]);
  }

  private movePlayerOutside(bodyObject: HideBodyObject) {
    if (!this.player || !this.arcadeBody(bodyObject)) return;
    const playerBounds = this.player.getBounds();
    const obstacle = bodyObject.getBounds();
    if (!Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, obstacle)) return;

    const candidates = [
      { x: obstacle.left - playerBounds.width / 2 - 4, y: this.player.y },
      { x: obstacle.right + playerBounds.width / 2 + 4, y: this.player.y },
      { x: this.player.x, y: obstacle.top - playerBounds.height / 2 - 4 },
      { x: this.player.x, y: obstacle.bottom + playerBounds.height / 2 + 4 },
    ];
    let nearest = { ...candidates[0], distance: Number.POSITIVE_INFINITY };
    for (const candidate of candidates) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        candidate.x,
        candidate.y,
      );
      if (distance < nearest.distance) nearest = { ...candidate, distance };
    }
    this.player.setPosition(
      Phaser.Math.Clamp(nearest.x, 20, WORLD_WIDTH - 20),
      Phaser.Math.Clamp(nearest.y, 20, WORLD_HEIGHT - 20),
    );
    (this.player.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  private arcadeBody(bodyObject: HideBodyObject) {
    return (bodyObject as Phaser.GameObjects.GameObject & {
      body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
    }).body;
  }

  private addWall(
    x: number, y: number, width: number, height: number,
    alpha = 1,
  ) {
    const wall = this.add.rectangle(x, y, width, height, 0x29443e, alpha).setDepth(6);
    if (alpha > 0) wall.setStrokeStyle(2, 0x6e8b82, 0.9);
    this.physics.add.existing(wall, true);
    this.walls?.add(wall);
    return wall;
  }

  private createWalkAnimations() {
    for (const actor of ["player", "guard"] as const) {
      for (const direction of ["front", "back", "left", "right"] as const) {
        const key = `office-ref-${actor}-walk-${direction}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: [
            { key: `office-ref-${actor}Walk${this.capitalize(direction)}1` },
            { key: `office-ref-${actor}Walk${this.capitalize(direction)}2` },
          ],
          frameRate: actor === "player" ? 7 : 6,
          repeat: -1,
        });
      }
    }
  }

  private stopWalker(
    sprite: Phaser.Physics.Arcade.Sprite,
    actor: "player" | "guard",
    direction: WalkDirection,
  ) {
    sprite.stop();
    sprite.setTexture(`office-ref-${actor}Walk${this.capitalize(direction)}1`);
  }

  private syncShadow(
    sprite: Phaser.GameObjects.Sprite,
    shadow?: Phaser.GameObjects.Ellipse,
  ) {
    shadow?.setPosition(sprite.x, sprite.y + sprite.displayHeight * 0.41);
  }

  private capitalize(value: WalkDirection) {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}` as Capitalize<WalkDirection>;
  }

  private addPartition(
    x: number,
    y: number,
    width: number,
    height: number,
    targetKey?: string,
  ) {
    const horizontal = width >= height;
    const partition = this.add.image(x, y, "office-ref-partitionWall")
      .setDisplaySize(horizontal ? width : height, 22)
      .setDepth(7);
    if (!horizontal) partition.setAngle(90);
    const collider = this.addWall(x, y, width, height, 0);
    this.registerHideTarget([partition], [collider], targetKey);
    return { collider, partition };
  }

  private isSession1Sheet2() {
    return this.officeSheet.session === 1 && this.officeSheet.sheet === 2;
  }

  private isSession1Sheet3() {
    return this.officeSheet.session === 1 && this.officeSheet.sheet === 3;
  }

  private isSession1Sheet4() {
    return this.officeSheet.session === 1 && this.officeSheet.sheet === 4;
  }

  private isSession1Final() {
    return this.officeSheet.session === 1 && this.officeSheet.sheet === 5;
  }

  private isSession2Sheet1() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 1;
  }

  private isSession2Sheet2() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 2;
  }

  private isSession2Sheet3() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 3;
  }

  private isSession2Sheet4() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 4;
  }

  private isSession2Final() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 5;
  }

  private isSession3Sheet1() {
    return this.officeSheet.session === 3 && this.officeSheet.sheet === 1;
  }

  private isSession3Sheet2() {
    return this.officeSheet.session === 3 && this.officeSheet.sheet === 2;
  }

  private isSession3Sheet3() {
    return this.officeSheet.session === 3 && this.officeSheet.sheet === 3;
  }

  private isSession3Sheet4() {
    return this.officeSheet.session === 3 && this.officeSheet.sheet === 4;
  }

  private isSession3Final() {
    return this.officeSheet.session === 3 && this.officeSheet.sheet === 5;
  }

  private isSession4Sheet1() {
    return this.officeSheet.session === 4 && this.officeSheet.sheet === 1;
  }

  private isSession4Sheet2() {
    return this.officeSheet.session === 4 && this.officeSheet.sheet === 2;
  }

  private isSession4Sheet3() {
    return this.officeSheet.session === 4 && this.officeSheet.sheet === 3;
  }

  private isSession4Sheet4() {
    return this.officeSheet.session === 4 && this.officeSheet.sheet === 4;
  }

  private isSession4Final() {
    return this.officeSheet.session === 4 && this.officeSheet.sheet === 5;
  }

  private isSession5Sheet1() {
    return this.officeSheet.session === 5 && this.officeSheet.sheet === 1;
  }

  private isSession5Sheet2() {
    return this.officeSheet.session === 5 && this.officeSheet.sheet === 2;
  }

  private isSession5Sheet3() {
    return this.officeSheet.session === 5 && this.officeSheet.sheet === 3;
  }

  private isSession5Sheet4() {
    return this.officeSheet.session === 5 && this.officeSheet.sheet === 4;
  }

  private isSession5Final() {
    return this.officeSheet.session === 5 && this.officeSheet.sheet === 5;
  }

  private isSession6Sheet1() {
    return this.officeSheet.session === 6 && this.officeSheet.sheet === 1;
  }

  private isSession6Sheet2() {
    return this.officeSheet.session === 6 && this.officeSheet.sheet === 2;
  }

  private isSession6Sheet3() {
    return this.officeSheet.session === 6 && this.officeSheet.sheet === 3;
  }

  private isSession6Sheet4() {
    return this.officeSheet.session === 6 && this.officeSheet.sheet === 4;
  }

  private resizeCamera(width: number, height: number) {
    const zoom = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    this.cameras.main.setZoom(zoom).centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }

}
